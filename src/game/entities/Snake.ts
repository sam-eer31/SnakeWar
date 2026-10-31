import { Vector2D } from '../core/Vector2D';
import { GAME_CONFIG } from '../config/constants';
import { SnakeSkin, SKINS } from '../config/skins';
import { PowerUpType } from './PowerUp';

export interface BodySegment {
  x: number;
  y: number;
  radius: number;
  angle: number;
}

export class Snake {
  public id: string;
  public name: string;
  public isBot: boolean;
  public tier?: 'easy' | 'medium' | 'hard';
  public turnSpeedMultiplier: number = 1.0;
  public aiBrain?: any;
  public skin: SnakeSkin;

  // Transform
  public position: Vector2D;
  public angle: number = 0;
  public targetAngle: number = 0;
  public speed: number = GAME_CONFIG.BASE_SPEED;

  // Body
  public segments: BodySegment[] = [];
  public targetLength: number = GAME_CONFIG.INITIAL_SNAKE_LENGTH;
  public radius: number = GAME_CONFIG.INITIAL_RADIUS;
  public mass: number = GAME_CONFIG.BASE_MASS;
  public score: number = 0;

  // States
  public isBoosting: boolean = false;
  public isDead: boolean = false;
  public kills: number = 0;
  private boostCounter: number = 0;

  // 3-second spawn invulnerability & no-kill shield
  public spawnProtectionTimer: number = 3.0;

  get hasSpawnProtection(): boolean {
    return this.spawnProtectionTimer > 0;
  }

  // Active Power-ups (store expiration timestamps)
  public activePowerUps: Map<PowerUpType, number> = new Map();

  // Wiggle effect for realistic slither
  public wiggleTimer: number = Math.random() * 100;

  // Realistic forked tongue flick timer
  public tongueTimer: number = Math.random() * 3.5;

  constructor(
    id: string,
    name: string,
    x: number,
    y: number,
    skinId: string = 'cyber-neon',
    isBot: boolean = false
  ) {
    this.id = id;
    this.name = name;
    this.isBot = isBot;
    this.skin = SKINS.find((s) => s.id === skinId) || SKINS[0];
    this.position = new Vector2D(x, y);
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.score = Math.floor(this.mass);

    // Initialize segments behind head
    const initialDir = Vector2D.fromAngle(this.angle + Math.PI, GAME_CONFIG.SEGMENT_DISTANCE);
    for (let i = 0; i < GAME_CONFIG.INITIAL_SNAKE_LENGTH; i++) {
      this.segments.push({
        x: x + initialDir.x * i,
        y: y + initialDir.y * i,
        radius: this.radius,
        angle: this.angle,
      });
    }
  }

  hasPowerUp(type: PowerUpType): boolean {
    const exp = this.activePowerUps.get(type);
    return !!exp && exp > performance.now();
  }

  getPowerUpRemaining(type: PowerUpType): number {
    const exp = this.activePowerUps.get(type);
    if (!exp) return 0;
    return Math.max(0, exp - performance.now());
  }

  applyPowerUp(type: PowerUpType, duration: number): void {
    const now = performance.now();
    const current = this.activePowerUps.get(type) || now;
    this.activePowerUps.set(type, Math.max(now, current) + duration);
  }

  setTargetDirection(targetX: number, targetY: number): void {
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    this.targetAngle = Math.atan2(dy, dx);
  }

  setTargetAngle(angle: number): void {
    this.targetAngle = angle;
  }

  eatFood(value: number): void {
    const multiplier = this.hasPowerUp('multiplier') ? 2 : 1;
    const gainedMass = value * multiplier;
    this.mass += gainedMass;
    this.score = Math.floor(this.mass);

    // Standard Slither.io sub-linear growth formulas
    const massDelta = Math.max(0, this.mass - GAME_CONFIG.BASE_MASS);
    this.targetLength = Math.floor(
      GAME_CONFIG.INITIAL_SNAKE_LENGTH + Math.pow(massDelta, 0.58) * 1.05
    );

    this.radius = Math.min(
      GAME_CONFIG.MAX_RADIUS,
      GAME_CONFIG.INITIAL_RADIUS + Math.pow(massDelta, 0.36) * 0.9
    );
  }

