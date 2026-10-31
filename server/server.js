/**
 * SnakeWar Dedicated Multiplayer Game Server
 * Supports 24/7 Persistent Public Arenas with living bots,
 * real-time WebSocket multiplayer, and Render-ready healthcheck.
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
require('tsx/cjs');
const { BotBrain } = require('../src/game/ai/BotBrain.ts');
const { Vector2D } = require('../src/game/core/Vector2D.ts');
const { SpatialHashGrid } = require('../src/game/core/SpatialHashGrid.ts');

const PORT = process.env.PORT || 3001;

// =============================================================================
// GAME CONSTANTS
// =============================================================================
const ARENA_RADIUS = 4500; // Massive 9,000px diameter arena
const TICK_RATE = 30; // 30 Hz server ticks
const TICK_MS = 1000 / TICK_RATE;
const BASE_SPEED = 2.85;
const BOOST_SPEED = 5.27;
const BASE_TURN_SPEED = 0.075;
const MAX_RADIUS = 52;
const BASE_MASS = 50;

const BOT_NAMES = [
  'Viper', 'Shadow', 'Ghost', 'Striker', 'Titan', 'Nemesis', 'Zenith', 'Hydra',
  'Apex', 'Blaze', 'Frost', 'Storm', 'Phantom', 'Oracle', 'Raptor', 'Eclipse',
  'Cobra', 'Nova', 'Pulse', 'Scythe', 'Kage', 'Chronos', 'Ares', 'Cipher'
];

const SKINS = [
  'cyber-neon', 'toxic-slimer', 'golden-champion', 'cosmic-void',
  'candy-stripe', 'inferno-dragon', 'arctic-frost', 'monochrome'
];

// Helper: Distance squared
function distSq(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

// Helper: Distance from point to segment squared
function distSqToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = wx * vx + wy * vy;
  if (c1 <= 0) return (px - ax) ** 2 + (py - ay) ** 2;
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return (px - bx) ** 2 + (py - by) ** 2;
  const b = c1 / c2;
  return (px - (ax + b * vx)) ** 2 + (py - (ay + b * vy)) ** 2;
}

// =============================================================================
// ARENA ROOM CLASS
// =============================================================================
class ArenaRoom {
  constructor(id, name, difficulty = 'medium', botCount = 38, options = {}) {
    this.id = id;
    this.name = name;
    this.difficulty = difficulty;
    this.botCount = botCount;
    this.arenaRadius = options.arenaRadius || ARENA_RADIUS;
    this.mode = options.mode || 'official'; // 'official' | 'public' | 'private'
    this.roomCode = options.roomCode || null;
    this.hostName = options.hostName || null;
    this.isDynamic = options.isDynamic || false;
    this.emptySince = null;
    this.isDestroyed = false;
    this.startTime = Date.now();
    this.tickCount = 0;

    this.snakes = new Map();
    this.food = new Map();
    this.clients = new Map(); // ws -> { snakeId, isSpectator, name, lastPing }
    this.eatenFoodIds = [];
    this.newFoodItems = [];

    this.nextFoodId = 1;
    this.nextBotId = 1;

    // Spatial hash grid for high-speed local AI food perception
    this.foodGrid = new SpatialHashGrid(160);
    this.foodAdapter = {
      arenaRadius: this.arenaRadius,
      spatialGrid: {
        queryRadius: (x, y, radius) => {
          const items = this.foodGrid.queryRadius(x, y, radius);
          return items.filter((item) => this.food.has(Number(item.id)));
        },
      },
    };

    // Pre-populate food across massive arena
    for (let i = 0; i < 2500; i++) {
      this.spawnFood('regular');
    }
    for (let i = 0; i < 45; i++) {
      this.spawnFood('super');
    }

    // Pre-populate living bots
    for (let i = 0; i < botCount; i++) {
      this.spawnBot();
    }
  }

  getUptimeSeconds() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  spawnFood(type = 'regular', x = null, y = null, value = null, color = null) {
    if (x === null || y === null) {
      const r = Math.sqrt(Math.random()) * (this.arenaRadius - 80);
      const theta = Math.random() * Math.PI * 2;
      x = Math.cos(theta) * r;
      y = Math.sin(theta) * r;
    }

    const id = this.nextFoodId++;
    const val = value !== null ? value : (type === 'super' ? 30 : (Math.random() < 0.7 ? 2 : 5));
    const foodItem = {
      id,
      x: Math.round(x),
      y: Math.round(y),
      v: val,
      t: type,
      c: color || (type === 'super' ? '#ffd700' : null)
    };

    this.food.set(id, foodItem);
    this.newFoodItems.push(foodItem);
    this.foodGrid.insert({
      id: String(id),
      x: foodItem.x,
      y: foodItem.y,
      radius: 8,
      data: {
        position: new Vector2D(foodItem.x, foodItem.y),
        value: val,
        type: type,
      },
    });
    return foodItem;
  }

  spawnBot() {
    const id = `bot_${this.id}_${this.nextBotId++}`;
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const skinId = SKINS[Math.floor(Math.random() * SKINS.length)];

    let x = 0, y = 0, attempts = 0;
    do {
      const r = Math.sqrt(Math.random()) * (this.arenaRadius - 500);
      const theta = Math.random() * Math.PI * 2;
      x = Math.cos(theta) * r;
      y = Math.sin(theta) * r;
      attempts++;

      let tooClose = false;
      for (const other of this.snakes.values()) {
        if (other.isDead) continue;
        if (distSq(x, y, other.x, other.y) < 550 * 550) {
          tooClose = true;
          break;
        }
        if (other.segments && other.segments.length > 0) {
          for (let s = 0; s < other.segments.length; s += 5) {
            const seg = other.segments[s];
            if (distSq(x, y, seg.x, seg.y) < 280 * 280) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) break;
        }
      }
      if (!tooClose) break;
    } while (attempts < 20);

    // Tier distribution based on room difficulty:
    // MEDIUM SERVER: Strictly Easy (green) and Medium (yellow) bots ONLY (0% hard/red)
    // HARD SERVER: Colosseum dominated by Apex Hard (red) bots
    let tier = 'medium';
    const rand = Math.random();
    if (this.difficulty === 'medium') {
      tier = rand < 0.40 ? 'easy' : 'medium';
    } else {
      tier = rand < 0.10 ? 'easy' : rand < 0.35 ? 'medium' : 'hard';
    }

    const initialMass = BASE_MASS + (tier === 'hard' ? 120 + Math.random() * 250 : tier === 'medium' ? 40 + Math.random() * 120 : Math.random() * 50);

    const snake = {
      id,
      name,
      skinId,
      tier,
      isBot: true,
      position: new Vector2D(x, y),
      angle: Math.random() * Math.PI * 2,
      targetAngle: 0,
      speed: BASE_SPEED,
      mass: initialMass,
      score: Math.floor(initialMass),
      radius: 14,
      turnSpeedMultiplier: 1.0,
      isBoosting: false,
      isDead: false,
      kills: 0,
      spawnProtection: 3.0,
      segments: [],
      hasPowerUp: () => false,
      get hasSpawnProtection() { return this.spawnProtection > 0; },
      setTargetAngle(a) { this.targetAngle = a; },
    };
    Object.defineProperty(snake, 'x', {
      get() { return this.position.x; },
      set(val) { this.position.x = val; },
      configurable: true,
      enumerable: true,
    });
    Object.defineProperty(snake, 'y', {
      get() { return this.position.y; },
      set(val) { this.position.y = val; },
      configurable: true,
      enumerable: true,
    });
    snake.targetAngle = snake.angle;
    snake.brain = new BotBrain(snake, tier);

    // Build segments
    this.updateSnakeDimensions(snake);
    const initLen = Math.floor(15 + Math.pow(Math.max(0, snake.mass - BASE_MASS), 0.58) * 1.05);
    for (let i = 0; i < initLen; i++) {
      snake.segments.push({
        x: x - Math.cos(snake.angle) * i * 7,
        y: y - Math.sin(snake.angle) * i * 7,
        radius: snake.radius,
        angle: snake.angle,
      });
    }

    this.snakes.set(id, snake);
    return snake;
  }

  pickBotMacroTarget(bot) {
    bot.macroTimer = 0;
    bot.macroDuration = bot.tier === 'hard' ? 8 + Math.random() * 6 : 12 + Math.random() * 8;
    const toCenter = Math.random() < (bot.tier === 'hard' ? 0.65 : 0.45);
    if (toCenter) {
      const r = Math.random() * (this.arenaRadius * 0.45);
      const theta = Math.random() * Math.PI * 2;
      bot.macroTargetX = Math.cos(theta) * r;
      bot.macroTargetY = Math.sin(theta) * r;
    } else {
      const r = 0.35 * this.arenaRadius + Math.random() * (this.arenaRadius * 0.4);
      const theta = Math.random() * Math.PI * 2;
      bot.macroTargetX = Math.cos(theta) * r;
      bot.macroTargetY = Math.sin(theta) * r;
    }
  }

  updateSnakeDimensions(snake) {
    const massDelta = Math.max(0, snake.mass - BASE_MASS);
    snake.radius = Math.min(MAX_RADIUS, 14 + Math.pow(massDelta, 0.36) * 0.9);
    snake.score = Math.floor(snake.mass);
  }

  spawnPlayer(ws, name, skinId) {
    const id = `player_${Math.random().toString(36).substr(2, 9)}`;
    const r = Math.sqrt(Math.random()) * (this.arenaRadius - 600);
    const theta = Math.random() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;

    const snake = {
      id,
      name: name || 'Player',
      skinId: skinId || 'cyber-neon',
      tier: 'player',
      isBot: false,
      position: new Vector2D(x, y),
      angle: Math.random() * Math.PI * 2,
      targetAngle: 0,
      speed: BASE_SPEED,
      mass: BASE_MASS,
      score: BASE_MASS,
      radius: 14,
      turnSpeedMultiplier: 1.0,
      isBoosting: false,
      isDead: false,
      kills: 0,
      spawnProtection: 3.0,
      segments: [],
      hasPowerUp: () => false,
      get hasSpawnProtection() { return this.spawnProtection > 0; },
      setTargetAngle(a) { this.targetAngle = a; },
    };
    Object.defineProperty(snake, 'x', {
      get() { return this.position.x; },
      set(val) { this.position.x = val; },
      configurable: true,
      enumerable: true,
    });
    Object.defineProperty(snake, 'y', {
      get() { return this.position.y; },
      set(val) { this.position.y = val; },
      configurable: true,
      enumerable: true,
    });
    snake.targetAngle = snake.angle;

    for (let i = 0; i < 15; i++) {
      snake.segments.push({
        x: x - Math.cos(snake.angle) * i * 7,
        y: y - Math.sin(snake.angle) * i * 7,
        radius: snake.radius,
        angle: snake.angle,
      });
    }

    this.snakes.set(id, snake);
    this.clients.set(ws, { snakeId: id, isSpectator: false, name: snake.name });

    // Notify all existing players in arena of new human player arrival
    this.broadcast({
      type: 'player_joined',
      playerName: snake.name,
      snakeId: id,
      isSpectator: false,
    }, ws);

    return snake;
  }

  broadcast(data, excludeWs = null) {
    if (this.isDestroyed) return;
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    for (const ws of this.clients.keys()) {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(msg);
        } catch {}
      }
    }
  }

  destroy() {
    this.isDestroyed = true;
    for (const ws of this.clients.keys()) {
      try {
        ws.send(JSON.stringify({ type: 'room_closed', message: 'Arena has been closed.' }));
      } catch {}
    }
    this.clients.clear();
    this.snakes.clear();
    this.food.clear();
  }

  killSnake(victim, killer) {
    if (victim.isDead) return;
    victim.isDead = true;

    if (killer && killer.id !== victim.id) {
      killer.kills++;
    }

    // Drop corpse pellets along segments
    const count = Math.min(75, Math.max(12, Math.floor(victim.segments.length * 0.75)));
    const valuePerPellet = Math.max(2, Math.floor((victim.mass * 0.6) / count));

    for (let i = 0; i < count; i++) {
      const segIndex = Math.floor((i / count) * (victim.segments.length - 1));
      const seg = victim.segments[segIndex] || { x: victim.x, y: victim.y };
      const offAngle = Math.random() * Math.PI * 2;
      const offDist = Math.random() * 25;
      this.spawnFood(
        'corpse',
        seg.x + Math.cos(offAngle) * offDist,
        seg.y + Math.sin(offAngle) * offDist,
        valuePerPellet,
        '#f87171'
      );
    }

    // Calculate geometric midpoint of corpse trail for accurate feasting
    const midIdx = Math.floor(victim.segments.length / 2);
    const corpseX = victim.segments[midIdx] ? victim.segments[midIdx].x : victim.x;
    const corpseY = victim.segments[midIdx] ? victim.segments[midIdx].y : victim.y;
    this.notifyDeathEvent(corpseX, corpseY, victim.mass, killer ? killer.id : null);

    // If human, notify game over
    for (const [ws, info] of this.clients.entries()) {
      if (info.snakeId === victim.id) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'gameOver',
            stats: {
              score: victim.score,
              kills: victim.kills,
              length: victim.segments.length,
              killerName: killer ? killer.name : 'Arena Boundary'
            }
          }));
        }
        info.isSpectator = true;
        info.snakeId = null;
      }
    }

    this.snakes.delete(victim.id);
  }

  notifyDeathEvent(x, y, mass, killerId) {
    const candidates = [];
    for (const s of this.snakes.values()) {
      if (s.isDead || !s.isBot || !s.brain) continue;
      const isKiller = s.id === killerId;
      const d = Math.sqrt(distSq(s.x, s.y, x, y));
      candidates.push({ snake: s, dist: d, isKiller });
    }
    candidates.sort((a, b) => a.dist - b.dist);
    let extra = 0;
    for (const c of candidates) {
      if (c.isKiller) {
        c.snake.brain.onCorpseFeast(x, y, mass, true);
      } else if (extra < 3 && c.dist < Math.min(1200, c.snake.brain.viewDistance)) {
        c.snake.brain.onCorpseFeast(x, y, mass, false);
        extra++;
      }
    }
  }

  // Authoritative Tick Update (30 Hz)
  tick(dt) {
    this.tickCount++;
    this.eatenFoodIds = [];
    this.newFoodItems = [];

    const livingSnakes = Array.from(this.snakes.values()).filter((s) => !s.isDead);

    // 1. Update Bots AI using shared canonical BotBrain
    for (const snake of livingSnakes) {
      if (!snake.isBot) continue;

      // Spawn protection decay
      if (snake.spawnProtection > 0) {
        snake.spawnProtection -= dt;
      }

      if (snake.brain) {
        snake.brain.update(dt, 1.0, livingSnakes, this.foodAdapter, [], false);
      }
    }

    // Periodically re-index spatial grid to purge eaten food references
    if (this.tickCount % 120 === 0) {
      this.foodGrid.clear();
      for (const f of this.food.values()) {
        this.foodGrid.insert({
          id: String(f.id),
          x: f.x,
          y: f.y,
          radius: 8,
          data: {
            position: new Vector2D(f.x, f.y),
            value: f.v,
            type: f.t,
          },
        });
      }
    }

    // 2. Move Snakes & Update Segments
    for (const snake of livingSnakes) {
      // Natural turn interpolation
      if (snake.spawnProtection > 0 && !snake.isBot) {
        snake.spawnProtection -= dt;
      }

      let diff = snake.targetAngle - snake.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      // Fair physics: turning rate smoothly scales with mass
      const turnRate = Math.max(0.035, BASE_TURN_SPEED - (snake.radius / MAX_RADIUS) * 0.04);
      const maxTurn = turnRate * (dt * 60);
      if (Math.abs(diff) <= maxTurn) {
        snake.angle = snake.targetAngle;
      } else {
        snake.angle += Math.sign(diff) * maxTurn;
      }

      // Boosting mass cost
      if (snake.isBoosting && snake.mass > BASE_MASS + 5) {
        snake.speed = BOOST_SPEED;
        snake.mass -= 0.22 * (dt * 60);
        this.updateSnakeDimensions(snake);

        // Drop boost pellets occasionally
        if (this.tickCount % 6 === 0) {
          const tail = snake.segments[snake.segments.length - 1] || { x: snake.x, y: snake.y };
          this.spawnFood('boost_remnant', tail.x, tail.y, 1, '#38bdf8');
        }
      } else {
        snake.speed = BASE_SPEED;
      }

      // Advance head
      snake.x += Math.cos(snake.angle) * snake.speed * (dt * 60);
      snake.y += Math.sin(snake.angle) * snake.speed * (dt * 60);

      // Arena boundary collision
      if (snake.x * snake.x + snake.y * snake.y >= this.arenaRadius * this.arenaRadius) {
        this.killSnake(snake, null);
        continue;
      }

      // Follow segments
      const targetLen = Math.floor(15 + Math.pow(Math.max(0, snake.mass - BASE_MASS), 0.58) * 1.05);
      if (snake.segments.length === 0) {
        snake.segments.push({ x: snake.x, y: snake.y });
      }

      let prevX = snake.x;
      let prevY = snake.y;
      const segDist = 7;

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

      // Grow segments
      while (snake.segments.length < targetLen) {
        const last = snake.segments[snake.segments.length - 1];
        snake.segments.push({ x: last.x, y: last.y });
      }
      // Shrink segments if lost mass
      while (snake.segments.length > targetLen && snake.segments.length > 15) {
        snake.segments.pop();
      }
    }

    // 3. Lethal Collisions (Head hits Body)
    for (const snake of livingSnakes) {
      if (snake.isDead || snake.spawnProtection > 0) continue;

      const headRadius = snake.radius * 0.85;

      for (const other of livingSnakes) {
        if (other.isDead || other.spawnProtection > 0) continue;
        if (other.id === snake.id) continue;

        for (let i = 0; i < other.segments.length; i++) {
          const seg = other.segments[i];
          const hitDist = headRadius + other.radius * 0.9;
          if (distSq(snake.x, snake.y, seg.x, seg.y) < hitDist * hitDist) {
            // Lethal crash!
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
      const eatRadius = snake.radius * 1.35 + 8;
      const eatRadiusSq = eatRadius * eatRadius;

      for (const [id, food] of this.food.entries()) {
        if (distSq(snake.x, snake.y, food.x, food.y) <= eatRadiusSq) {
          snake.mass += food.v;
          this.updateSnakeDimensions(snake);
          this.food.delete(id);
          this.eatenFoodIds.push(id);
        }
      }
    }

    // 5. Replenish Food & Respawn Bots
    if (this.food.size < 2500) {
      const toSpawn = Math.min(15, 2500 - this.food.size);
      for (let i = 0; i < toSpawn; i++) {
        this.spawnFood('regular');
      }
    }

    const currentBotCount = Array.from(this.snakes.values()).filter((s) => s.isBot && !s.isDead).length;
    if (currentBotCount < this.botCount) {
      this.spawnBot();
    }

    // 6. Compute Leaderboard
    const leaderboard = Array.from(this.snakes.values())
      .filter((s) => !s.isDead)
      .sort((a, b) => b.mass - a.mass)
      .slice(0, 10)
      .map((s) => ({
        id: s.id,
        name: s.name,
        score: s.score,
        isPlayer: !s.isBot,
        tier: s.tier,
      }));

    // 7. Broadcast Tick Packet to Clients in this Arena
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
          score: s.score,
          kills: s.kills || 0,
          isBoosting: s.isBoosting,
          spawnProtection: s.spawnProtection > 0,
          aiState: s.brain ? s.brain.state : null,
          archetype: s.brain ? s.brain.personality.archetype : null,
          // Transmit downsampled segments for low bandwidth
          segs: s.segments.filter((_, idx) => idx % 2 === 0).map((p) => [Math.round(p.x), Math.round(p.y)]),
        }));

      const packet = JSON.stringify({
        type: 'tick',
        tick: this.tickCount,
        snakes: snakesData,
        eaten: this.eatenFoodIds,
        newFood: this.newFoodItems,
        leaderboard,
      });

      for (const ws of this.clients.keys()) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(packet);
        }
      }
    }
  }
}

// =============================================================================
// DYNAMIC MULTIPLAYER ROOM & ARENA REGISTRY
// =============================================================================
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    if (i === 3) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 2 Permanent Dedicated Official Arenas (Massive 9,000px Worlds)
const dedicatedRooms = {
  medium: new ArenaRoom('medium', 'Emerald Glade [Medium]', 'medium', 38, { mode: 'official' }),
  hard: new ArenaRoom('hard', 'Apex Colosseum [Hard]', 'hard', 45, { mode: 'official' }),
};

// Dynamic player-hosted custom rooms (Map: roomId -> ArenaRoom)
const customRooms = new Map();

function getRoomById(id) {
  if (dedicatedRooms[id]) return dedicatedRooms[id];
  return customRooms.get(id) || null;
}

function getRoomByCode(code) {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();
  for (const room of customRooms.values()) {
    if (room.roomCode && room.roomCode.toUpperCase() === cleanCode && !room.isDestroyed) {
      return room;
    }
  }
  return null;
}

function getAllRooms() {
  return [...Object.values(dedicatedRooms), ...customRooms.values()];
}

// Helper: send full initial state snapshot to connected client
function sendInitSnapshot(ws, room, playerSnake) {
  const fullFood = Array.from(room.food.values()).map((f) => ({
    id: f.id,
    x: f.x,
    y: f.y,
    v: f.v,
    t: f.t,
    c: f.c,
  }));

  ws.send(JSON.stringify({
    type: 'init',
    roomId: room.id,
    roomCode: room.roomCode || null,
    arenaRadius: room.arenaRadius,
    myId: playerSnake ? playerSnake.id : null,
    food: fullFood,
    snakes: Array.from(room.snakes.values()).map((s) => ({
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
      score: s.score,
      kills: s.kills || 0,
      isBoosting: s.isBoosting,
      spawnProtection: s.spawnProtection > 0,
      aiState: s.brain ? s.brain.state : null,
      archetype: s.brain ? s.brain.personality.archetype : null,
      segs: s.segments.filter((_, idx) => idx % 2 === 0).map((p) => [Math.round(p.x), Math.round(p.y)]),
    })),
  }));
}

function getStatusPayload() {
  const communityList = [];
  for (const room of customRooms.values()) {
    if (room.mode === 'public' && !room.isDestroyed) {
      communityList.push({
        id: room.id,
        name: room.name,
        hostName: room.hostName || 'Host',
        difficulty: room.difficulty,
        uptime: room.getUptimeSeconds(),
        snakes: room.snakes.size,
        players: Array.from(room.clients.values()).filter((c) => !c.isSpectator).length,
        spectators: Array.from(room.clients.values()).filter((c) => c.isSpectator).length,
        bots: room.botCount,
        mode: 'public',
      });
    }
  }

  return {
    status: 'ok',
    service: 'snakewar-dedicated-server',
    timestamp: Date.now(),
    arenas: {
      medium: {
        id: 'medium',
        name: dedicatedRooms.medium.name,
        difficulty: 'medium',
        uptime: dedicatedRooms.medium.getUptimeSeconds(),
        snakes: dedicatedRooms.medium.snakes.size,
        players: Array.from(dedicatedRooms.medium.clients.values()).filter((c) => !c.isSpectator).length,
        spectators: Array.from(dedicatedRooms.medium.clients.values()).filter((c) => c.isSpectator).length,
      },
      hard: {
        id: 'hard',
        name: dedicatedRooms.hard.name,
        difficulty: 'hard',
        uptime: dedicatedRooms.hard.getUptimeSeconds(),
        snakes: dedicatedRooms.hard.snakes.size,
        players: Array.from(dedicatedRooms.hard.clients.values()).filter((c) => !c.isSpectator).length,
        spectators: Array.from(dedicatedRooms.hard.clients.values()).filter((c) => c.isSpectator).length,
      },
    },
    community: communityList,
  };
}

// 30 Hz Game Loop for all active arenas (with dynamic garbage collection)
setInterval(() => {
  const now = Date.now();
  const roomsToClean = [];

  for (const room of getAllRooms()) {
    if (room.isDestroyed) continue;
    room.tick(1 / TICK_RATE);

    // Dynamic custom rooms: auto-clean after 60s when no human players are present
    if (room.isDynamic) {
      const humanCount = room.clients.size;
      if (humanCount === 0) {
        if (!room.emptySince) {
          room.emptySince = now;
        } else if (now - room.emptySince > 60000) {
          roomsToClean.push(room.id);
        }
      } else {
        room.emptySince = null;
      }
    }
  }

  for (const roomId of roomsToClean) {
    const room = customRooms.get(roomId);
    if (room) {
      console.log(`[Room Manager] Destroying inactive custom room: "${room.name}" (${room.id})`);
      room.destroy();
      customRooms.delete(roomId);
    }
  }
}, TICK_MS);

// =============================================================================
// SNAKEROOM BROKER (High-Speed Room Broker for PartyHost and PartyGuest)
// =============================================================================
const publicLobbyRooms = new Map(); // roomId -> RoomMetadata
const brokerRooms = new Map(); // roomName -> { name, clients: Map(connId -> ws), hostConnId, hostWs, metadata }

function cleanExpiredLobbyRooms() {
  const now = Date.now();
  for (const [id, room] of publicLobbyRooms.entries()) {
    if (now - (room.updatedAt || 0) > 300000) {
      publicLobbyRooms.delete(id);
    }
  }
}

function broadcastLobbyUpdate() {
  cleanExpiredLobbyRooms();
  const packet = JSON.stringify({
    type: 'community_rooms',
    rooms: Array.from(publicLobbyRooms.values()),
  });
  const lobby = brokerRooms.get('lobby');
  if (lobby) {
    for (const clientWs of lobby.clients.values()) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(packet);
      }
    }
  }
}

function handleBrokerConnection(ws, pathname) {
  const roomName = decodeURIComponent(
    pathname.replace(/^\/parties\/snake-room\//, '').replace(/^\/party\//, '')
  );
  const connId = `conn_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  ws.connId = connId;

  if (roomName === 'lobby') {
    let lobby = brokerRooms.get('lobby');
    if (!lobby) {
      lobby = { name: 'lobby', clients: new Map(), hostConnId: null, hostWs: null, metadata: null };
      brokerRooms.set('lobby', lobby);
    }
    lobby.clients.set(connId, ws);

    cleanExpiredLobbyRooms();
    ws.send(JSON.stringify({
      type: 'community_rooms',
      rooms: Array.from(publicLobbyRooms.values()),
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'get_rooms') {
          cleanExpiredLobbyRooms();
          ws.send(JSON.stringify({
            type: 'community_rooms',
            rooms: Array.from(publicLobbyRooms.values()),
          }));
        } else if (data.type === 'register_public_room' && data.room) {
          publicLobbyRooms.set(data.room.id, {
            ...data.room,
            updatedAt: Date.now(),
          });
          broadcastLobbyUpdate();
        } else if (data.type === 'unregister_public_room' && data.roomId) {
          publicLobbyRooms.delete(data.roomId);
          broadcastLobbyUpdate();
        }
      } catch (err) {
        console.error('[Broker Lobby] Message parse error:', err);
      }
    });

    ws.on('close', () => {
      lobby.clients.delete(connId);
      if (lobby.clients.size === 0) {
        brokerRooms.delete('lobby');
      }
    });
    return;
  }

  // Match room
  let room = brokerRooms.get(roomName);
  if (!room) {
    room = { name: roomName, clients: new Map(), hostConnId: null, hostWs: null, metadata: null };
    brokerRooms.set(roomName, room);
  }
  room.clients.set(connId, ws);

  ws.send(JSON.stringify({
    type: 'connected_to_room',
    roomId: roomName,
    hasHost: room.hostConnId !== null,
  }));

  ws.on('message', (message) => {
    try {
      const raw = message.toString();
      const data = JSON.parse(raw);

      // WebRTC Signaling
      if (data.type === 'webrtc_signal' && data.targetConnId) {
        const target = room.clients.get(data.targetConnId);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({
            type: 'webrtc_signal',
            fromConnId: connId,
            signal: data.signal,
          }));
        }
        return;
      }

      // Host claims authority
      if (data.type === 'claim_host') {
        room.hostConnId = connId;
        room.hostWs = ws;
        room.metadata = data.metadata || null;

        if (data.isPublic && room.metadata) {
          publicLobbyRooms.set(room.metadata.id, {
            ...room.metadata,
            updatedAt: Date.now(),
          });
          broadcastLobbyUpdate();
        }

        ws.send(JSON.stringify({ type: 'host_claimed', roomId: roomName }));
        return;
      }

      // Guest joins
      if (data.type === 'guest_join') {
        if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.send(JSON.stringify({
            type: 'guest_joined',
            guestConnId: connId,
            name: data.name,
            skinId: data.skinId,
            isSpectator: !!data.isSpectator,
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'NO_HOST',
            message: 'Waiting for room host to connect...',
          }));
        }
        return;
      }

      // Host relaying packets to guests
      if (connId === room.hostConnId) {
        if ((data.type === 'init_response' || data.type === 'game_over_response') && data.targetConnId) {
          const guest = room.clients.get(data.targetConnId);
          if (guest && guest.readyState === WebSocket.OPEN) {
            guest.send(JSON.stringify(data.packet));
          }
        } else if (data.type === 'peer_pong' && data.guestConnId) {
          const guest = room.clients.get(data.guestConnId);
          if (guest && guest.readyState === WebSocket.OPEN) {
            guest.send(JSON.stringify({ type: 'pong', t: data.t }));
          }
        } else if (data.type === 'tick') {
          for (const [cId, clientWs] of room.clients) {
            if (cId !== connId && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(raw);
            }
          }
        } else if (data.type === 'player_joined' || data.type === 'player_left') {
          for (const [cId, clientWs] of room.clients) {
            if (cId !== connId && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(raw);
            }
          }
        }
        return;
      }

      // Guest sending input to host
      if (data.type === 'input') {
        if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.send(JSON.stringify({
            type: 'guest_input',
            guestConnId: connId,
            angle: data.angle,
            isBoosting: data.isBoosting,
          }));
        }
        return;
      }

      // Ping
      if (data.type === 'ping') {
        if (room.hostWs && connId !== room.hostConnId && room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.send(JSON.stringify({ type: 'peer_ping', guestConnId: connId, t: data.t }));
        } else {
          ws.send(JSON.stringify({ type: 'pong', t: data.t }));
        }
        return;
      }

      // Respawn
      if (data.type === 'respawn') {
        if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.send(JSON.stringify({
            type: 'guest_joined',
            guestConnId: connId,
            name: data.name,
            skinId: data.skinId,
            isSpectator: false,
          }));
        }
        return;
      }
    } catch (err) {
      console.error(`[Broker Room ${roomName}] Message error:`, err);
    }
  });

  ws.on('close', () => {
    room.clients.delete(connId);
    if (connId === room.hostConnId) {
      room.hostConnId = null;
      room.hostWs = null;
      for (const clientWs of room.clients.values()) {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'room_closed',
            message: 'The match host has left.',
          }));
        }
      }
      if (publicLobbyRooms.has(roomName)) {
        publicLobbyRooms.delete(roomName);
        broadcastLobbyUpdate();
      }
    } else {
      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
        room.hostWs.send(JSON.stringify({
          type: 'guest_left',
          guestConnId: connId,
        }));
      }
    }
    if (room.clients.size === 0) {
      brokerRooms.delete(roomName);
    }
  });
}

// =============================================================================
// HTTP HEALTHCHECK & API SERVER (RENDER COMPLIANT)
// =============================================================================
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/health' || pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStatusPayload(), null, 2));
    return;
  }

  if (pathname.includes('/lobby/api/rooms') || pathname === '/api/rooms') {
    cleanExpiredLobbyRooms();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Array.from(publicLobbyRooms.values())));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SnakeWar Dedicated Game Server & Broker is running 24/7 on WebSockets.\nConnect via ws://localhost:' + PORT);
});

// =============================================================================
// WEBSOCKET SERVER
// =============================================================================
const wss = new WebSocketServer({ server });

// Heartbeat to prevent reverse proxy / Render idle drops
const heartbeatInterval = setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, 25000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Route PartyKit Edge-style Broker connections
  if (pathname.startsWith('/parties/snake-room/') || pathname.startsWith('/party/')) {
    handleBrokerConnection(ws, pathname);
    return;
  }

  let currentRoom = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', t: data.t }));
        return;
      }

      if (data.type === 'status' || data.type === 'list_rooms') {
        ws.send(JSON.stringify({
          type: 'status',
          ...getStatusPayload(),
        }));
        return;
      }

      if (data.type === 'check_room_code') {
        const room = getRoomByCode(data.code);
        ws.send(JSON.stringify({
          type: 'check_room_code_result',
          code: data.code,
          valid: !!room,
          room: room ? {
            id: room.id,
            name: room.name,
            hostName: room.hostName || 'Host',
            difficulty: room.difficulty,
            players: Array.from(room.clients.values()).filter((c) => !c.isSpectator).length,
            bots: room.botCount,
          } : null,
        }));
        return;
      }

      if (data.type === 'create_room') {
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const mode = data.mode === 'private' ? 'private' : 'public';
        const roomCode = data.roomCode || generateRoomCode();
        const hostName = data.hostName || data.name || 'Host';
        const name = data.name || `${hostName}'s Arena`;
        const difficulty = data.settings?.difficulty || 'medium';
        const botCount = typeof data.settings?.botCount === 'number' ? data.settings.botCount : 30;

        const newRoom = new ArenaRoom(roomId, name, difficulty, botCount, {
          mode,
          roomCode,
          hostName,
          isDynamic: true,
        });

        customRooms.set(roomId, newRoom);
        currentRoom = newRoom;
        console.log(`[Room Manager] Created ${mode} room "${name}" (ID: ${roomId}, Code: ${roomCode})`);

        ws.send(JSON.stringify({
          type: 'room_created',
          roomId: newRoom.id,
          roomCode: newRoom.roomCode,
          mode: newRoom.mode,
        }));

        let playerSnake = null;
        if (!data.isSpectator) {
          playerSnake = newRoom.spawnPlayer(ws, hostName, data.skinId);
        } else {
          newRoom.clients.set(ws, { snakeId: null, isSpectator: true, name: hostName });
        }

        sendInitSnapshot(ws, newRoom, playerSnake);
        return;
      }

      if (data.type === 'join') {
        let room = null;
        if (data.roomCode) {
          room = getRoomByCode(data.roomCode);
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'ROOM_NOT_FOUND',
              message: `No active arena found with code "${data.roomCode.toUpperCase()}".`,
            }));
            return;
          }
        } else if (data.roomId) {
          room = getRoomById(data.roomId);
          if (!room) {
            room = dedicatedRooms.medium;
          }
        } else {
          room = dedicatedRooms.medium;
        }

        currentRoom = room;

        let playerSnake = null;
        if (!data.isSpectator) {
          playerSnake = room.spawnPlayer(ws, data.name, data.skinId);
        } else {
          room.clients.set(ws, { snakeId: null, isSpectator: true, name: data.name || 'Spectator' });
          room.broadcast({
            type: 'player_joined',
            playerName: data.name || 'Spectator',
            snakeId: null,
            isSpectator: true,
          }, ws);
        }

        sendInitSnapshot(ws, room, playerSnake);
        return;
      }

      if (data.type === 'input' && currentRoom) {
        const clientInfo = currentRoom.clients.get(ws);
        if (clientInfo && clientInfo.snakeId) {
          const snake = currentRoom.snakes.get(clientInfo.snakeId);
          if (snake && !snake.isDead) {
            if (typeof data.angle === 'number') snake.targetAngle = data.angle;
            if (typeof data.isBoosting === 'boolean') snake.isBoosting = data.isBoosting;
          }
        }
        return;
      }
    } catch (err) {
      console.error('Error parsing client message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const clientInfo = currentRoom.clients.get(ws);
      if (clientInfo) {
        if (clientInfo.snakeId) {
          const snake = currentRoom.snakes.get(clientInfo.snakeId);
          if (snake) {
            currentRoom.killSnake(snake, null);
          }
        }
        currentRoom.broadcast({
          type: 'player_left',
          playerName: clientInfo.name,
        });
      }
      currentRoom.clients.delete(ws);
    }
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`SnakeWar Dedicated Game Server listening on port ${PORT}`);
  console.log(`HTTP Healthcheck: http://localhost:${PORT}/health`);
  console.log(`WebSocket Server: ws://localhost:${PORT}`);
  console.log(`Arenas Online:`);
  console.log(` - 🟢 [medium] ${dedicatedRooms.medium.name} (${dedicatedRooms.medium.botCount} bots)`);
  console.log(` - 🔴 [hard]   ${dedicatedRooms.hard.name} (${dedicatedRooms.hard.botCount} bots)`);
  console.log(`=======================================================`);
});

module.exports = {
  rooms: dedicatedRooms,
  customRooms,
  server,
  ArenaRoom,
};

