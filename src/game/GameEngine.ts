import { Camera } from './core/Camera';
import { Vector2D } from './core/Vector2D';
import { GameLoop } from './core/GameLoop';
import { Snake } from './entities/Snake';
import { FoodManager } from './entities/FoodManager';
import { PowerUp, PowerUpType, POWERUP_CONFIGS } from './entities/PowerUp';
import { BotManager } from './ai/BotManager';
import { ParticleSystem } from './render/ParticleSystem';
import { CanvasRenderer } from './render/CanvasRenderer';
import { soundManager } from './audio/SoundManager';
import { GAME_CONFIG } from './config/constants';
import { GameSettings, DEFAULT_SETTINGS } from './config/settings';
import { ArenaSessionConfig, DEFAULT_SESSION_CONFIG } from './config/session';
import { NetworkClient } from './network/NetworkClient';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  isPlayer: boolean;
  tier?: 'easy' | 'medium' | 'hard';
}

export interface PlayerStats {
  score: number;
  mass: number;
  length: number;
  kills: number;
  rank: number;
  totalSnakes: number;
  fps: number;
  activePowerUps: { type: PowerUpType; remainingMs: number }[];
}

export interface GameOverStats {
  score: number;
  kills: number;
  length: number;
  timeSurvivedSeconds: number;
  topRank: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public settings: GameSettings;

  public camera: Camera;
  public gameLoop: GameLoop;
  public foodManager: FoodManager;
  public botManager: BotManager;
  public particleSystem: ParticleSystem;
  public renderer: CanvasRenderer;

  public playerSnake: Snake | null = null;
  public allSnakes: Snake[] = [];
  public powerUps: PowerUp[] = [];
  public sessionConfig: ArenaSessionConfig = DEFAULT_SESSION_CONFIG;

  // Online Multiplayer State
  public isOnline: boolean = false;
  public networkClient: NetworkClient | null = null;
  public onlinePing: number = 0;

  // Spectator Mode State
  public isSpectating: boolean = false;
  public spectateTargetId: string | null = null;
  public onSpectateChange?: (target: Snake | null, isFreeCam: boolean) => void;

  private startTime: number = 0;
  private bestRankAchieved: number = 999;
  private nextPowerUpId: number = 1;
  private powerUpSpawnTimer: number = 0;
  private camTarget: Vector2D = new Vector2D(0, 0);

  // Callbacks for UI
  public onStatsUpdate?: (stats: PlayerStats) => void;
  public onLeaderboardUpdate?: (leaderboard: LeaderboardEntry[]) => void;
  public onGameOver?: (stats: GameOverStats) => void;
  public dpr: number = 1;