  update(deltaRatio: number, onDropPellet?: (x: number, y: number, color: string) => void): void {
    if (this.isDead) return;

    // Decay spawn protection timer
    if (this.spawnProtectionTimer > 0) {
      this.spawnProtectionTimer -= (deltaRatio / 60);
      if (this.spawnProtectionTimer < 0) {
        this.spawnProtectionTimer = 0;
      }
    }

    // Clean up expired powerups
    const now = performance.now();
    for (const [type, exp] of this.activePowerUps.entries()) {
      if (exp <= now) {
        this.activePowerUps.delete(type);
      }
    }

    const hasTurbo = this.hasPowerUp('turbo');

    // Turn rate smoothly scales with mass and bot agility multiplier
    const baseTurn = GAME_CONFIG.BASE_TURN_SPEED * this.turnSpeedMultiplier;
    const turnRate = Math.max(
      GAME_CONFIG.MIN_TURN_SPEED,
      baseTurn - (this.radius / GAME_CONFIG.MAX_RADIUS) * 0.04
    );

    // Calculate shortest angular difference
    let diff = this.targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    const maxTurn = turnRate * deltaRatio;
    if (Math.abs(diff) < maxTurn) {
      this.angle = this.targetAngle;
    } else {
      this.angle += Math.sign(diff) * maxTurn;
    }

    // Boost calculation
    let effectiveSpeed = GAME_CONFIG.BASE_SPEED;
    if (this.isBoosting || hasTurbo) {
      if (hasTurbo || this.mass > GAME_CONFIG.BOOST_MIN_MASS) {
        effectiveSpeed *= GAME_CONFIG.BOOST_SPEED_MULTIPLIER;

        if (!hasTurbo) {
          // Lose mass when boosting
          this.mass -= GAME_CONFIG.BOOST_MASS_LOSS_RATE * deltaRatio;
          if (this.mass < GAME_CONFIG.BOOST_MIN_MASS) {
            this.mass = GAME_CONFIG.BOOST_MIN_MASS;
            this.isBoosting = false;
          }
          this.score = Math.floor(this.mass);

          // Recalculate target length and radius
          const massDelta = Math.max(0, this.mass - GAME_CONFIG.BASE_MASS);
          this.targetLength = Math.max(
            GAME_CONFIG.INITIAL_SNAKE_LENGTH,
            Math.floor(GAME_CONFIG.INITIAL_SNAKE_LENGTH + Math.pow(massDelta, 0.58) * 1.05)
          );
          this.radius = Math.min(
            GAME_CONFIG.MAX_RADIUS,
            GAME_CONFIG.INITIAL_RADIUS + Math.pow(massDelta, 0.36) * 0.9
          );

          // Drop food remnant behind the tail
          this.boostCounter += deltaRatio;
          if (this.boostCounter >= GAME_CONFIG.BOOST_DROP_INTERVAL) {
            this.boostCounter = 0;
            if (this.segments.length > 0 && onDropPellet) {
              const tail = this.segments[this.segments.length - 1];
              onDropPellet(tail.x, tail.y, this.skin.headColor);
            }
          }
        }
      } else {
        this.isBoosting = false;
      }
    }

    this.speed = effectiveSpeed;

    // Advance head with subtle natural slithering wave
    this.wiggleTimer += 0.25 * (this.speed / GAME_CONFIG.BASE_SPEED) * deltaRatio;
    const waveOffset = Math.sin(this.wiggleTimer) * 0.04;
    const moveAngle = this.angle + waveOffset;

    // Advance tongue flick animation timer (flicks every 3-4s for ~0.45s)
    this.tongueTimer += (deltaRatio / 60);
    if (this.tongueTimer > 4.2) {
      this.tongueTimer = Math.random() * 0.8;
    }

    const velocity = Vector2D.fromAngle(moveAngle, this.speed * deltaRatio);
    this.position.addMut(velocity);

    // Update segments with distance constraint solver
    if (this.segments.length === 0) {
      this.segments.push({
        x: this.position.x,
        y: this.position.y,
        radius: this.radius,
        angle: this.angle,
      });
    }

    // Head segment follows head position
    const segDist = Math.max(
      5,
      Math.min(11, GAME_CONFIG.SEGMENT_DISTANCE * Math.pow(this.radius / GAME_CONFIG.INITIAL_RADIUS, 0.35))
    );
    let prevX = this.position.x;
    let prevY = this.position.y;

    const segCount = this.segments.length;
    for (let i = 0; i < segCount; i++) {
      const seg = this.segments[i];
      const dx = seg.x - prevX;
      const dy = seg.y - prevY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > segDist) {
        const factor = segDist / dist;
        seg.x = prevX + dx * factor;
        seg.y = prevY + dy * factor;
      }

      // Segment angle points to previous segment
      seg.angle = Math.atan2(prevY - seg.y, prevX - seg.x);

      // Anatomically realistic serpentine taper profile:
      // - Neck (first 6%): subtle narrowing (0.86x) right behind the broad viper skull
      // - Body (6% to 60%): full muscular girth (1.0x)
      // - Tail (60% to 100%): smooth cosine curve tapering down to an elegant fine tip (0.12x)
      const u = segCount > 1 ? i / (segCount - 1) : 0;
      let taper = 1.0;
      if (u < 0.06) {
        taper = 0.86 + 0.14 * (u / 0.06);
      } else if (u > 0.60) {
        const p = (u - 0.60) / 0.40;
        const cosP = Math.cos(p * Math.PI * 0.5);
        taper = 0.12 + 0.88 * (cosP * cosP);
      }
      seg.radius = Math.max(1.8, this.radius * taper);

      prevX = seg.x;
      prevY = seg.y;
    }

