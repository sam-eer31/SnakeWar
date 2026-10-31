import { Server, routePartykitRequest, type Connection, type ConnectionContext, type WSMessage } from "partyserver";

export interface Env {
  SnakeRoom: {
    get: (id: any) => { fetch: (url: string, init?: any) => Promise<Response> };
    idFromName: (name: string) => any;
  };
}

export interface RoomMetadata {
  id: string;
  name: string;
  hostName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  snakesCount: number;
  playersCount: number;
  uptimeSeconds: number;
  updatedAt: number;
}

interface ServerSnake {
  id: string;
  name: string;
  skinId: string;
  tier?: string;
  isBot: boolean;
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  speed: number;
  mass: number;
  score: number;
  radius: number;
  targetLength: number;
  kills: number;
  isBoosting: boolean;
  isDead: boolean;
  spawnProtection: number;
  segments: { x: number; y: number }[];
  connId?: string;
  wanderTimer?: number;
}

interface ServerFood {
  id: number;
  x: number;
  y: number;
  v: number;
  t: string;
  c?: string;
}

const ARENA_RADIUS = 3200;
const TICK_RATE = 25; // 25 Hz = 40ms interval (Slither.io industry standard)
const BASE_SPEED = 2.9;
const BOOST_SPEED = 5.3;
const BASE_RADIUS = 14;
const BASE_MASS = 50;
const MAX_RADIUS = 52;

const BOT_NAMES = [
  'Viper', 'Shadow', 'Ghost', 'Striker', 'Titan', 'Nemesis', 'Zenith', 'Hydra',
  'Apex', 'Blaze', 'Frost', 'Storm', 'Phantom', 'Oracle', 'Raptor', 'Eclipse',
  'Cobra', 'Nova', 'Pulse', 'Scythe', 'Kage', 'Chronos', 'Ares', 'Cipher'
];

const SKINS = [
  'emerald-dragon', 'ruby-viper', 'cyber-neon', 'toxic-slimer',
  'golden-champion', 'cosmic-void', 'candy-stripe', 'inferno-dragon', 'arctic-frost'
];

function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

function updateSnakeDimensions(snake: ServerSnake): void {
  const massDelta = Math.max(0, snake.mass - BASE_MASS);
  snake.targetLength = Math.max(15, Math.floor(15 + Math.pow(massDelta, 0.58) * 1.05));
  snake.radius = Math.min(MAX_RADIUS, BASE_RADIUS + Math.pow(massDelta, 0.36) * 0.9);
  snake.score = Math.floor(snake.mass);
}

export class SnakeRoom extends Server<Env> {
  public env: Env;
  public ctx: any;

  // In-memory lobby registry (active on the 'lobby' room instance)
  private publicRooms = new Map<string, RoomMetadata>();

  // Authoritative Match State (when this.name !== 'lobby')
  private arenaRadius: number = ARENA_RADIUS;
  private snakes = new Map<string, ServerSnake>();
  private food = new Map<number, ServerFood>();
  private eatenFoodIds: number[] = [];
  private newFoodItems: ServerFood[] = [];
  private clients = new Map<string, { conn: Connection; name: string; skinId: string; isSpectator: boolean; snakeId: string | null }>();
  private tickInterval: any = null;
  private tickCount: number = 0;
  private nextFoodId: number = 1;
  private nextBotId: number = 1;
  private targetBotCount: number = 18;
  private difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  private roomMetadata: RoomMetadata | null = null;
  private isInitialized: boolean = false;
  private startTime: number = Date.now();
  private lastLobbyHeartbeat: number = 0;

  constructor(ctx: any, env: Env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }

  private async ensureLobbyRoomsLoaded() {
    if (this.name !== 'lobby') return;
    if (this.publicRooms.size === 0) {
      try {
        const stored = (await this.ctx.storage.get('public_rooms')) as [string, RoomMetadata][] | undefined;
        if (stored) {
          for (const [k, v] of stored) {
            this.publicRooms.set(k, v);
          }
        }
      } catch {}
    }
  }

