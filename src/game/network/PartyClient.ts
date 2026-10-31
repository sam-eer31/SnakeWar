/**
 * High-Speed WebRTC P2P & Cloudflare Edge Network Client for SnakeWar
 * Provides direct UDP peer-to-peer data channels for cross-network players,
 * with seamless Cloudflare WebSocket signaling and automatic fallback.
 */

import { ServerInitPacket, ServerTickPacket } from './NetworkClient';

export interface PartyRoomInfo {
  id: string;
  name: string;
  hostName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  snakesCount: number;
  playersCount: number;
  uptimeSeconds: number;
}

export function getActivePartyHost(): string {
  const envHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST || '';
  if (envHost && !envHost.includes('onrender.com') && !envHost.includes('localhost:3001')) {
    return envHost;
  }
  return 'snakewar.sameershahidsiddiqui365.workers.dev';
}

export const DEFAULT_PARTY_HOST = getActivePartyHost();

export function getPartyWsUrl(host: string, room: string): string {
  let activeHost = host;
  if (!activeHost || activeHost.includes('onrender.com') || activeHost.includes('localhost:3001')) {
    activeHost = 'snakewar.sameershahidsiddiqui365.workers.dev';
  }
  const cleanHost = activeHost.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/+$/, '');
  const isBrowserHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isSecure = isBrowserHttps || activeHost.startsWith('https://') || activeHost.startsWith('wss://') || activeHost.includes('workers.dev') || activeHost.includes('partykit.dev');
  const protocol = isSecure ? 'wss://' : 'ws://';
  return `${protocol}${cleanHost}/parties/snake-room/${encodeURIComponent(room)}`;
}

// Google's public global STUN servers for rapid NAT traversal on different networks
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

/**
 * PartyHost: runs in the browser of the player hosting the arena.
 * Negotiates direct WebRTC DataChannels with each connected guest,
 * broadcasting simulation ticks directly over UDP with 0ms relay latency.
 */
export class PartyHost {
  public ws: WebSocket | null = null;
  public isConnected: boolean = false;
  public roomCode: string;
  public ping: number = 0;
  private pingInterval: any = null;

