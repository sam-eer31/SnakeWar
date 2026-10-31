/**
 * Cloudflare PartyServer Edge Network Client for SnakeWar
 * Provides sub-15ms edge routing on Cloudflare Durable Objects.
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

export const DEFAULT_PARTY_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999';

export function getPartyWsUrl(host: string, room: string): string {
  const cleanHost = host.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/+$/, '');
  const isSecure = host.startsWith('https://') || host.startsWith('wss://') || host.includes('workers.dev') || host.includes('partykit.dev');
  const protocol = isSecure ? 'wss://' : 'ws://';
  return `${protocol}${cleanHost}/parties/snake-room/${encodeURIComponent(room)}`;
}

/**
 * PartyHost: runs in the browser of the player who hosts the match.
 * Relays local GameEngine state through Cloudflare Edge to guests.
 */
export class PartyHost {
  public ws: WebSocket | null = null;
  public isConnected: boolean = false;
  public roomCode: string;
  public ping: number = 0;
  private pingInterval: any = null;
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
          // Claim host role in this Cloudflare edge room
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

            if (data.type === 'guest_joined') {
              this.initWebRTCHost(data.guestConnId);
              if (this.onGuestJoined) {
                this.onGuestJoined(data.guestConnId, data.name, data.skinId, !!data.isSpectator);
              }
              return;
            }

            if (data.type === 'guest_left') {
              const pc = this.peerConnections.get(data.guestConnId);
              if (pc) {
                pc.close();
                this.peerConnections.delete(data.guestConnId);
              }
              this.dataChannels.delete(data.guestConnId);
              if (this.onGuestLeft) {
                this.onGuestLeft(data.guestConnId);
              }
              return;
            }

            if (data.type === 'guest_input') {
              if (this.onGuestInput) {
                this.onGuestInput(data.guestConnId, data.angle, data.isBoosting);
              }
              return;
            }

            if (data.type === 'webrtc_signal' && data.fromConnId && data.signal) {
              const pc = this.peerConnections.get(data.fromConnId);
              if (pc) {
                if (data.signal.type === 'answer') {
                  pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp)).then(() => {
                    const queue = this.pendingHostCandidates.get(data.fromConnId);
                    if (queue) {
                      for (const c of queue) {
                        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                      }
                      this.pendingHostCandidates.delete(data.fromConnId);
                    }
                  }).catch(() => {});
                } else if (data.signal.type === 'candidate' && data.signal.candidate) {
                  if (pc.remoteDescription) {
                    pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate)).catch(() => {});
                  } else {
                    let queue = this.pendingHostCandidates.get(data.fromConnId);
                    if (!queue) {
                      queue = [];
                      this.pendingHostCandidates.set(data.fromConnId, queue);
                    }
                    queue.push(data.signal.candidate);
                  }
                }
              }
              return;
            }

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
            console.error('PartyHost message error:', err);
          }
        };

        ws.onerror = (err) => {
          console.warn('PartyHost WebSocket error:', err);
          reject(err);
        };

        ws.onclose = () => {
          this.isConnected = false;
          if (this.pingInterval) clearInterval(this.pingInterval);
          if (this.onDisconnect) this.onDisconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private initWebRTCHost(guestConnId: string) {
    if (typeof RTCPeerConnection === 'undefined') return;
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      this.peerConnections.set(guestConnId, pc);

      const dc = pc.createDataChannel('snake_p2p', { ordered: false, maxRetransmits: 0 });
      this.dataChannels.set(guestConnId, dc);

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
          this.ws.send(JSON.stringify({
            type: 'webrtc_signal',
            targetConnId: guestConnId,
            signal: { type: 'candidate', candidate: event.candidate },
          }));
        }
      };

      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'webrtc_signal',
            targetConnId: guestConnId,
            signal: { type: 'offer', sdp: offer },
          }));
        }
      }).catch(() => {});
    } catch {}
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

  broadcastTick(tickPacket: ServerTickPacket): void {
    const raw = JSON.stringify(tickPacket);
    // Send directly over WebRTC DataChannels (UDP) for minimum latency
    for (const dc of this.dataChannels.values()) {
      if (dc.readyState === 'open') {
        try {
          dc.send(raw);
        } catch {}
      }
    }
    // Guaranteed WebSocket fallback
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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

  disconnect(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    for (const pc of this.peerConnections.values()) {
      try { pc.close(); } catch {}
    }
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.pendingHostCandidates.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

/**
 * PartyGuest: connects guest players to a host's room via Cloudflare.
 */
export class PartyGuest {
  public ws: WebSocket | null = null;
  public isConnected: boolean = false;
  public mySnakeId: string | null = null;
  public ping: number = 0;
  private pingInterval: any = null;
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

            if (data.type === 'webrtc_signal' && data.fromConnId && data.signal) {
              this.handleWebRTCSignal(data.fromConnId, data.signal);
              return;
            }

            if (data.type === 'init') {
              this.mySnakeId = data.myId;
              if (this.onInit) this.onInit(data);
              return;
            }

            if (data.type === 'tick') {
              if (data.tick && data.tick <= this.lastReceivedTick) {
                return; // Ignore duplicate / slower WebSocket tick if UDP already processed
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
            console.error('PartyGuest message error:', err);
          }
        };

        ws.onerror = (err) => {
          console.warn('PartyGuest WebSocket error:', err);
          reject(err);
        };

        ws.onclose = () => {
          this.isConnected = false;
          if (this.pingInterval) clearInterval(this.pingInterval);
          if (this.onDisconnect) this.onDisconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private async handleWebRTCSignal(fromConnId: string, signal: any) {
    if (typeof RTCPeerConnection === 'undefined') return;
    this.hostConnId = fromConnId;

    try {
      if (signal.type === 'offer') {
        if (!this.pc) {
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          });
          this.pc = pc;

          pc.ondatachannel = (event) => {
            const dc = event.channel;
            this.dc = dc;

            dc.onopen = () => {
              dc.send(JSON.stringify({ type: 'p2p_ping', t: performance.now() }));
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
              this.ws.send(
                JSON.stringify({
                  type: 'webrtc_signal',
                  targetConnId: this.hostConnId,
                  signal: { type: 'candidate', candidate: event.candidate },
                })
              );
            }
          };
        }

        await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

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
      console.warn('WebRTC guest signal error:', err);
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

      // Direct WebRTC DataChannel (UDP) has 0ms server relay latency
      if (this.dc && this.dc.readyState === 'open') {
        try {
          this.dc.send(payload);
          return;
        } catch {}
      }

      // Fallback via WebSocket
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

  disconnect(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.dc) {
      try { this.dc.close(); } catch {}
      this.dc = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch {}
      this.pc = null;
    }
    this.pendingCandidates = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