  async onStart() {
    if (this.name === 'lobby') {
      await this.ensureLobbyRoomsLoaded();
    }
  }

  async onConnect(conn: Connection, _ctx: ConnectionContext) {
    if (this.name === 'lobby') {
      await this.ensureLobbyRoomsLoaded();
      this.cleanExpiredRooms();
      conn.send(JSON.stringify({
        type: 'community_rooms',
        rooms: Array.from(this.publicRooms.values()),
      }));
      return;
    }

    // In gameplay rooms, ensure the arena simulation is ready
    if (!this.isInitialized) {
      this.initArena();
    }

    conn.send(JSON.stringify({
      type: 'connected_to_room',
      roomId: this.name,
      hasHost: true,
    }));
  }

  private initArena(botCount: number = 18, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.difficulty = difficulty;
    this.targetBotCount = botCount;
    this.startTime = Date.now();

    if (this.name === 'emerald-glade') {
      this.arenaRadius = 3200;
      this.targetBotCount = 22;
      this.difficulty = 'medium';
    } else if (this.name === 'apex-colosseum') {
      this.arenaRadius = 3600;
      this.targetBotCount = 28;
      this.difficulty = 'hard';
    }

    // Pre-populate food pellets (500 regular, 25 super)
    for (let i = 0; i < 500; i++) {
      this.spawnFood('regular');
    }
    for (let i = 0; i < 25; i++) {
      this.spawnFood('super');
    }

    // Pre-populate autonomous bots
    for (let i = 0; i < this.targetBotCount; i++) {
      this.spawnBot();
    }

    this.ensureTickLoop();
  }

