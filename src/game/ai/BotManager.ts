import { Snake } from '../entities/Snake';
import { BotBrain, BotTier } from './BotBrain';
import { GAME_CONFIG } from '../config/constants';
import { SKINS, BOT_NAMES } from '../config/skins';
import { FoodManager } from '../entities/FoodManager';
import { PowerUp } from '../entities/PowerUp';
import { BotDifficulty } from '../config/session';

export class BotManager {
  public bots: Map<string, { snake: Snake; brain: BotBrain }> = new Map();
  private nextBotId: number = 1;
  public arenaRadius: number = GAME_CONFIG.ARENA_RADIUS;
  public targetBotCount: number = GAME_CONFIG.BOT_COUNT;
  public lobbyDifficulty: BotDifficulty = 'medium';

  constructor() {}

  init(
    count: number = GAME_CONFIG.BOT_COUNT,
    playerPos?: { x: number; y: number },
    arenaRadius: number = GAME_CONFIG.ARENA_RADIUS,
    difficulty: BotDifficulty = 'medium'
  ): Snake[] {
    this.arenaRadius = arenaRadius;
    this.targetBotCount = count;
    this.lobbyDifficulty = difficulty;
    this.bots.clear();

    const createdSnakes: Snake[] = [];
    for (let i = 0; i < count; i++) {
      const snake = this.spawnBot(playerPos);
      createdSnakes.push(snake);
    }
    return createdSnakes;
  }

  /**
   * Determine individual bot tier based on lobby difficulty setting.
   */
  private pickBotTier(): BotTier {
    const rand = Math.random();
    if (this.lobbyDifficulty === 'easy') {
      // Casual practice arena: 100% Easy bots that graze and rarely attack
      return 'easy';
    }

    if (this.lobbyDifficulty === 'medium') {
      // Standard competitive arena: balanced mix of Easy & Medium bots
      return rand < 0.35 ? 'easy' : 'medium';
    }

    // Hard lobby / Apex Colosseum: dominated by Apex Hard predators
    if (rand < 0.10) return 'easy';
    if (rand < 0.25) return 'medium';
    return 'hard';
  }

  spawnBot(avoidPos?: { x: number; y: number }, existingSnakes?: Snake[]): Snake {
    let x = 0;
    let y = 0;
    let attempts = 0;

    do {
      const r = Math.sqrt(Math.random()) * (this.arenaRadius - 380);
      const theta = Math.random() * Math.PI * 2;
      x = Math.cos(theta) * r;
      y = Math.sin(theta) * r;
      attempts++;

      let tooClose = false;

      // Safe distance from player
      if (avoidPos) {
        const dx = x - avoidPos.x;
        const dy = y - avoidPos.y;
        if (dx * dx + dy * dy < 750 * 750) tooClose = true;
      }

      // Safe distance from all existing snakes and their body trails
      if (!tooClose && existingSnakes) {
        for (const s of existingSnakes) {
          if (s.isDead) continue;
          const dx = x - s.position.x;
          const dy = y - s.position.y;
          if (dx * dx + dy * dy < 600 * 600) {
            tooClose = true;
            break;
          }

          // Check distance from body segments so bots never spawn inside a giant serpent's coils
          if (s.segments.length > 0) {
            for (let segIdx = 0; segIdx < s.segments.length; segIdx += 5) {
              const seg = s.segments[segIdx];
              const dsx = x - seg.x;
              const dsy = y - seg.y;
              if (dsx * dsx + dsy * dsy < 300 * 300) {
                tooClose = true;
                break;
              }
            }
            if (tooClose) break;
          }
        }
      }

      if (!tooClose) break;
    } while (attempts < 25);

    const id = `bot_${this.nextBotId++}`;
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const skin = SKINS[Math.floor(Math.random() * SKINS.length)];
    const tier = this.pickBotTier();

    const snake = new Snake(id, name, x, y, skin.id, true);
    snake.tier = tier;

    // Unified, fair physics: difficulty stems from AI intelligence, prediction, and tactics,
    // not artificial cheat speeds or artificially crippled turn rates.
    // Subtle individual variance (±2%) gives natural variety.
    snake.turnSpeedMultiplier = 0.98 + Math.random() * 0.04;

    // Initial mass variance depending on bot tier
    let bonusMass = 0;
    if (tier === 'easy') {
      bonusMass = Math.random() * 50;
    } else if (tier === 'medium') {
      bonusMass = 40 + Math.random() * 150;
    } else {
      bonusMass = 100 + Math.random() * 260; // Apex predators start formidable
    }

    if (bonusMass > 0) {
      snake.eatFood(bonusMass);
    }

    const brain = new BotBrain(snake, tier);
    this.bots.set(id, { snake, brain });

    return snake;
  }

  update(
    dt: number,
    deltaRatio: number,
    allSnakes: Snake[],
    foodManager: FoodManager,
    powerUps: PowerUp[] = [],
    playerPos?: { x: number; y: number },
    selfCollision: boolean = false
  ): Snake[] {
    const newlySpawned: Snake[] = [];

    // Remove dead bots & update living bots
    for (const [id, bot] of this.bots.entries()) {
      if (bot.snake.isDead) {
        this.bots.delete(id);
      } else {
        bot.brain.update(dt, deltaRatio, allSnakes, foodManager, powerUps, selfCollision);
      }
    }

    // Respawn up to targetBotCount using lobby distribution
    while (this.bots.size < this.targetBotCount) {
      const snake = this.spawnBot(playerPos, allSnakes);
      newlySpawned.push(snake);
    }

    return newlySpawned;
  }

  notifyDeathEvent(x: number, y: number, mass: number, killerId?: string): void {
    // Collect bots sorted by proximity to corpse
    const candidates: { bot: { snake: Snake; brain: BotBrain }; dist: number; isKiller: boolean }[] = [];

    for (const [id, bot] of this.bots.entries()) {
      if (bot.snake.isDead) continue;
      const isKiller = id === killerId;
      const dist = bot.snake.position.dist({ x, y } as any);
      candidates.push({ bot, dist, isKiller });
    }

    // Sort closest to farthest
    candidates.sort((a, b) => a.dist - b.dist);

    // Killer ALWAYS feasts with top priority. Up to 3 closest nearby bots feast
    let extraScavengers = 0;
    for (const c of candidates) {
      if (c.isKiller) {
        c.bot.brain.onCorpseFeast(x, y, mass, true);
      } else if (extraScavengers < 3 && c.dist < Math.min(1200, c.bot.brain.viewDistance)) {
        c.bot.brain.onCorpseFeast(x, y, mass, false);
        extraScavengers++;
      }
    }
  }
}
