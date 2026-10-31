import { Snake } from '../entities/Snake';
import { Vector2D } from '../core/Vector2D';
import { FoodManager } from '../entities/FoodManager';
import { GAME_CONFIG } from '../config/constants';
import { SpatialHashGrid, SnakeSegmentData } from '../core/SpatialHashGrid';
import {
  BotState,
  BotTier,
  BotPersonality,
  ContextDecision,
} from './AITypes';
import { TacticalPlan } from './TacticalBehaviors';

const NUM_SLOTS = 32;
const SLOT_STEP = (Math.PI * 2) / NUM_SLOTS;

export type { ContextDecision };

export class ContextSteeringEngine {
  private danger: Float32Array = new Float32Array(NUM_SLOTS);
  private interest: Float32Array = new Float32Array(NUM_SLOTS);
  private slotMinHit: Float32Array = new Float32Array(NUM_SLOTS);
  private slotMinHitSelf: Float32Array = new Float32Array(NUM_SLOTS);
  private slotAngles: number[] = [];
  private cosAngles: Float32Array = new Float32Array(NUM_SLOTS);
  private sinAngles: Float32Array = new Float32Array(NUM_SLOTS);

  constructor() {
    for (let i = 0; i < NUM_SLOTS; i++) {
      const angle = i * SLOT_STEP;
      this.slotAngles.push(angle);
      this.cosAngles[i] = Math.cos(angle);
      this.sinAngles[i] = Math.sin(angle);
    }
  }