    // Grow segments smoothly if below target length
    if (this.segments.length < this.targetLength) {
      const last = this.segments[this.segments.length - 1];
      this.segments.push({
        x: last.x,
        y: last.y,
        radius: last.radius,
        angle: last.angle,
      });
    } else if (this.segments.length > this.targetLength && this.segments.length > GAME_CONFIG.INITIAL_SNAKE_LENGTH) {
      this.segments.pop();
    }
  }

  // Get current forked tongue animation state
  getTongueState(): { isOut: boolean; extension: number; flutter: number } {
    if (this.tongueTimer >= 3.0 && this.tongueTimer <= 3.55) {
      const t = (this.tongueTimer - 3.0) / 0.55; // 0 to 1
      const extension = Math.sin(t * Math.PI); // Smooth out-and-in extension curve
      const flutter = Math.sin(t * Math.PI * 6); // Rapid 3-cycle vibration
      return { isOut: true, extension, flutter };
    }
    return { isOut: false, extension: 0, flutter: 0 };
  }

  // Get eye positions for expressive head rendering (backward compatible)
  getEyePositions(): {
    leftEye: { x: number; y: number; pupilX: number; pupilY: number };
    rightEye: { x: number; y: number; pupilX: number; pupilY: number };
  } {
    const eyeForwardOffset = this.radius * 0.45;
    const eyeSideOffset = this.radius * 0.66;
    const eyeRadius = this.radius * 0.25;

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const perpCos = -sin;
    const perpSin = cos;

    // Left eye base (lateral left)
    const lx = this.position.x + cos * eyeForwardOffset + perpCos * eyeSideOffset;
    const ly = this.position.y + sin * eyeForwardOffset + perpSin * eyeSideOffset;

    // Right eye base (lateral right)
    const rx = this.position.x + cos * eyeForwardOffset - perpCos * eyeSideOffset;
    const ry = this.position.y + sin * eyeForwardOffset - perpSin * eyeSideOffset;

    // Pupils look slightly ahead in direction of movement
    const pupilDist = eyeRadius * 0.25;
    const pupilXOffset = cos * pupilDist;
    const pupilYOffset = sin * pupilDist;

    return {
      leftEye: {
        x: lx,
        y: ly,
        pupilX: lx + pupilXOffset,
        pupilY: ly + pupilYOffset,
      },
      rightEye: {
        x: rx,
        y: ry,
        pupilX: rx + pupilXOffset,
        pupilY: ry + pupilYOffset,
      },
    };
  }
}