  constructor(canvas: HTMLCanvasElement, settings: GameSettings = DEFAULT_SETTINGS) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from canvas');
    this.ctx = ctx;
    this.settings = settings;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
    this.dpr = dpr;
    const cssW = typeof window !== 'undefined' ? window.innerWidth : canvas.width;
    const cssH = typeof window !== 'undefined' ? window.innerHeight : canvas.height;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);

    this.camera = new Camera(cssW, cssH);
    this.foodManager = new FoodManager();
    this.botManager = new BotManager();
    this.particleSystem = new ParticleSystem(settings.particles ? 300 : 0);
    this.renderer = new CanvasRenderer(this.ctx, settings);

    soundManager.setVolume(settings.soundVolume);
    soundManager.setMuted(settings.soundMuted);

    this.gameLoop = new GameLoop(
      (dt, ratio) => this.update(dt, ratio),
      () => this.render()
    );
  }

  updateSettings(settings: GameSettings): void {
    this.settings = settings;
    this.renderer.setSettings(settings);
    this.particleSystem.setMaxParticles(settings.particles ? 300 : 0);
    soundManager.setVolume(settings.soundVolume);
    soundManager.setMuted(settings.soundMuted);
  }

  resize(width: number, height: number, dpr?: number): void {
    const pixelRatio = dpr || (typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1);
    this.dpr = pixelRatio;
    this.canvas.width = Math.floor(width * pixelRatio);
    this.canvas.height = Math.floor(height * pixelRatio);
    this.camera.resize(width, height);
  }

  start(playerName?: string, skinId?: string, sessionConfig?: ArenaSessionConfig): void {
    const name = playerName || this.settings.playerName || 'Player 1';
    const skin = skinId || this.settings.selectedSkinId || 'emerald-dragon';
    if (sessionConfig) {
      this.sessionConfig = sessionConfig;
    }

    this.startTime = performance.now();
    this.bestRankAchieved = 999;
    this.powerUps = [];

    // Apply arena dimensions to renderer
    this.renderer.arenaRadius = this.sessionConfig.arenaRadius;

    // Initialize food according to session foodDensity
    const foodMultiplier =
      this.sessionConfig.foodDensity === 'low'
        ? 0.6
        : this.sessionConfig.foodDensity === 'rich'
        ? 1.5
        : 1.0;
    const foodCount = Math.round(GAME_CONFIG.MAX_FOOD_COUNT * foodMultiplier);
    this.foodManager.init(foodCount, this.sessionConfig.arenaRadius);

    // Spawn player at center of arena
    this.playerSnake = new Snake('player', name, 0, 0, skin, false);
    this.camera.position.set(0, 0);
    this.camera.target.set(0, 0);

    // Spawn initial bots according to session botCount and botDifficulty
    const bots = this.botManager.init(
      this.sessionConfig.botCount,
      { x: 0, y: 0 },
      this.sessionConfig.arenaRadius,
      this.sessionConfig.botDifficulty
    );
    this.allSnakes = [this.playerSnake, ...bots];

    // Initial power-up spawn (if enabled for this session)
    if (this.sessionConfig.enablePowerUps) {
      this.spawnInitialPowerUps();
    }

    this.isSpectating = false;
    this.spectateTargetId = null;
    this.gameLoop.start();
  }

  startOnlineSession(client: NetworkClient, isSpectator: boolean = false): void {
    this.stop();
    this.isOnline = true;
    this.networkClient = client;
    this.isSpectating = isSpectator;
    this.startTime = performance.now();
    this.bestRankAchieved = 999;
    this.powerUps = [];

    client.onPing = (ping) => {
      this.onlinePing = ping;
    };

    client.onInit = (data) => {
      this.renderer.arenaRadius = data.arenaRadius;
      this.sessionConfig = {
        ...this.sessionConfig,
        arenaRadius: data.arenaRadius,
        botDifficulty: data.roomId === 'hard' ? 'hard' : 'medium',
      };
      this.foodManager.foodItems.clear();

      for (const f of data.food) {
        this.foodManager.addFoodItem(f.id.toString(), f.x, f.y, f.v, f.t, f.c || undefined);
      }

      this.allSnakes = data.snakes.map((s) => {
        const snake = new Snake(s.id, s.name, s.x, s.y, s.skinId, s.isBot);
        snake.tier = s.tier === 'player' ? undefined : s.tier;
        snake.radius = s.radius;
        snake.mass = s.mass;
        snake.score = s.score;
        snake.kills = s.kills || 0;
        snake.angle = s.angle;
        snake.isBoosting = s.isBoosting;
        snake.spawnProtectionTimer = s.spawnProtection ? 3.0 : 0;
        if (s.isBot && s.aiState) {
          snake.aiBrain = {
            state: s.aiState,
            personality: { archetype: s.archetype || 'VIPER' },
          };
        }
        snake.segments = s.segs.map(([x, y]) => ({ x, y, radius: s.radius, angle: s.angle }));
        return snake;
      });

      if (!isSpectator && data.myId) {
        this.playerSnake = this.allSnakes.find((s) => s.id === data.myId) || null;
        if (this.playerSnake) {
          this.camera.position.set(this.playerSnake.position.x, this.playerSnake.position.y);
          this.camera.target.set(this.playerSnake.position.x, this.playerSnake.position.y);
        }
      } else {
        this.playerSnake = null;
        if (this.allSnakes.length > 0) {
          this.spectateSnake(this.allSnakes[0].id);
        } else {
          this.spectateFreeCam();
        }
      }

      this.gameLoop.start();
    };

    client.onTick = (data) => {
      for (const id of data.eaten) {
        this.foodManager.remove(id.toString());
      }
      for (const f of data.newFood) {
        this.foodManager.addFoodItem(f.id.toString(), f.x, f.y, f.v, f.t, f.c || undefined);
      }

      const serverSnakeIds = new Set<string>();
      for (const s of data.snakes) {
        serverSnakeIds.add(s.id);
        let localSnake = this.allSnakes.find((snake) => snake.id === s.id);
        if (!localSnake) {
          localSnake = new Snake(s.id, s.name, s.x, s.y, s.skinId, s.isBot);
          this.allSnakes.push(localSnake);
        }

        localSnake.position.set(s.x, s.y);
        localSnake.angle = s.angle;
        localSnake.radius = s.radius;
        localSnake.mass = s.mass;
        localSnake.score = s.score;
        localSnake.kills = s.kills || 0;
        localSnake.tier = s.tier === 'player' ? undefined : s.tier;
        localSnake.isBoosting = s.isBoosting;
        localSnake.spawnProtectionTimer = s.spawnProtection ? 3.0 : 0;
        if (s.isBot && s.aiState) {
          localSnake.aiBrain = {
            state: s.aiState,
            personality: { archetype: s.archetype || 'VIPER' },
          };
        }

        if (s.segs && s.segs.length > 0) {
          localSnake.segments = s.segs.map(([x, y]) => ({ x, y, radius: s.radius, angle: s.angle }));
        }
      }

      this.allSnakes = this.allSnakes.filter((s) => serverSnakeIds.has(s.id));

      if (!isSpectator && client.mySnakeId) {
        this.playerSnake = this.allSnakes.find((s) => s.id === client.mySnakeId) || null;
      }

      if (this.onLeaderboardUpdate && data.leaderboard) {
        this.onLeaderboardUpdate(data.leaderboard);
      }

      if (this.playerSnake && this.onStatsUpdate) {
        const sorted = [...this.allSnakes].sort((a, b) => b.score - a.score);
        const rank = sorted.findIndex((s) => s.id === this.playerSnake?.id) + 1;
        if (rank > 0 && rank < this.bestRankAchieved) {
          this.bestRankAchieved = rank;
        }
        this.onStatsUpdate({
          score: this.playerSnake.score,
          mass: this.playerSnake.mass,
          length: this.playerSnake.segments.length,
          kills: this.playerSnake.kills,
          rank: rank > 0 ? rank : 1,
          totalSnakes: this.allSnakes.length,
          fps: this.gameLoop.currentFps,
          activePowerUps: [],
        });
      }
    };

    client.onGameOver = (data) => {
      if (this.onGameOver) {
        this.onGameOver({
          score: data.stats.score,
          kills: data.stats.kills,
          length: data.stats.length,
          timeSurvivedSeconds: Math.floor((performance.now() - this.startTime) / 1000),
          topRank: this.bestRankAchieved === 999 ? 1 : this.bestRankAchieved,
        });
      }
    };
  }

  startSpectating(sessionConfig?: ArenaSessionConfig): void {
    if (sessionConfig) {
      this.sessionConfig = sessionConfig;
    }
    this.isSpectating = true;
    this.playerSnake = null;
    this.startTime = performance.now();
    this.bestRankAchieved = 999;
    this.powerUps = [];

    // Apply arena dimensions to renderer
    this.renderer.arenaRadius = this.sessionConfig.arenaRadius;

    // Initialize food according to session foodDensity
    const foodMultiplier =
      this.sessionConfig.foodDensity === 'low'
        ? 0.6
        : this.sessionConfig.foodDensity === 'rich'
        ? 1.5
        : 1.0;
    const foodCount = Math.round(GAME_CONFIG.MAX_FOOD_COUNT * foodMultiplier);
    this.foodManager.init(foodCount, this.sessionConfig.arenaRadius);

    // Initial bots
    const bots = this.botManager.init(
      this.sessionConfig.botCount,
      { x: 0, y: 0 },
      this.sessionConfig.arenaRadius,
      this.sessionConfig.botDifficulty
    );
    this.allSnakes = [...bots];

    // Initial power-up spawn (if enabled for this session)
    if (this.sessionConfig.enablePowerUps) {
      this.spawnInitialPowerUps();
    }

    // Default spectator target: #1 bot
    if (bots.length > 0) {
      this.spectateSnake(bots[0].id);
    } else {
      this.spectateFreeCam();
    }

    this.gameLoop.start();
  }

  switchToSpectator(): void {
    this.isSpectating = true;
    this.playerSnake = null;
    const living = this.allSnakes.filter((s) => !s.isDead);
    if (living.length > 0) {
      const top = [...living].sort((a, b) => b.score - a.score)[0];
      this.spectateSnake(top.id);
    } else {
      this.spectateFreeCam();
    }
    if (!this.gameLoop.isRunning) {
      this.gameLoop.start();
    }
  }

  joinArenaAsPlayer(playerName?: string, skinId?: string): void {
    const name = playerName || this.settings.playerName || 'Player 1';
    const skin = skinId || this.settings.selectedSkinId || 'emerald-dragon';

    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = (Math.random() * 0.4 + 0.1) * this.sessionConfig.arenaRadius;
    const spawnX = Math.cos(spawnAngle) * spawnDist;
    const spawnY = Math.sin(spawnAngle) * spawnDist;

    this.playerSnake = new Snake('player', name, spawnX, spawnY, skin, false);
    this.allSnakes.push(this.playerSnake);
    this.isSpectating = false;
    this.spectateTargetId = null;
    this.camera.isFreeCam = false;
    this.camera.position.set(spawnX, spawnY);
    this.camera.target.set(spawnX, spawnY);
    this.camera.setTargetZoom(GAME_CONFIG.BASE_ZOOM);
    this.onSpectateChange?.(this.playerSnake, false);
  }

  spectateSnake(snakeId: string): void {
    this.camera.isFreeCam = false;
    this.spectateTargetId = snakeId;
    const target = this.getSpectateTarget();
    if (target) {
      this.camera.setTarget(target.position);
    }
    this.onSpectateChange?.(target, false);
  }

  spectateFreeCam(): void {
    this.camera.isFreeCam = true;
    this.spectateTargetId = null;
    this.onSpectateChange?.(null, true);
  }

  toggleFreeCam(): void {
    if (this.camera.isFreeCam) {
      const living = this.allSnakes.filter((s) => !s.isDead);
      if (living.length > 0) {
        const top = [...living].sort((a, b) => b.score - a.score)[0];
        this.spectateSnake(top.id);
      }
    } else {
      this.spectateFreeCam();
    }
  }

  cycleSpectator(dir: 1 | -1): void {
    const living = this.allSnakes.filter((s) => !s.isDead);
    if (living.length === 0) {
      this.spectateFreeCam();
      return;
    }

    let currentIndex = living.findIndex((s) => s.id === this.spectateTargetId);
    if (currentIndex === -1) {
      currentIndex = 0;
    } else {
      currentIndex = (currentIndex + dir + living.length) % living.length;
    }
    this.spectateSnake(living[currentIndex].id);
  }

  getSpectateTarget(): Snake | null {
    if (!this.spectateTargetId) return null;
    return this.allSnakes.find((s) => s.id === this.spectateTargetId && !s.isDead) || null;
  }

  stop(): void {
    this.gameLoop.stop();
    soundManager.stopBoost();
    if (this.networkClient) {
      this.networkClient.disconnect();
      this.networkClient = null;
    }
    this.isOnline = false;
  }

  private spawnInitialPowerUps(): void {
    const types: PowerUpType[] = ['magnet', 'multiplier', 'turbo', 'ghost'];
    for (let i = 0; i < GAME_CONFIG.POWERUP_COUNT; i++) {
      const type = types[i % types.length];
      const r = Math.sqrt(Math.random()) * (this.sessionConfig.arenaRadius - 300);
      const theta = Math.random() * Math.PI * 2;
      this.powerUps.push(
        new PowerUp(
          `pu_${this.nextPowerUpId++}`,
          Math.cos(theta) * r,
          Math.sin(theta) * r,
          type
        )
      );
    }
  }

  // Input Handlers
  setMouseTarget(screenX: number, screenY: number): void {
    if (!this.playerSnake || this.playerSnake.isDead) return;
    const worldPos = this.camera.screenToWorld(screenX, screenY);
    this.playerSnake.setTargetDirection(worldPos.x, worldPos.y);
  }

  setPlayerAngle(angle: number): void {
    if (!this.playerSnake || this.playerSnake.isDead) return;
    this.playerSnake.setTargetAngle(angle);
  }

  setPlayerBoosting(boosting: boolean): void {
    if (!this.playerSnake || this.playerSnake.isDead) return;
    if (this.playerSnake.isBoosting !== boosting) {
      this.playerSnake.isBoosting = boosting;
      if (boosting) {
        soundManager.startBoost();
      } else {
        soundManager.stopBoost();
      }
    }
  }

  private update(dt: number, deltaRatio: number): void {
    if (this.isOnline) {
      if (this.playerSnake && !this.playerSnake.isDead) {
        this.networkClient?.sendInput(this.playerSnake.targetAngle, this.playerSnake.isBoosting);
        this.camera.setTarget(this.playerSnake.position);
      } else if (this.isSpectating && !this.camera.isFreeCam) {
        const target = this.getSpectateTarget();
        if (target && !target.isDead) {
          this.camera.setTarget(target.position);
        }
      }

      this.foodManager.update(deltaRatio);
      if (this.settings.particles) {
        this.particleSystem.update(dt, deltaRatio);
      }
      this.camera.update(deltaRatio);
      return;
    }

    const player = this.playerSnake;

    // 1. Update Food System
    this.foodManager.update(deltaRatio);

    // 2. Update Power-ups (if enabled for this session)
    if (this.sessionConfig.enablePowerUps) {
      for (const p of this.powerUps) {
        p.update(deltaRatio);
      }

      // Periodically spawn power-ups if below count
      this.powerUpSpawnTimer += dt;
      if (this.powerUpSpawnTimer > 5 && this.powerUps.length < GAME_CONFIG.POWERUP_COUNT) {
        this.powerUpSpawnTimer = 0;
        const types: PowerUpType[] = ['magnet', 'multiplier', 'turbo', 'ghost'];
        const type = types[Math.floor(Math.random() * types.length)];
        const r = Math.sqrt(Math.random()) * (this.sessionConfig.arenaRadius - 300);
        const theta = Math.random() * Math.PI * 2;
        this.powerUps.push(
          new PowerUp(
            `pu_${this.nextPowerUpId++}`,
            Math.cos(theta) * r,
            Math.sin(theta) * r,
            type
          )
        );
      }
    }

    // 3. Update Bots AI & Respawn
    const newBots = this.botManager.update(
      dt,
      deltaRatio,
      this.allSnakes,
      this.foodManager,
      this.powerUps,
      player && !player.isDead ? player.position : undefined,
      this.sessionConfig.selfCollision
    );
    if (newBots.length > 0) {
      this.allSnakes.push(...newBots);
    }

    // 4. Update All Snakes
    const dropPellet = (x: number, y: number, color: string) => {
      this.foodManager.spawnBoostPellet(x, y, color);
      if (this.settings.particles) {
        this.particleSystem.emitBoostTrail(x, y, color);
      }
    };

    for (const snake of this.allSnakes) {
      if (snake.isDead) continue;
      snake.update(deltaRatio, dropPellet);
    }

    // 5. Collision & Interactions
    this.checkFoodInteractions();
    this.checkPowerUpInteractions();
    this.checkBoundaryCollisions();
    this.checkSnakeCollisions();

    // 6. Clean up dead snakes
    this.allSnakes = this.allSnakes.filter((s) => !s.isDead);

    // 7. Update Camera (Authentic Slither.io Camera Distance & Head Centering)
    if (this.isSpectating) {
      if (!this.camera.isFreeCam) {
        const target = this.getSpectateTarget();
        if (target && !target.isDead) {
          const forwardLead = target.radius * (target.isBoosting ? 0.6 : 0.35);
          this.camTarget.set(
            target.position.x + Math.cos(target.angle) * forwardLead,
            target.position.y + Math.sin(target.angle) * forwardLead
          );
          this.camera.setTarget(this.camTarget);

          const massRatio = Math.max(0, (target.mass - GAME_CONFIG.BASE_MASS) / 2000);
          const growthZoom = 1 / Math.pow(1 + massRatio, 0.36);
          const vH = this.camera.viewportHeight || 900;
          const responsiveScale = Math.min(1.15, Math.max(0.78, vH / 900));
          this.camera.setTargetZoom(Math.max(GAME_CONFIG.MIN_ZOOM, GAME_CONFIG.BASE_ZOOM * responsiveScale * growthZoom));
        } else {
          // If spectated snake died or missing, auto-lock to next living snake
          const living = this.allSnakes.filter((s) => !s.isDead);
          if (living.length > 0) {
            const top = [...living].sort((a, b) => b.score - a.score)[0];
            this.spectateSnake(top.id);
          } else {
            this.spectateFreeCam();
          }
        }
      }
    } else if (player && !player.isDead) {
      // Slither.io authentic head centering: targets center of head with smooth forward lead
      const forwardLead = player.radius * (player.isBoosting ? 0.65 : 0.38);
      this.camTarget.set(
        player.position.x + Math.cos(player.angle) * forwardLead,
        player.position.y + Math.sin(player.angle) * forwardLead
      );
      this.camera.setTarget(this.camTarget);

      // Slither.io authentic camera distance & smooth logarithmic pullback as mass grows
      const massRatio = Math.max(0, (player.mass - GAME_CONFIG.BASE_MASS) / 2000);
      const growthZoom = 1 / Math.pow(1 + massRatio, 0.36);

      // Viewport-aware scaling: guarantees consistent Slither.io arena perspective across mobile and desktop
      const vH = this.camera.viewportHeight || 900;
      const responsiveScale = Math.min(1.15, Math.max(0.78, vH / 900));
      const slitherBase = GAME_CONFIG.BASE_ZOOM * responsiveScale;

      // Dynamic FOV expansion during high-speed boost (Slither.io boost feel)
      const boostFov = player.isBoosting ? 0.94 : 1.0;

      const targetZoom = Math.max(
        GAME_CONFIG.MIN_ZOOM,
        slitherBase * growthZoom * boostFov
      );
      this.camera.setTargetZoom(targetZoom);
    }
    this.camera.update(deltaRatio);

    // 8. Update Particles
    if (this.settings.particles) {
      this.particleSystem.update(dt, deltaRatio);
    }

    // 9. Dispatch UI Updates (Leaderboard & Stats)
    this.dispatchUIUpdates();
  }

  // Food Eating & Magnetic Pull
  private checkFoodInteractions(): void {
    for (const snake of this.allSnakes) {
      if (snake.isDead) continue;

      const head = snake.position;
      const hasMagnet = snake.hasPowerUp('magnet');
      // Natural suction & eating radius scales generously with snake size
      const naturalSuction = GAME_CONFIG.EAT_MAGNET_RADIUS_BASE + snake.radius * 2.8;
      const magnetRadius = hasMagnet ? naturalSuction * 2.8 + 140 : naturalSuction;
      const eatRadius = snake.radius * 1.35 + 8;

      const nearbyItems = this.foodManager.spatialGrid.queryRadius(head.x, head.y, magnetRadius);

      for (const item of nearbyItems) {
        const food = item.data;
        if (!food) continue;

        const dist = head.dist(food.position);

        // Within eating range
        if (dist <= eatRadius + food.radius) {
          snake.eatFood(food.value);
          this.foodManager.remove(food.id);

          if (!snake.isBot) {
            soundManager.playEat();
          }

          if (this.settings.particles && (food.type === 'super' || !snake.isBot)) {
            this.particleSystem.emitBurst(food.position.x, food.position.y, food.color, 4, 0.4);
          }
        } else if (dist <= magnetRadius) {
          // Attract towards head
          food.attractTowards(head.x, head.y, hasMagnet ? 2.5 : 1.2);
        }
      }
    }
  }

  // Power-up Pickups
  private checkPowerUpInteractions(): void {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];

      for (const snake of this.allSnakes) {
        if (snake.isDead) continue;

        const dist = snake.position.dist(p.position);
        if (dist <= snake.radius + p.radius) {
          // Collected!
          snake.applyPowerUp(p.type, POWERUP_CONFIGS[p.type].duration);
          this.powerUps.splice(i, 1);

          if (!snake.isBot) {
            soundManager.playPowerUp();
            this.camera.shake(6);
          }

          if (this.settings.particles) {
            this.particleSystem.emitBurst(p.position.x, p.position.y, POWERUP_CONFIGS[p.type].color, 25, 1.2);
          }
          break;
        }
      }
    }
  }

  // Boundary Collisions
  private checkBoundaryCollisions(): void {
    for (const snake of this.allSnakes) {
      if (snake.isDead) continue;

      const dist = snake.position.mag();
      if (dist >= this.sessionConfig.arenaRadius) {
        this.killSnake(snake, null);
      }
    }
  }

  // Snake Head-to-Body Lethal Collisions
  private checkSnakeCollisions(): void {
    for (const snake of this.allSnakes) {
      if (snake.isDead) continue;
      if (snake.hasPowerUp('ghost')) continue; // Ghost phase immune to collisions!
      if (snake.hasSpawnProtection) continue; // Spawn protection: immune to dying for 3 seconds

      const head = snake.position;
      const headHitRadius = snake.radius * GAME_CONFIG.HEAD_COLLISION_RADIUS_FACTOR;

      for (const other of this.allSnakes) {
        if (other.isDead) continue;
        if (other.hasSpawnProtection) continue; // Spawn protection: cannot kill others for 3 seconds

        // By default, allow crossing own body (Slither.io style).
        // If selfCollision session rule is enabled (Classic Snake mode), biting own body is lethal.
        if (other.id === snake.id && !this.sessionConfig.selfCollision) continue;

        // Skip collision with own head and first few segments when self-collision is enabled
        const segmentsToCheck = other.id === snake.id
          ? other.segments.slice(10) // Self-collision only for large snakes
          : other.segments;

        for (let i = 0; i < segmentsToCheck.length; i++) {
          const seg = segmentsToCheck[i];
          const dx = head.x - seg.x;
          const dy = head.y - seg.y;
          const hitDist = headHitRadius + seg.radius * GAME_CONFIG.BODY_COLLISION_RADIUS_FACTOR;

          if (dx * dx + dy * dy < hitDist * hitDist) {
            // Lethal collision! snake dies
            this.killSnake(snake, other);
            break;
          }
        }

        if (snake.isDead) break;
      }
    }
  }

  private killSnake(victim: Snake, killer: Snake | null): void {
    if (victim.isDead) return;
    victim.isDead = true;

    // Reward killer
    if (killer && killer.id !== victim.id) {
      killer.kills++;
      if (!killer.isBot) {
        soundManager.playKill();
        this.camera.shake(10);
      }
    }

    // Convert corpse into food pellets
    this.foodManager.spawnCorpsePellets(
      victim.segments.map((s) => ({ x: s.x, y: s.y })),
      victim.skin.headColor,
      victim.mass
    );

    // Calculate geometric midpoint of corpse trail for accurate feasting
    const midIdx = Math.floor(victim.segments.length / 2);
    const corpseCenterX = victim.segments[midIdx]?.x ?? victim.position.x;
    const corpseCenterY = victim.segments[midIdx]?.y ?? victim.position.y;

    // Notify killer & nearby bots to feast on corpse pellets
    this.botManager.notifyDeathEvent(corpseCenterX, corpseCenterY, victim.mass, killer?.id);

    // Particle explosion
    if (this.settings.particles) {
      this.particleSystem.emitBurst(victim.position.x, victim.position.y, victim.skin.headColor, 35, 1.5);
    }

    // If spectating this victim, switch camera to killer (if alive) or next top snake
    if (this.isSpectating && this.spectateTargetId === victim.id) {
      if (killer && !killer.isDead && killer.id !== victim.id) {
        this.spectateSnake(killer.id);
      } else {
        const nextLiving = this.allSnakes.filter((s) => !s.isDead && s.id !== victim.id);
        if (nextLiving.length > 0) {
          const top = [...nextLiving].sort((a, b) => b.score - a.score)[0];
          this.spectateSnake(top.id);
        }
      }
    }

    // If player died
    if (victim.id === 'player') {
      soundManager.stopBoost();
      soundManager.playDeath();
      if (this.settings.screenShake) {
        this.camera.shake(18);
      }

      const timeSurvived = Math.round((performance.now() - this.startTime) / 1000);
      if (this.onGameOver) {
        this.onGameOver({
          score: victim.score,
          kills: victim.kills,
          length: victim.segments.length,
          timeSurvivedSeconds: timeSurvived,
          topRank: this.bestRankAchieved,
        });
      }
    }
  }

  private dispatchUIUpdates(): void {
    // 1. Sort Leaderboard
    const sorted = [...this.allSnakes].sort((a, b) => b.score - a.score);
    const top10: LeaderboardEntry[] = sorted.slice(0, 10).map((s) => ({
      id: s.id,
      name: s.name,
      score: s.score,
      isPlayer: !s.isBot,
      tier: s.tier,
    }));

    if (this.onLeaderboardUpdate) {
      this.onLeaderboardUpdate(top10);
    }

    // 2. Player or Spectated Snake Stats
    const focusedSnake = this.isSpectating ? this.getSpectateTarget() : this.playerSnake;
    if (focusedSnake && this.onStatsUpdate) {
      const snakeRank = sorted.findIndex((s) => s.id === focusedSnake.id) + 1;
      if (!this.isSpectating && snakeRank > 0 && snakeRank < this.bestRankAchieved) {
        this.bestRankAchieved = snakeRank;
      }

      const activePUs: { type: PowerUpType; remainingMs: number }[] = [];
      const types: PowerUpType[] = ['magnet', 'multiplier', 'turbo', 'ghost'];
      types.forEach((t) => {
        const rem = focusedSnake.getPowerUpRemaining(t);
        if (rem > 0) {
          activePUs.push({ type: t, remainingMs: rem });
        }
      });

      this.onStatsUpdate({
        score: focusedSnake.score,
        mass: Math.round(focusedSnake.mass),
        length: focusedSnake.segments.length,
        kills: focusedSnake.kills,
        rank: snakeRank > 0 ? snakeRank : sorted.length + 1,
        totalSnakes: this.allSnakes.length,
        fps: this.gameLoop.currentFps,
        activePowerUps: activePUs,
      });
    } else if (this.isSpectating && this.onStatsUpdate) {
      // Free cam: show general arena metrics
      this.onStatsUpdate({
        score: 0,
        mass: 0,
        length: 0,
        kills: 0,
        rank: 0,
        totalSnakes: this.allSnakes.length,
        fps: this.gameLoop.currentFps,
        activePowerUps: [],
      });
    }
  }

  private render(): void {
    this.renderer.renderScene(
      this.camera,
      this.allSnakes,
      this.foodManager,
      this.powerUps,
      this.particleSystem,
      this.playerSnake,
      this.dpr
    );
  }
}