  private ensureTickLoop() {
    if (this.name === 'lobby') return;
    if (this.tickInterval) return;

    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000 / TICK_RATE);
  }

  private stopTickLoop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private spawnFood(type: string = 'regular', x?: number, y?: number, value?: number, color?: string): ServerFood {
    if (x === undefined || y === undefined) {
      const r = Math.sqrt(Math.random()) * (this.arenaRadius - 100);
      const theta = Math.random() * Math.PI * 2;
      x = Math.cos(theta) * r;
      y = Math.sin(theta) * r;
    }

    const id = this.nextFoodId++;
    const val = value !== undefined ? value : (type === 'super' ? 25 : (Math.random() < 0.7 ? 2 : 5));
    const foodItem: ServerFood = {
      id,
      x: Math.round(x),
      y: Math.round(y),
      v: val,
      t: type,
      c: color || (type === 'super' ? '#ffd700' : undefined),
    };

    this.food.set(id, foodItem);
    this.newFoodItems.push(foodItem);
    return foodItem;
  }

  private spawnBot(): ServerSnake {
    const id = `bot_${this.nextBotId++}`;
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const skinId = SKINS[Math.floor(Math.random() * SKINS.length)];

    const r = Math.sqrt(Math.random()) * (this.arenaRadius - 400);
    const theta = Math.random() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    const angle = Math.random() * Math.PI * 2;

    const tier = this.difficulty === 'hard'
      ? (Math.random() < 0.65 ? 'hard' : 'medium')
      : (Math.random() < 0.45 ? 'easy' : 'medium');

    const initialMass = BASE_MASS + (tier === 'hard' ? 80 + Math.random() * 150 : tier === 'medium' ? 30 + Math.random() * 70 : Math.random() * 30);

    const bot: ServerSnake = {
      id,
      name,
      skinId,
      tier,
      isBot: true,
      x: Math.round(x),
      y: Math.round(y),
      angle,
      targetAngle: angle,
      speed: BASE_SPEED,
      mass: initialMass,
      score: Math.floor(initialMass),
      radius: BASE_RADIUS,
      targetLength: 15,
      kills: 0,
      isBoosting: false,
      isDead: false,
      spawnProtection: 3.0,
      segments: [],
      wanderTimer: Math.random() * 0.5,
    };

    updateSnakeDimensions(bot);

    for (let i = 0; i < bot.targetLength; i++) {
      bot.segments.push({
        x: Math.round(x - Math.cos(angle) * i * 7),
        y: Math.round(y - Math.sin(angle) * i * 7),
      });
    }

    this.snakes.set(id, bot);
    return bot;
  }

  private spawnPlayerSnake(connId: string, name: string, skinId: string): ServerSnake {
    this.snakes.delete(connId);

    const r = Math.sqrt(Math.random()) * (this.arenaRadius * 0.45);
    const theta = Math.random() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    const angle = Math.random() * Math.PI * 2;

    const playerSnake: ServerSnake = {
      id: connId,
      name: name || 'Player',
      skinId: skinId || 'emerald-dragon',
      tier: 'player',
      isBot: false,
      x: Math.round(x),
      y: Math.round(y),
      angle,
      targetAngle: angle,
      speed: BASE_SPEED,
      mass: BASE_MASS,
      score: BASE_MASS,
      radius: BASE_RADIUS,
      targetLength: 15,
      kills: 0,
      isBoosting: false,
      isDead: false,
      spawnProtection: 3.5,
      segments: [],
      connId,
    };

    updateSnakeDimensions(playerSnake);

    for (let i = 0; i < playerSnake.targetLength; i++) {
      playerSnake.segments.push({
        x: Math.round(x - Math.cos(angle) * i * 7),
        y: Math.round(y - Math.sin(angle) * i * 7),
      });
    }

    this.snakes.set(connId, playerSnake);
    return playerSnake;
  }

  private killSnake(victim: ServerSnake, killer: ServerSnake | null) {
    if (victim.isDead) return;
    victim.isDead = true;

    if (killer && killer.id !== victim.id) {
      killer.kills = (killer.kills || 0) + 1;
    }

    // Drop corpse food along segments
    const pelletCount = Math.min(60, Math.max(10, Math.floor(victim.segments.length * 0.65)));
    const valPerPellet = Math.max(2, Math.floor((victim.mass * 0.55) / pelletCount));

    for (let i = 0; i < pelletCount; i++) {
      const idx = Math.floor((i / pelletCount) * (victim.segments.length - 1));
      const seg = victim.segments[idx] || { x: victim.x, y: victim.y };
      const offAngle = Math.random() * Math.PI * 2;
      const offDist = Math.random() * 20;
      this.spawnFood(
        'corpse',
        seg.x + Math.cos(offAngle) * offDist,
        seg.y + Math.sin(offAngle) * offDist,
        valPerPellet,
        '#f87171'
      );
    }

    // If victim was a connected human player, notify game over
    if (victim.connId) {
      const client = this.clients.get(victim.connId);
      if (client && client.conn) {
        try {
          client.conn.send(JSON.stringify({
            type: 'game_over',
            stats: {
              score: victim.score,
              kills: victim.kills || 0,
              length: victim.segments.length,
              killerName: killer ? killer.name : 'Arena Boundary'
            }
          }));
        } catch {}
      }
    }

    this.snakes.delete(victim.id);
  }

  private tick() {
    this.tickCount++;
    const dt = 1 / TICK_RATE;
    this.eatenFoodIds = [];
    this.newFoodItems = [];

    const livingSnakes = Array.from(this.snakes.values()).filter((s) => !s.isDead);

    // 1. Autonomous Bot AI
    for (const bot of livingSnakes) {
      if (!bot.isBot) continue;

      if (bot.spawnProtection > 0) {
        bot.spawnProtection -= dt;
      }

      bot.wanderTimer = (bot.wanderTimer || 0) + dt;

      // Boundary evasion
      const distFromCenter = Math.sqrt(bot.x * bot.x + bot.y * bot.y);
      if (distFromCenter > this.arenaRadius - 380) {
        bot.targetAngle = Math.atan2(-bot.y, -bot.x);
        bot.isBoosting = false;
        continue;
      }

      // Avoidance look-ahead
      let mustAvoid = false;
      const lookDist = 130;
      const lookX = bot.x + Math.cos(bot.angle) * lookDist;
      const lookY = bot.y + Math.sin(bot.angle) * lookDist;

      for (const other of livingSnakes) {
        if (other.id === bot.id) continue;
        if (distSq(lookX, lookY, other.x, other.y) < 110 * 110) {
          bot.targetAngle = bot.angle + 1.57;
          bot.isBoosting = bot.mass > 90;
          mustAvoid = true;
          break;
        }
        for (let i = 2; i < other.segments.length; i += 3) {
          const seg = other.segments[i];
          if (distSq(lookX, lookY, seg.x, seg.y) < 95 * 95) {
            bot.targetAngle = bot.angle + 1.8;
            bot.isBoosting = bot.mass > 90;
            mustAvoid = true;
            break;
          }
        }
        if (mustAvoid) break;
      }
      if (mustAvoid) continue;

      // Food targeting
      if (bot.wanderTimer > 0.4) {
        bot.wanderTimer = 0;
        let bestFood: ServerFood | null = null;
        let bestDistSq = 220 * 220;

        for (const f of this.food.values()) {
          const d2 = distSq(bot.x, bot.y, f.x, f.y);
          if (d2 < bestDistSq) {
            bestDistSq = d2;
            bestFood = f;
          }
        }

        if (bestFood) {
          bot.targetAngle = Math.atan2(bestFood.y - bot.y, bestFood.x - bot.x);
          bot.isBoosting = bestFood.t === 'corpse' || bestFood.t === 'super';
        } else {
          bot.targetAngle += (Math.random() - 0.5) * 0.6;
          bot.isBoosting = false;
        }
      }
    }

    // 2. Snake Movement & Distance-Constraint Physics
    for (const snake of livingSnakes) {
      if (snake.spawnProtection > 0 && !snake.isBot) {
        snake.spawnProtection -= dt;
      }

      let diff = snake.targetAngle - snake.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const turnRate = Math.max(0.04, 0.08 - (snake.radius / MAX_RADIUS) * 0.04);
      const maxTurn = turnRate * (dt * 60);
      if (Math.abs(diff) <= maxTurn) {
        snake.angle = snake.targetAngle;
      } else {
        snake.angle += Math.sign(diff) * maxTurn;
      }

      if (snake.isBoosting && snake.mass > BASE_MASS + 5) {
        snake.speed = BOOST_SPEED;
        snake.mass -= 0.24 * (dt * 60);
        updateSnakeDimensions(snake);

        if (this.tickCount % 8 === 0 && snake.segments.length > 0) {
          const tail = snake.segments[snake.segments.length - 1];
          this.spawnFood('boost_remnant', tail.x, tail.y, 1, '#38bdf8');
        }
      } else {
        snake.speed = BASE_SPEED;
      }

      snake.x += Math.cos(snake.angle) * snake.speed * (dt * 60);
      snake.y += Math.sin(snake.angle) * snake.speed * (dt * 60);

      // Arena boundary collision
      if (snake.x * snake.x + snake.y * snake.y >= this.arenaRadius * this.arenaRadius) {
        this.killSnake(snake, null);
        continue;
      }

      // Distance-constraint segment solver
      if (snake.segments.length === 0) {
        snake.segments.push({ x: snake.x, y: snake.y });
      }

      let prevX = snake.x;
      let prevY = snake.y;
      const segDist = Math.max(5, Math.min(10, 7 * Math.pow(snake.radius / 14, 0.35)));

      for (let i = 0; i < snake.segments.length; i++) {
        const seg = snake.segments[i];
        const dx = prevX - seg.x;
        const dy = prevY - seg.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > segDist) {
          seg.x = prevX - (dx / d) * segDist;
          seg.y = prevY - (dy / d) * segDist;
        }
        prevX = seg.x;
        prevY = seg.y;
      }

      while (snake.segments.length < snake.targetLength) {
        const last = snake.segments[snake.segments.length - 1];
        snake.segments.push({ x: last.x, y: last.y });
      }
      while (snake.segments.length > snake.targetLength && snake.segments.length > 15) {
        snake.segments.pop();
      }
    }

    // 3. Lethal Collisions (Head vs Enemy Body)
    for (const snake of livingSnakes) {
      if (snake.isDead || snake.spawnProtection > 0) continue;
      const headR = snake.radius * 0.85;

      for (const other of livingSnakes) {
        if (other.isDead || other.spawnProtection > 0 || other.id === snake.id) continue;

        for (let i = 2; i < other.segments.length; i++) {
          const seg = other.segments[i];
          const hitDist = headR + other.radius * 0.88;
          if (distSq(snake.x, snake.y, seg.x, seg.y) < hitDist * hitDist) {
            this.killSnake(snake, other);
            break;
          }
        }
        if (snake.isDead) break;
      }
    }

    // 4. Food Ingestion
    for (const snake of livingSnakes) {
      if (snake.isDead) continue;
      const eatDistSq = (snake.radius * 1.35 + 8) ** 2;

      for (const [id, f] of this.food.entries()) {
        if (distSq(snake.x, snake.y, f.x, f.y) <= eatDistSq) {
          snake.mass += f.v;
          updateSnakeDimensions(snake);
          this.food.delete(id);
          this.eatenFoodIds.push(id);
        }
      }
    }

    // 5. Replenish Food & Maintain Bot Population
    if (this.food.size < 550) {
      const needed = Math.min(12, 550 - this.food.size);
      for (let i = 0; i < needed; i++) {
        this.spawnFood('regular');
      }
    }

    const livingBots = Array.from(this.snakes.values()).filter((s) => s.isBot && !s.isDead).length;
    if (livingBots < this.targetBotCount) {
      this.spawnBot();
    }

    // 6. Broadcast World Snapshot at 25 Hz
    if (this.clients.size > 0) {
      const snakesData = Array.from(this.snakes.values())
        .filter((s) => !s.isDead)
        .map((s) => ({
          id: s.id,
          name: s.name,
          skinId: s.skinId,
          tier: s.tier,
          isBot: s.isBot,
          x: Math.round(s.x),
          y: Math.round(s.y),
          angle: Number(s.angle.toFixed(2)),
          radius: Math.round(s.radius),
          mass: Math.round(s.mass),
          score: Math.round(s.score),
          kills: s.kills || 0,
          isBoosting: s.isBoosting,
          spawnProtection: s.spawnProtection > 0,
          segs: s.segments.map((p) => [Math.round(p.x), Math.round(p.y)]),
        }));

      const leaderboard = Array.from(this.snakes.values())
        .filter((s) => !s.isDead)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((s) => ({
          id: s.id,
          name: s.name,
          score: s.score,
          isPlayer: !s.isBot,
          tier: s.tier,
        }));

      const tickPacket = JSON.stringify({
        type: 'tick',
        tick: this.tickCount,
        snakes: snakesData,
        eaten: this.eatenFoodIds,
        newFood: this.newFoodItems,
        leaderboard,
      });

      this.broadcast(tickPacket);
    }

    // 7. Periodic Lobby Heartbeat
    const now = Date.now();
    if (this.roomMetadata && now - this.lastLobbyHeartbeat > 25000) {
      this.lastLobbyHeartbeat = now;
      this.roomMetadata.uptimeSeconds = Math.floor((now - this.startTime) / 1000);
      this.roomMetadata.snakesCount = this.snakes.size;
      this.roomMetadata.playersCount = this.clients.size;
      this.roomMetadata.updatedAt = now;
      this.notifyLobby('register', this.roomMetadata).catch(() => {});
    }
  }

  async onMessage(conn: Connection, message: WSMessage) {
    try {
      const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const data = JSON.parse(raw);

      // --- LOBBY OPERATIONS ---
      if (this.name === 'lobby') {
        if (data.type === 'register_public_room' && data.room) {
          this.publicRooms.set(data.room.id, {
            ...data.room,
            updatedAt: Date.now(),
          });
          this.broadcastLobbyUpdate();
        } else if (data.type === 'unregister_public_room' && data.roomId) {
          this.publicRooms.delete(data.roomId);
          this.broadcastLobbyUpdate();
        } else if (data.type === 'get_rooms') {
          await this.ensureLobbyRoomsLoaded();
          this.cleanExpiredRooms();
          conn.send(JSON.stringify({
            type: 'community_rooms',
            rooms: Array.from(this.publicRooms.values()),
          }));
        }
        return;
      }

      // --- AUTHORITATIVE MATCH OPERATIONS ---

      // 1. Player Joins / Claims Room
      if (data.type === 'guest_join' || data.type === 'claim_host') {
        const isHost = data.type === 'claim_host';
        const name = data.name || (isHost && data.metadata ? data.metadata.hostName : 'Player');
        const skinId = data.skinId || 'emerald-dragon';
        const isSpectator = !!data.isSpectator;

        if (isHost && data.metadata) {
          this.initArena(data.metadata.snakesCount || 20, data.metadata.difficulty || 'medium');
          this.roomMetadata = {
            id: this.name,
            name: data.metadata.name || this.name,
            hostName: data.metadata.hostName || name,
            difficulty: data.metadata.difficulty || 'medium',
            snakesCount: this.snakes.size,
            playersCount: this.clients.size + 1,
            uptimeSeconds: 0,
            updatedAt: Date.now(),
          };
          if (data.isPublic) {
            await this.notifyLobby('register', this.roomMetadata);
          }
        } else {
          this.initArena();
        }

        let snake: ServerSnake | null = null;
        if (!isSpectator) {
          snake = this.spawnPlayerSnake(conn.id, name, skinId);
        }

        this.clients.set(conn.id, {
          conn,
          name,
          skinId,
          isSpectator,
          snakeId: snake ? snake.id : null,
        });

        // Send Authoritative Init Packet
        const snakesData = Array.from(this.snakes.values())
          .filter((s) => !s.isDead)
          .map((s) => ({
            id: s.id,
            name: s.name,
            skinId: s.skinId,
            tier: s.tier,
            isBot: s.isBot,
            x: Math.round(s.x),
            y: Math.round(s.y),
            angle: Number(s.angle.toFixed(2)),
            radius: Math.round(s.radius),
            mass: Math.round(s.mass),
            score: Math.round(s.score),
            kills: s.kills || 0,
            isBoosting: s.isBoosting,
            spawnProtection: s.spawnProtection > 0,
            segs: s.segments.map((p) => [Math.round(p.x), Math.round(p.y)]),
          }));

        conn.send(JSON.stringify({
          type: 'init',
          roomId: this.name,
          arenaRadius: this.arenaRadius,
          myId: isSpectator ? null : conn.id,
          food: Array.from(this.food.values()),
          snakes: snakesData,
        }));

        this.broadcast(JSON.stringify({
          type: 'player_joined',
          playerName: name,
        }), [conn.id]);

        this.ensureTickLoop();
        return;
      }

      // 2. Real-time Player Input
      if (data.type === 'input') {
        const snake = this.snakes.get(conn.id);
        if (snake && !snake.isDead) {
          if (typeof data.angle === 'number') {
            snake.targetAngle = data.angle;
          }
          snake.isBoosting = !!data.isBoosting;
        }
        return;
      }

      // 3. Ultra-low Latency Ping (Client -> Edge -> Client: 20-40ms)
      if (data.type === 'ping') {
        conn.send(JSON.stringify({ type: 'pong', t: data.t }));
        return;
      }

      // 4. Instant Respawn
      if (data.type === 'respawn') {
        const client = this.clients.get(conn.id);
        const name = data.name || (client ? client.name : 'Player');
        const skinId = data.skinId || (client ? client.skinId : 'emerald-dragon');
        const snake = this.spawnPlayerSnake(conn.id, name, skinId);
        if (client) {
          client.snakeId = snake.id;
          client.isSpectator = false;
        }

        const snakesData = Array.from(this.snakes.values())
          .filter((s) => !s.isDead)
          .map((s) => ({
            id: s.id,
            name: s.name,
            skinId: s.skinId,
            tier: s.tier,
            isBot: s.isBot,
            x: Math.round(s.x),
            y: Math.round(s.y),
            angle: Number(s.angle.toFixed(2)),
            radius: Math.round(s.radius),
            mass: Math.round(s.mass),
            score: Math.round(s.score),
            kills: s.kills || 0,
            isBoosting: s.isBoosting,
            spawnProtection: s.spawnProtection > 0,
            segs: s.segments.map((p) => [Math.round(p.x), Math.round(p.y)]),
          }));

        conn.send(JSON.stringify({
          type: 'init',
          roomId: this.name,
          arenaRadius: this.arenaRadius,
          myId: conn.id,
          food: Array.from(this.food.values()),
          snakes: snakesData,
        }));
        return;
      }
    } catch (err) {
      console.error('SnakeRoom message error:', err);
    }
  }

  async onClose(conn: Connection, _code: number, _reason: string, _wasClean: boolean) {
    if (this.name === 'lobby') return;

    const client = this.clients.get(conn.id);
    if (client) {
      this.clients.delete(conn.id);
      const snake = this.snakes.get(conn.id);
      if (snake) {
        this.killSnake(snake, null);
      }
      this.broadcast(JSON.stringify({
        type: 'player_left',
        playerName: client.name,
      }));
    }

    if (this.clients.size === 0) {
      // Pause tick loop after 45 seconds of empty room to conserve edge resources
      setTimeout(() => {
        if (this.clients.size === 0) {
          this.stopTickLoop();
          if (this.roomMetadata) {
            this.notifyLobby('unregister', { roomId: this.name }).catch(() => {});
          }
        }
      }, 45000);
    }
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (this.name === 'lobby') {
      if (url.pathname.endsWith('/api/register') && request.method === 'POST') {
        const meta = await request.json() as RoomMetadata;
        this.publicRooms.set(meta.id, { ...meta, updatedAt: Date.now() });
        this.broadcastLobbyUpdate();
        try {
          await this.ctx.storage.put('public_rooms', Array.from(this.publicRooms.entries()));
        } catch {}
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.endsWith('/api/unregister') && request.method === 'POST') {
        const { roomId } = await request.json() as { roomId: string };
        this.publicRooms.delete(roomId);
        this.broadcastLobbyUpdate();
        try {
          await this.ctx.storage.put('public_rooms', Array.from(this.publicRooms.entries()));
        } catch {}
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.endsWith('/api/rooms') || request.method === 'GET') {
        await this.ensureLobbyRoomsLoaded();
        this.cleanExpiredRooms();
        return new Response(JSON.stringify(Array.from(this.publicRooms.values())), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    return new Response('Not found', { status: 404 });
  }

  private broadcastLobbyUpdate() {
    this.cleanExpiredRooms();
    const packet = JSON.stringify({
      type: 'community_rooms',
      rooms: Array.from(this.publicRooms.values()),
    });
    this.broadcast(packet);
  }

  private cleanExpiredRooms() {
    const now = Date.now();
    for (const [id, room] of this.publicRooms.entries()) {
      if (now - room.updatedAt > 300000) {
        this.publicRooms.delete(id);
      }
    }
  }

  private async notifyLobby(action: 'register' | 'unregister', payload: any) {
    try {
      if (!this.env?.SnakeRoom) return;
      const lobbyStub = this.env.SnakeRoom.get(this.env.SnakeRoom.idFromName('lobby'));
      await lobbyStub.fetch(`https://lobby/api/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`Failed to notify lobby (${action}):`, err);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Support /party/:room as alias for /parties/snake-room/:room
    if (url.pathname.startsWith('/party/')) {
      const room = url.pathname.slice('/party/'.length);
      url.pathname = `/parties/snake-room/${room}`;
      return (
        (await routePartykitRequest(new Request(url.toString(), request), env, { cors: true })) ||
        new Response('Not found', { status: 404 })
      );
    }

    return (
      (await routePartykitRequest(request, env, { cors: true })) ||
      new Response('Not found', { status: 404 })
    );
  },
};
