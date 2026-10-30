/**
 * Snake.io WebSocket Network Client
 * Handles real-time communication with dedicated public arena servers.
 */

export interface ServerSnakeData {
  id: string;
  name: string;
  skinId: string;
  tier?: 'easy' | 'medium' | 'hard' | 'player';
  isBot: boolean;
  x: number;
  y: number;
  angle: number;
  radius: number;
  mass: number;
  score: number;
  kills?: number;
  isBoosting: boolean;
  spawnProtection?: boolean;
  segs: [number, number][];
  aiState?: string | null;
  archetype?: string | null;
}

export interface ServerFoodData {
  id: number;
  x: number;
  y: number;
  v: number;
  t: 'regular' | 'boost_remnant' | 'super' | 'corpse';
  c?: string | null;
}

export interface ServerInitPacket {
  type: 'init';
  roomId: string;
  arenaRadius: number;
  myId: string | null;
  food: ServerFoodData[];
  snakes: ServerSnakeData[];
}

export interface ServerTickPacket {
  type: 'tick';
  tick: number;
  snakes: ServerSnakeData[];
  eaten: number[];
  newFood: ServerFoodData[];
  leaderboard: { id: string; name: string; score: number; isPlayer: boolean; tier?: any }[];
}

export interface ServerGameOverPacket {
  type: 'gameOver';
  stats: {
    score: number;
    kills: number;
    length: number;
    killerName: string;
  };
}

export class NetworkClient {
  public ws: WebSocket | null = null;
  public isConnected: boolean = false;
  public mySnakeId: string | null = null;
  public ping: number = 0;
  private pingInterval: any = null;

  public onInit: ((data: ServerInitPacket) => void) | null = null;
  public onTick: ((data: ServerTickPacket) => void) | null = null;
  public onGameOver: ((data: ServerGameOverPacket) => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onPing: ((pingMs: number) => void) | null = null;

  connect(
    serverUrl: string,
    roomId: string,
    name: string,
    skinId: string,
    isSpectator: boolean = false
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(serverUrl);
        this.ws = ws;

        ws.onopen = () => {
          this.isConnected = true;
          // Send join packet
          ws.send(
            JSON.stringify({
              type: 'join',
              roomId,
              name,
              skinId,
              isSpectator,
            })
          );

          // Start ping polling
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

            if (data.type === 'gameOver') {
              if (this.onGameOver) this.onGameOver(data);
              return;
            }
          } catch (e) {
            console.error('Error handling server message:', e);
          }
        };

        ws.onerror = (err) => {
          console.warn('WebSocket error:', err);
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

  sendInput(angle: number, isBoosting: boolean): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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