  evaluate(
    snake: Snake,
    state: BotState,
    tier: BotTier,
    personality: BotPersonality,
    tacticalPlan: TacticalPlan,
    otherSnakes: Snake[],
    foodManager: FoodManager,
    selfCollision: boolean,
    viewDist: number,
    segmentGrid?: SpatialHashGrid<SnakeSegmentData>
  ): ContextDecision {
    const head = snake.position;
    const currentAngle = snake.angle;
    const hasGhost = snake.hasPowerUp('ghost');
    const hasTurbo = snake.hasPowerUp('turbo');

    this.danger.fill(0);
    this.interest.fill(0);
    this.slotMinHit.fill(Infinity);
    this.slotMinHitSelf.fill(Infinity);

    const arenaRadius = foodManager.arenaRadius || GAME_CONFIG.ARENA_RADIUS;

    // Lookahead distance scaling based on tier and speed
    const lookAhead =
      tier === 'hard'
        ? Math.max(500, snake.radius * 9.5 + snake.speed * 32)
        : tier === 'medium'
        ? Math.max(400, snake.radius * 7.5 + snake.speed * 24)
        : Math.max(300, snake.radius * 6.0 + snake.speed * 18);

    // Physical turn radius calculation: determines if snake has room to turn
    const turnRate = Math.max(
      GAME_CONFIG.MIN_TURN_SPEED,
      GAME_CONFIG.BASE_TURN_SPEED * snake.turnSpeedMultiplier - (snake.radius / GAME_CONFIG.MAX_RADIUS) * 0.04
    );
    const currentSpeed = (snake.isBoosting || hasTurbo)
      ? snake.speed * GAME_CONFIG.BOOST_SPEED_MULTIPLIER
      : snake.speed;
    const turnRadius = currentSpeed / turnRate;
    const minTurnClearance = turnRadius + snake.radius + (tier === 'hard' ? 14 : 22);

    let minThreatDist = Infinity;

    // =========================================================================
    // 1. ARENA BOUNDARY AVOIDANCE (Continuous Ray-Circle Intersection)
    // =========================================================================
    const distFromCenter = head.mag();
    const effectiveArenaRadius = arenaRadius - snake.radius - 12;

    for (let i = 0; i < NUM_SLOTS; i++) {
      const cosA = this.cosAngles[i];
      const sinA = this.sinAngles[i];

      // Ray-circle intersection quadratic: |head + dir * t|^2 = R^2
      const b = 2 * (head.x * cosA + head.y * sinA);
      const c = (head.x * head.x + head.y * head.y) - effectiveArenaRadius * effectiveArenaRadius;
      const disc = b * b - 4 * c;

      if (disc >= 0) {
        const t = (-b + Math.sqrt(disc)) / 2;
        if (t > 0 && t < lookAhead) {
          if (t < this.slotMinHit[i]) {
            this.slotMinHit[i] = t;
          }
          if (t < minTurnClearance) {
            this.danger[i] = Math.max(this.danger[i], 1.0);
          } else {
            const wallDanger = Math.pow(Math.max(0, 1 - t / lookAhead), 1.5);
            this.danger[i] = Math.max(this.danger[i], wallDanger);
          }
        }
      }

      // If close to wall, penalize rays pointing directly outward
      if (distFromCenter > arenaRadius - 320) {
        const outwardDot = (head.x * cosA + head.y * sinA) / Math.max(1, distFromCenter);
        if (outwardDot > 0.15) {
          const outwardPen = 0.65 + outwardDot * 0.35;
          this.danger[i] = Math.max(this.danger[i], outwardPen);
        }
      }
    }

    // =========================================================================
    // 2. SNAKE BODIES OBSTACLE DETECTION (Exact Ray-Capsule Projections)
    // =========================================================================
    if (!hasGhost) {
      if (segmentGrid) {
        // Spatial hash accelerated segment obstacle perception: O(1) query of local cells
        const tierBaseMargin = tier === 'hard' ? 14 : tier === 'medium' ? 20 : 26;
        const queryRadius = lookAhead + snake.radius + GAME_CONFIG.MAX_RADIUS + 30;
        const nearbySegs = segmentGrid.queryRadius(head.x, head.y, queryRadius);

        for (let j = 0; j < nearbySegs.length; j++) {
          const item = nearbySegs[j].data;
          const other = item.snake;
          if (other.isDead || other.hasSpawnProtection) continue;

          const isSelf = other.id === snake.id;
          if (isSelf) {
            if (!selfCollision && (state === 'CIRCLE' || snake.segments.length < 18)) continue;
            const selfSkip = Math.max(18, Math.floor((snake.radius * 3.6) / GAME_CONFIG.SEGMENT_DISTANCE));
            if (item.segmentIndex < selfSkip) continue;
          }

          const safeDist = snake.radius + item.radius + (isSelf ? 10 : tierBaseMargin);
          const safeDistSq = safeDist * safeDist;
          const checkRangeSq = (lookAhead + safeDist) * (lookAhead + safeDist);

          const dx = item.x - head.x;
          const dy = item.y - head.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > checkRangeSq) continue;

          const directDist = Math.sqrt(distSq);
          if (directDist < minThreatDist && !isSelf) {
            minThreatDist = directDist;
          }

          for (let i = 0; i < NUM_SLOTS; i++) {
            const proj = dx * this.cosAngles[i] + dy * this.sinAngles[i];
            if (proj <= 0 || proj > lookAhead + safeDist) continue;

            const perpDistSq = distSq - proj * proj;
            if (perpDistSq >= safeDistSq) continue;

            const corridorHalfWidth = Math.sqrt(Math.max(0, safeDistSq - perpDistSq));
            const hitDist = Math.max(0, proj - corridorHalfWidth);

            if (isSelf && !selfCollision) {
              if (hitDist < this.slotMinHitSelf[i]) {
                this.slotMinHitSelf[i] = hitDist;
              }
            } else {
              if (hitDist < this.slotMinHit[i]) {
                this.slotMinHit[i] = hitDist;
              }
            }
          }
        }
      } else {
        for (const other of otherSnakes) {
          if (other.isDead || other.hasSpawnProtection) continue;
          const isSelf = other.id === snake.id;
          if (isSelf && (!selfCollision && (state === 'CIRCLE' || snake.segments.length < 18))) continue;

          // Bounding reach check: skip snake if entirely outside view
          if (!isSelf) {
            const maxReach = other.segments.length * GAME_CONFIG.SEGMENT_DISTANCE + 80;
            const maxDist = lookAhead + maxReach;
            const dxH = other.position.x - head.x;
            const dyH = other.position.y - head.y;
            if (dxH * dxH + dyH * dyH > maxDist * maxDist) continue;
          }

          // Self-collision skip: ignore neck segments so normal turning doesn't flag own body
          const selfSkip = isSelf
            ? Math.max(18, Math.floor((snake.radius * 3.6) / GAME_CONFIG.SEGMENT_DISTANCE))
            : 0;

          // Subsample segments based on distance for silky 120fps performance
          const dxO = other.position.x - head.x;
          const dyO = other.position.y - head.y;
          const otherDistSq = dxO * dxO + dyO * dyO;
          const step = otherDistSq > 250 * 250 ? (tier === 'hard' ? 2 : 3) : 1;

          const tierBaseMargin = tier === 'hard' ? 14 : tier === 'medium' ? 20 : 26;
          const safeDist = snake.radius + (other.radius || snake.radius) + (isSelf ? 10 : tierBaseMargin);
          const safeDistSq = safeDist * safeDist;
          const checkRangeSq = (lookAhead + safeDist) * (lookAhead + safeDist);

          const segs = other.segments;
          for (let s = selfSkip; s < segs.length; s += step) {
            const seg = segs[s];
            const dx = seg.x - head.x;
            const dy = seg.y - head.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > checkRangeSq) continue;

            const directDist = Math.sqrt(distSq);
            if (directDist < minThreatDist && !isSelf) {
              minThreatDist = directDist;
            }

            for (let i = 0; i < NUM_SLOTS; i++) {
              const proj = dx * this.cosAngles[i] + dy * this.sinAngles[i];
              if (proj <= 0 || proj > lookAhead + safeDist) continue;

              const perpDistSq = distSq - proj * proj;
              if (perpDistSq >= safeDistSq) continue;

              const corridorHalfWidth = Math.sqrt(Math.max(0, safeDistSq - perpDistSq));
              const hitDist = Math.max(0, proj - corridorHalfWidth);

              if (isSelf && !selfCollision) {
                if (hitDist < this.slotMinHitSelf[i]) {
                  this.slotMinHitSelf[i] = hitDist;
                }
              } else {
                if (hitDist < this.slotMinHit[i]) {
                  this.slotMinHit[i] = hitDist;
                }
              }
            }
          }
        }
      }

