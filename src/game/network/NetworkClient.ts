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
  roomCode?: string | null;
  arenaRadius: number;
  myId: string | null;
  food: ServerFoodData[];
  snakes: ServerSnakeData[];
}

export interface ServerPlayerJoinedPacket {
  type: 'player_joined';
  playerName: string;
  snakeId: string | null;
  isSpectator: boolean;
}

export interface ServerPlayerLeftPacket {
  type: 'player_left';
  playerName: string;
}

export interface ServerRoomCreatedPacket {
  type: 'room_created';
  roomId: string;
  roomCode: string;
  mode: 'public' | 'private';
}

export interface ServerErrorPacket {
  type: 'error';
  code: string;
  message: string;
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
  public onPlayerJoined: ((playerName: string, isSpectator: boolean) => void) | null = null;
  public onPlayerLeft: ((playerName: string) => void) | null = null;
  public onRoomCreated: ((roomId: string, roomCode: string) => void) | null = null;
  public onRoomClosed: ((message: string) => void) | null = null;
  public onError: ((message: string, code?: string) => void) | null = null;

  private setupConnection(
    serverUrl: string,
    onOpenPayload: object
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(serverUrl);
        this.ws = ws;

        ws.onopen = () => {
          this.isConnected = true;
          ws.send(JSON.stringify(onOpenPayload));

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

            if (data.type === 'player_joined') {
              if (this.onPlayerJoined) {
                this.onPlayerJoined(data.playerName, !!data.isSpectator);
              }
              return;
            }

            if (data.type === 'player_left') {
              if (this.onPlayerLeft) {
                this.onPlayerLeft(data.playerName);
              }
              return;
            }

            if (data.type === 'room_created') {
              if (this.onRoomCreated) {
                this.onRoomCreated(data.roomId, data.roomCode);
              }
              return;
            }

            if (data.type === 'room_closed') {
              if (this.onRoomClosed) {
                this.onRoomClosed(data.message || 'Room has closed.');
              }
              return;
            }

            if (data.type === 'error') {
              if (this.onError) {
                this.onError(data.message || 'Server error', data.code);
              }
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

  connect(
    serverUrl: string,
    roomId: string,
    name: string,
    skinId: string,
    isSpectator: boolean = false
  ): Promise<void> {
    return this.setupConnection(serverUrl, {
      type: 'join',
      roomId,
      name,
      skinId,
      isSpectator,
    });
  }

  joinByCode(
    serverUrl: string,
    roomCode: string,
    name: string,
    skinId: string,
    isSpectator: boolean = false
  ): Promise<void> {
    return this.setupConnection(serverUrl, {
      type: 'join',
      roomCode: roomCode.trim().toUpperCase(),
      name,
      skinId,
      isSpectator,
    });
  }

  createRoom(
    serverUrl: string,
    options: {
      name: string;
      mode: 'public' | 'private';
      roomCode?: string;
      hostName: string;
      skinId: string;
      isSpectator?: boolean;
      settings?: {
        difficulty?: 'easy' | 'medium' | 'hard';
        botCount?: number;
      };
    }
  ): Promise<void> {
    return this.setupConnection(serverUrl, {
      type: 'create_room',
      name: options.name,
      mode: options.mode,
      roomCode: options.roomCode,
      hostName: options.hostName,
      skinId: options.skinId,
      isSpectator: !!options.isSpectator,
      settings: options.settings,
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