  // WebRTC P2P peer tracking per guest
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private pendingHostCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  public onGuestJoined: ((guestConnId: string, name: string, skinId: string, isSpectator: boolean) => void) | null = null;
  public onGuestLeft: ((guestConnId: string) => void) | null = null;
  public onGuestInput: ((guestConnId: string, angle: number, isBoosting: boolean) => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onPing: ((pingMs: number) => void) | null = null;

  constructor(roomCode: string) {
    this.roomCode = roomCode;
  }

  connect(
    host: string,
    isPublic: boolean,
    roomName: string,
    hostName: string,
    difficulty: 'easy' | 'medium' | 'hard',
    snakesCount: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = getPartyWsUrl(host, this.roomCode);
        const ws = new WebSocket(wsUrl);
        this.ws = ws;

        ws.onopen = () => {
          this.isConnected = true;
          // Claim host authority in room
          ws.send(
            JSON.stringify({
              type: 'claim_host',
              isPublic,
              metadata: {
                id: this.roomCode,
                name: roomName,
                hostName,
                difficulty,
                snakesCount,
                playersCount: 1,
                uptimeSeconds: 0,
              },
            })
          );

          this.pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
            }
          }, 2000);

          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'pong') {
              this.ping = Date.now() - data.t;
              if (this.onPing) this.onPing(this.ping);
              return;
            }

            // Guest joined -> initiate direct WebRTC P2P DataChannel offer
            if (data.type === 'guest_joined') {
              this.initWebRTCHost(data.guestConnId);
              if (this.onGuestJoined) {
                this.onGuestJoined(data.guestConnId, data.name, data.skinId, !!data.isSpectator);
              }
              return;
            }

            // Guest left -> clean up P2P connection
            if (data.type === 'guest_left') {
              this.cleanupPeer(data.guestConnId);
              if (this.onGuestLeft) {
                this.onGuestLeft(data.guestConnId);
              }
              return;
            }

            // Guest input via WebSocket fallback
            if (data.type === 'guest_input') {
              if (this.onGuestInput) {
                this.onGuestInput(data.guestConnId, data.angle, data.isBoosting);
              }
              return;
            }

            // WebRTC Signaling from Guest (Answer or ICE Candidate)
            if (data.type === 'webrtc_signal' && data.fromConnId && data.signal) {
              this.handleGuestSignal(data.fromConnId, data.signal);
              return;
            }

            // Direct Peer Latency Ping via WebSocket fallback
            if (data.type === 'peer_ping') {
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(
                  JSON.stringify({
                    type: 'peer_pong',
                    guestConnId: data.guestConnId,
                    t: data.t,
                  })
                );
              }
              return;
            }
          } catch (err) {
            console.error('[PartyHost] Message parse error:', err);
          }
        };

        ws.onerror = (err) => {
          console.warn('[PartyHost] WebSocket error:', err);
          reject(err);
        };

        ws.onclose = () => {
          this.isConnected = false;
          if (this.pingInterval) clearInterval(this.pingInterval);
          this.cleanupAllPeers();
          if (this.onDisconnect) this.onDisconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Initializes WebRTC peer connection and creates an unordered, 0-retransmit DataChannel
   */
  private initWebRTCHost(guestConnId: string) {
    if (typeof RTCPeerConnection === 'undefined') return;
    try {
      console.log('[WebRTC P2P Host] Creating offer for guest:', guestConnId);
      const pc = new RTCPeerConnection({
        iceServers: DEFAULT_ICE_SERVERS,
        iceCandidatePoolSize: 2,
      });
      this.peerConnections.set(guestConnId, pc);

      // Low-latency gaming DataChannel: unordered, maxRetransmits: 0 (UDP behavior)
      const dc = pc.createDataChannel('snake_p2p', {
        ordered: false,
        maxRetransmits: 0,
      });
      this.dataChannels.set(guestConnId, dc);

      dc.onopen = () => {
        console.log(`%c[WebRTC P2P] Direct DataChannel OPEN with guest (${guestConnId})!`, 'color: #10b981; font-weight: bold;');
      };

      dc.onclose = () => {
        console.log(`[WebRTC P2P] DataChannel closed with guest: ${guestConnId}`);
        this.dataChannels.delete(guestConnId);
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'input' && this.onGuestInput) {
            this.onGuestInput(guestConnId, msg.angle, msg.isBoosting);
          } else if (msg.type === 'p2p_ping') {
            if (dc.readyState === 'open') {
              dc.send(JSON.stringify({ type: 'p2p_pong', t: msg.t }));
            }
          }
        } catch {}
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && this.ws && this.ws.readyState === WebSocket.OPEN) {
          const candJson = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate;
          this.ws.send(
            JSON.stringify({
              type: 'webrtc_signal',
              targetConnId: guestConnId,
              signal: { type: 'candidate', candidate: candJson },
            })
          );
        }
      };

      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'webrtc_signal',
              targetConnId: guestConnId,
              signal: { type: 'offer', sdp: offer },
            })
          );
        }
      }).catch((err) => {
        console.warn('[WebRTC P2P Host] Offer creation failed:', err);
      });
    } catch (err) {
      console.warn('[WebRTC P2P Host] Init error:', err);
    }
  }

  private handleGuestSignal(guestConnId: string, signal: any) {
    const pc = this.peerConnections.get(guestConnId);
    if (!pc) return;

    if (signal.type === 'answer') {
      const sdpInit = signal.sdp?.sdp ? signal.sdp : signal;
      pc.setRemoteDescription(new RTCSessionDescription(sdpInit)).then(() => {
        const queue = this.pendingHostCandidates.get(guestConnId);
        if (queue) {
          for (const cand of queue) {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          this.pendingHostCandidates.delete(guestConnId);
        }
      }).catch((err) => {
        console.warn('[WebRTC P2P Host] Set remote description failed:', err);
      });
    } else if (signal.type === 'candidate' && signal.candidate) {
      if (pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
      } else {
        let queue = this.pendingHostCandidates.get(guestConnId);
        if (!queue) {
          queue = [];
          this.pendingHostCandidates.set(guestConnId, queue);
        }
        queue.push(signal.candidate);
      }
    }
  }

  sendInitToGuest(guestConnId: string, initPacket: ServerInitPacket): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'init_response',
          targetConnId: guestConnId,
          packet: initPacket,
        })
      );
    }
  }

  /**
   * Broadcasts world state tick to all guests.
   * Priority: Direct WebRTC DataChannel (UDP). Fallback: WebSocket relay.
   */
  broadcastTick(tickPacket: ServerTickPacket): void {
    const raw = JSON.stringify(tickPacket);
    let openP2PCount = 0;

    for (const dc of this.dataChannels.values()) {
      if (dc.readyState === 'open') {
        try {
          dc.send(raw);
          openP2PCount++;
        } catch {}
      }
    }

    // If P2P channel is not yet established for guests, broadcast via WebSocket
    if (openP2PCount === 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    }
  }

  sendGameOverToGuest(guestConnId: string, stats: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'game_over_response',
          targetConnId: guestConnId,
          packet: {
            type: 'game_over',
            stats,
          },
        })
      );
    }
  }

  broadcastNotification(type: 'player_joined' | 'player_left', playerName: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          playerName,
        })
      );
    }
  }

  private cleanupPeer(guestConnId: string) {
    const pc = this.peerConnections.get(guestConnId);
    if (pc) {
      try { pc.close(); } catch {}
      this.peerConnections.delete(guestConnId);
    }
    const dc = this.dataChannels.get(guestConnId);
    if (dc) {
      try { dc.close(); } catch {}
      this.dataChannels.delete(guestConnId);
    }
    this.pendingHostCandidates.delete(guestConnId);
  }

  private cleanupAllPeers() {
    for (const pc of this.peerConnections.values()) {
      try { pc.close(); } catch {}
    }
    this.peerConnections.clear();
    for (const dc of this.dataChannels.values()) {
      try { dc.close(); } catch {}
    }
    this.dataChannels.clear();
    this.pendingHostCandidates.clear();
  }

  disconnect(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.cleanupAllPeers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

/**
 * PartyGuest: connects guest players to a host's room.
 * Negotiates WebRTC DataChannel with host; prioritizes direct P2P for 0ms input.
 */
export class PartyGuest {
  public ws: WebSocket | null = null;
  public isConnected: boolean = false;
  public mySnakeId: string | null = null;
  public ping: number = 0;
  private pingInterval: any = null;

  // WebRTC P2P connection to host
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private hostConnId: string | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private lastReceivedTick: number = 0;

  public onInit: ((data: ServerInitPacket) => void) | null = null;
  public onTick: ((data: ServerTickPacket) => void) | null = null;
  public onGameOver: ((data: any) => void) | null = null;
  public onPlayerJoined: ((playerName: string) => void) | null = null;
  public onPlayerLeft: ((playerName: string) => void) | null = null;
  public onRoomClosed: ((message: string) => void) | null = null;
  public onError: ((message: string) => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onPing: ((pingMs: number) => void) | null = null;

  connect(
    host: string,
    roomCode: string,
    playerName: string,
    skinId: string,
    isSpectator: boolean = false,
    roomConfig?: {
      id: string;
      name: string;
      isPublic: boolean;
      hostName: string;
      difficulty: 'easy' | 'medium' | 'hard';
      snakesCount: number;
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = getPartyWsUrl(host, roomCode);
        const ws = new WebSocket(wsUrl);
        this.ws = ws;

        ws.onopen = () => {
          this.isConnected = true;
          if (roomConfig) {
            ws.send(
              JSON.stringify({
                type: 'claim_host',
                isPublic: roomConfig.isPublic,
                metadata: {
                  id: roomConfig.id,
                  name: roomConfig.name,
                  hostName: roomConfig.hostName,
                  difficulty: roomConfig.difficulty,
                  snakesCount: roomConfig.snakesCount,
                },
                name: playerName,
                skinId,
                isSpectator,
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: 'guest_join',
                name: playerName,
                skinId,
                isSpectator,
              })
            );
          }

          // Ping loop: prioritize P2P DataChannel ping; fallback to WebSocket
          this.pingInterval = setInterval(() => {
            if (this.dc && this.dc.readyState === 'open') {
              try {
                this.dc.send(JSON.stringify({ type: 'p2p_ping', t: performance.now() }));
                return;
              } catch {}
            }
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
            }
          }, 1000);

          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'pong') {
              this.ping = Date.now() - data.t;
              if (this.onPing) this.onPing(this.ping);
              return;
            }

            // WebRTC Signaling from Host
            if (data.type === 'webrtc_signal' && data.fromConnId && data.signal) {
              this.handleHostSignal(data.fromConnId, data.signal);
              return;
            }

            if (data.type === 'init') {
              this.mySnakeId = data.myId;
              if (this.onInit) this.onInit(data);
              return;
            }

            if (data.type === 'tick') {
              if (data.tick && data.tick <= this.lastReceivedTick) {
                return;
              }
              this.lastReceivedTick = data.tick;
              if (this.onTick) this.onTick(data);
              return;
            }

            if (data.type === 'game_over') {
              if (this.onGameOver) this.onGameOver(data);
              return;
            }

            if (data.type === 'player_joined') {
              if (this.onPlayerJoined) this.onPlayerJoined(data.playerName);
              return;
            }

            if (data.type === 'player_left') {
              if (this.onPlayerLeft) this.onPlayerLeft(data.playerName);
              return;
            }

            if (data.type === 'room_closed') {
              if (this.onRoomClosed) this.onRoomClosed(data.message || 'Room closed.');
              return;
            }

            if (data.type === 'error') {
              if (this.onError) this.onError(data.message || 'Connection error');
              return;
            }
          } catch (err) {
            console.error('[PartyGuest] Message parse error:', err);
          }
        };

        ws.onerror = (err) => {
          console.warn('[PartyGuest] WebSocket error:', err);
          reject(err);
        };

        ws.onclose = () => {
          this.isConnected = false;
          if (this.pingInterval) clearInterval(this.pingInterval);
          this.cleanupPeer();
          if (this.onDisconnect) this.onDisconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private async handleHostSignal(fromConnId: string, signal: any) {
    if (typeof RTCPeerConnection === 'undefined') return;
    this.hostConnId = fromConnId;

    try {
      if (signal.type === 'offer') {
        console.log('[WebRTC P2P Guest] Received offer from host:', fromConnId);
        if (!this.pc) {
          const pc = new RTCPeerConnection({
            iceServers: DEFAULT_ICE_SERVERS,
            iceCandidatePoolSize: 2,
          });
          this.pc = pc;

          pc.ondatachannel = (event) => {
            const dc = event.channel;
            this.dc = dc;

            dc.onopen = () => {
              console.log('%c[WebRTC P2P] Direct DataChannel OPEN with host!', 'color: #10b981; font-weight: bold;');
              dc.send(JSON.stringify({ type: 'p2p_ping', t: performance.now() }));
            };

            dc.onclose = () => {
              console.log('[WebRTC P2P] Direct DataChannel closed with host');
              this.dc = null;
            };

            dc.onmessage = (e) => {
              try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'p2p_pong') {
                  this.ping = Math.max(1, Math.round(performance.now() - msg.t));
                  if (this.onPing) this.onPing(this.ping);
                  return;
                }
                if (msg.type === 'tick') {
                  if (msg.tick && msg.tick <= this.lastReceivedTick) {
                    return;
                  }
                  this.lastReceivedTick = msg.tick;
                  if (this.onTick) this.onTick(msg);
                  return;
                }
              } catch {}
            };
          };

          pc.onicecandidate = (event) => {
            if (event.candidate && this.ws && this.ws.readyState === WebSocket.OPEN) {
              const candJson = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate;
              this.ws.send(
                JSON.stringify({
                  type: 'webrtc_signal',
                  targetConnId: this.hostConnId,
                  signal: { type: 'candidate', candidate: candJson },
                })
              );
            }
          };
        }

        const remoteOffer = signal.sdp?.sdp ? signal.sdp : signal;
        await this.pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));

        for (const cand of this.pendingCandidates) {
          await this.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        this.pendingCandidates = [];

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'webrtc_signal',
              targetConnId: this.hostConnId,
              signal: { type: 'answer', sdp: answer },
            })
          );
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        if (this.pc && this.pc.remoteDescription) {
          this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
        } else {
          this.pendingCandidates.push(signal.candidate);
        }
      }
    } catch (err) {
      console.warn('[WebRTC P2P Guest] Signal error:', err);
    }
  }

  private lastInputTime: number = 0;
  private lastSentAngle: number = -999;
  private lastSentBoosting: boolean = false;

  sendInput(angle: number, isBoosting: boolean): void {
    if (!this.isConnected) return;
    const now = performance.now();
    const angleDiff = Math.abs(angle - this.lastSentAngle);

    // Send immediately on boost change, angle turn > 0.03 rad (~1.7 deg), or every 35ms
    if (
      isBoosting !== this.lastSentBoosting ||
      angleDiff > 0.03 ||
      now - this.lastInputTime >= 35
    ) {
      this.lastInputTime = now;
      this.lastSentAngle = angle;
      this.lastSentBoosting = isBoosting;

      const payload = JSON.stringify({
        type: 'input',
        angle: Number(angle.toFixed(3)),
        isBoosting,
      });

      // Priority: Direct WebRTC DataChannel (0ms relay latency)
      if (this.dc && this.dc.readyState === 'open') {
        try {
          this.dc.send(payload);
          return;
        } catch {}
      }

      // Fallback: WebSocket relay
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(payload);
      }
    }
  }

  respawn(playerName: string, skinId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'respawn',
          name: playerName,
          skinId,
        })
      );
    }
  }

  private cleanupPeer() {
    if (this.dc) {
      try { this.dc.close(); } catch {}
      this.dc = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch {}
      this.pc = null;
    }
    this.pendingCandidates = [];
  }

  disconnect(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.cleanupPeer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