      // Convert slotMinHit into continuous danger
      for (let i = 0; i < NUM_SLOTS; i++) {
        const hitD = this.slotMinHit[i];
        if (hitD < lookAhead) {
          if (hitD < minTurnClearance) {
            this.danger[i] = Math.max(this.danger[i], 1.0);
          } else {
            const dFactor = Math.pow(Math.max(0, 1 - hitD / lookAhead), 1.5);
            this.danger[i] = Math.max(this.danger[i], dFactor);
          }
        }

        // Soft avoidance for own tail / body: prevents self-reinforcing donut loops
        const hitSelf = this.slotMinHitSelf[i];
        if (hitSelf < lookAhead * 0.75 && state !== 'CIRCLE') {
          const selfFactor = Math.pow(Math.max(0, 1 - hitSelf / (lookAhead * 0.75)), 1.3) * 0.65;
          this.danger[i] = Math.max(this.danger[i], selfFactor);
        }
      }

      // Turn-Arc Frontal Drift Protection:
      // If immediate forward trajectory is blocked within turn clearance,
      // penalize forward slots so snake immediately initiates a hard flank turn
      for (let i = 0; i < NUM_SLOTS; i++) {
        let diff = Math.abs(this.slotAngles[i] - currentAngle);
        while (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < Math.PI * 0.22) {
          if (this.slotMinHit[i] < minTurnClearance * 1.35) {
            this.danger[i] = Math.max(this.danger[i], 0.95);
          }
        }
      }

