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

  public onGuestJoined: ((guestConnId: string, name: string, skinId: string, isSpectator: boolean) => void) | null = null;
  public onGuestLeft: ((guestConnId: string) => void) | null = null;
  public onGuestInput: ((guestConnId: string, angle: number, isBoosting: boolean) => void) | null = null;
  public onDisconnect: (() => void) | null = null;

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
              return;
            }

            if (data.type === 'guest_joined') {
              if (this.onGuestJoined) {
                this.onGuestJoined(data.guestConnId, data.name, data.skinId, !!data.isSpectator);
              }
              return;
            }

            if (data.type === 'guest_left') {
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify(tickPacket)
      );
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
    isSpectator: boolean = false
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = getPartyWsUrl(host, roomCode);
        const ws = new WebSocket(wsUrl);
        this.ws = ws;

        ws.onopen = () => {
          this.isConnected = true;
          ws.send(
            JSON.stringify({
              type: 'guest_join',
              name: playerName,
              skinId,
              isSpectator,
            })
          );

          this.pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
            }
          }, 1500);

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

            if (data.type === 'init') {
              this.mySnakeId = data.myId;
              if (this.onInit) this.onInit(data);
              return;
            }

            if (data.type === 'tick') {
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

  private lastInputTime: number = 0;
  private lastSentAngle: number = -999;
  private lastSentBoosting: boolean = false;

  sendInput(angle: number, isBoosting: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
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
      this.ws.send(
        JSON.stringify({
          type: 'input',
          angle: Number(angle.toFixed(3)),
          isBoosting,
        })
      );
    }
  }

  disconnect(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