      // Anticipate enemy snake heads
      for (const other of otherSnakes) {
        if (other.id === snake.id || other.isDead || other.hasSpawnProtection) continue;
        const dHead = head.dist(other.position);
        if (dHead < 450) {
          const otherSpeed = other.isBoosting ? other.speed * 1.85 : other.speed;
          const otherFuture = other.position.add(Vector2D.fromAngle(other.angle, otherSpeed * 18));
          const dx = otherFuture.x - head.x;
          const dy = otherFuture.y - head.y;
          const distSq = dx * dx + dy * dy;
          const headSafeDist = snake.radius + other.radius + 38;
          const headSafeDistSq = headSafeDist * headSafeDist;

          for (let i = 0; i < NUM_SLOTS; i++) {
            const proj = dx * this.cosAngles[i] + dy * this.sinAngles[i];
            if (proj <= 0 || proj > lookAhead) continue;
            const perpSq = distSq - proj * proj;
            if (perpSq < headSafeDistSq) {
              this.danger[i] = Math.max(this.danger[i], 0.95);
            }
          }
        }
      }
    }

    // Gaussian Danger Bleed (smooths slots so tight gaps aren't treated as open highways)
    const blurredDanger = new Float32Array(NUM_SLOTS);
    for (let i = 0; i < NUM_SLOTS; i++) {
      const prev = (i - 1 + NUM_SLOTS) % NUM_SLOTS;
      const next = (i + 1) % NUM_SLOTS;
      blurredDanger[i] = Math.max(
        this.danger[i],
        this.danger[prev] * 0.35,
        this.danger[next] * 0.35
      );
    }
    this.danger.set(blurredDanger);

    // =========================================================================
    // 3. INTEREST MAP: TACTICAL TARGETING & HUMAN MOMENTUM
    // =========================================================================
    // A. Tactical Plan Target Arc
    const planAngle = tacticalPlan.targetAngle;
    const planWeight =
      state === 'SURVIVE' ? 3.8 :
      state === 'ESCAPE' ? 3.2 :
      state === 'INTERCEPT' ? 2.8 :
      state === 'CIRCLE' ? 2.4 :
      state === 'COLLECT_FOOD' ? 2.6 :
      state === 'EVADE' ? 2.8 :
      state === 'HUNT' ? 2.2 : 1.5;

    this.paintInterestArc(planAngle, planWeight, 4);

    // B. Forward Momentum Persistence (creates smooth human-like slithering arcs)
    const momentumWeight =
      state === 'SURVIVE' || state === 'EVADE' ? 0.15 :
      tier === 'hard' ? 0.65 : tier === 'medium' ? 0.55 : 0.45;
    this.paintInterestArc(currentAngle, momentumWeight, 3);

    // =========================================================================
    // 4. RESOLUTION: SCORE COMBINATION & EMERGENCY OVERRIDE
    // =========================================================================
    let bestSlot = 0;
    let highestNetScore = -Infinity;
    let minDanger = Infinity;

    for (let i = 0; i < NUM_SLOTS; i++) {
      const d = this.danger[i];
      if (d < minDanger) {
        minDanger = d;
      }

      // Safety suppression: clear paths get full interest, danger rapidly eliminates rays
      const safetyFactor = Math.pow(Math.max(0, 1 - d / 0.85), 2.2);
      const net = this.interest[i] * safetyFactor - Math.pow(d, 1.4) * 8.5;

      if (net > highestNetScore) {
        highestNetScore = net;
        bestSlot = i;
      }
    }

    // Emergency evasion override: if best chosen slot is unsafe
    let isEmergency = false;
    if (this.danger[bestSlot] > 0.42) {
      isEmergency = true;
      let safestScore = -Infinity;

      for (let i = 0; i < NUM_SLOTS; i++) {
        const d = this.danger[i];
        if (d > minDanger + 0.18) continue;

        let turnDiff = Math.abs(this.slotAngles[i] - currentAngle);
        while (turnDiff > Math.PI) turnDiff = Math.PI * 2 - turnDiff;

        // Balance lowest danger, interest tie-breaker, and turn arc smoothness
        const score = -d * 20.0 + this.interest[i] * 0.45 - (turnDiff / Math.PI) * 0.8;
        if (score > safestScore) {
          safestScore = score;
          bestSlot = i;
        }
      }
    }

    const chosenAngle = this.slotAngles[bestSlot];

    // =========================================================================
    // 5. BOOST GATING (Safety verification before sprinting)
    // =========================================================================
    let angleDiff = Math.abs(chosenAngle - currentAngle);
    while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

    let shouldBoost = false;

    if (hasTurbo) {
      shouldBoost = this.danger[bestSlot] < 0.35;
    } else if (tacticalPlan.wantsBoost) {
      // Only boost if chosen path is safe and aligned
      if (this.danger[bestSlot] < 0.22 && angleDiff < 0.65) {
        shouldBoost = true;
      }
    } else if (isEmergency && minThreatDist < 180 && this.danger[bestSlot] < 0.15 && angleDiff < 0.45) {
      // Panic sprint away into open space
      shouldBoost = true;
    }

    return {
      chosenAngle,
      shouldBoost,
      state,
      targetPoint: tacticalPlan.targetPoint,
      minThreatDist,
      threatLevel: this.danger[bestSlot],
      isEmergency,
    };
  }

  private paintInterestArc(targetAngle: number, intensity: number, spreadSlots: number): void {
    let normalized = targetAngle % (Math.PI * 2);
    if (normalized < 0) normalized += Math.PI * 2;
    const centerSlot = Math.round(normalized / SLOT_STEP) % NUM_SLOTS;

    for (let offset = -spreadSlots; offset <= spreadSlots; offset++) {
      const slot = (centerSlot + offset + NUM_SLOTS) % NUM_SLOTS;
      const falloff = 1 - Math.abs(offset) / (spreadSlots + 1);
      this.interest[slot] = Math.max(this.interest[slot], intensity * falloff);
    }
  }
}
