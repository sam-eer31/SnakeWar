import { Snake } from '../entities/Snake';
import { Vector2D } from '../core/Vector2D';
import { FoodManager } from '../entities/FoodManager';
import { PowerUp } from '../entities/PowerUp';
import { GAME_CONFIG } from '../config/constants';
import {
  BotTier,
  BotPersonality,
  SensorySnapshot,
  PredictedSnake,
  EntrapmentStatus,
  FoodCluster,
} from './AITypes';

export class BotSensorySystem {
  /**
   * Builds an in-depth sensory snapshot of the environment around the bot.
   * Completely local and non-omniscient: only observes what is within its view cone / distance.
   */
  static perceive(
    botSnake: Snake,
    tier: BotTier,
    personality: BotPersonality,
    allSnakes: Snake[],
    foodManager: FoodManager,
    powerUps: PowerUp[],
    selfCollision: boolean,
    baseViewDistance: number
  ): SensorySnapshot {
    const head = botSnake.position;
    const currentAngle = botSnake.angle;
    const arenaRadius = foodManager.arenaRadius || GAME_CONFIG.ARENA_RADIUS;

    // View distance scales with snake size and personality curiosity
    const sizeMultiplier = 1 + ((botSnake.radius - GAME_CONFIG.INITIAL_RADIUS) / GAME_CONFIG.MAX_RADIUS) * 0.45;
    const curiosityBonus = 1 + personality.curiosity * 0.15;
    const viewDist = baseViewDistance * sizeMultiplier * curiosityBonus;

    // -------------------------------------------------------------------------
    // 1. WALL AWARENESS & TIME-TO-IMPACT
    // -------------------------------------------------------------------------
    const distFromCenter = head.mag();
    const effectiveRadius = arenaRadius - botSnake.radius - 12;
    const wallDistance = Math.max(0, effectiveRadius - distFromCenter);

    // Wall normal pointing inward towards center
    const wallNormalAngle = Math.atan2(-head.y, -head.x);

    // Speed projected along outward radial direction
    const cosAngle = Math.cos(currentAngle);
    const sinAngle = Math.sin(currentAngle);
    const outwardVel = (head.x * cosAngle + head.y * sinAngle) / Math.max(1, distFromCenter);
    const timeToWall = outwardVel > 0.05
      ? wallDistance / (Math.max(1, botSnake.speed * (botSnake.isBoosting ? 1.85 : 1.0)) * outwardVel)
      : 99.0;

    // -------------------------------------------------------------------------
    // 2. DETECT & PREDICT NEARBY SNAKES (Velocity-based Trajectory Extrapolation)
    // -------------------------------------------------------------------------
    const nearbySnakes: PredictedSnake[] = [];
    let closestThreat: PredictedSnake | null = null;
    let minThreatDist = Infinity;
    let bestPrey: PredictedSnake | null = null;
    let bestPreyScore = -Infinity;
    let bestCoilTarget: PredictedSnake | null = null;
    let bestCoilScore = -Infinity;

    let crowdCount = 0;
    let crowdX = 0;
    let crowdY = 0;

    const botSpeed = botSnake.isBoosting ? botSnake.speed * 1.85 : botSnake.speed;
    const hasGhost = botSnake.hasPowerUp('ghost');

    for (const other of allSnakes) {
      if (other.id === botSnake.id && !selfCollision) continue;
      if (other.isDead || other.hasSpawnProtection) continue;

      const dHead = head.dist(other.position);
      // Broad-phase reach culling
      const maxReach = other.segments.length * GAME_CONFIG.SEGMENT_DISTANCE + 150;
      if (dHead > viewDist + maxReach && other.id !== botSnake.id) continue;

      // Only perceive other snakes whose head or body enters viewDist
      if (dHead > viewDist && other.id !== botSnake.id) {
        // Quick segment proximity check
        let inView = false;
        const checkStep = other.segments.length > 50 ? 5 : 2;
        for (let s = 0; s < other.segments.length; s += checkStep) {
          const seg = other.segments[s];
          const dx = seg.x - head.x;
          const dy = seg.y - head.y;
          if (dx * dx + dy * dy < viewDist * viewDist) {
            inView = true;
            break;
          }
        }
        if (!inView) continue;
      }

      if (other.id === botSnake.id) continue; // Don't treat self as foreign target

      // Crowd tracking
      if (dHead < 500) {
        crowdCount++;
        crowdX += other.position.x;
        crowdY += other.position.y;
      }

      // Kinematics of other snake
      const otherSpeed = other.isBoosting ? other.speed * 1.85 : other.speed;
      const otherVel = Vector2D.fromAngle(other.angle, otherSpeed);
      const botVel = Vector2D.fromAngle(botSnake.angle, botSpeed);

      // Relative motion vector
      const relVel = otherVel.sub(botVel);
      const toOther = other.position.sub(head);
      const dist = Math.max(1, toOther.mag());
      const toOtherNorm = toOther.mul(1 / dist);

      // Closing speed: positive means closing in, negative means separating
      const closingSpeed = -relVel.dot(toOtherNorm);

      // Predictions: short (0.3s) and long (0.8s) lead horizons
      // If tier is Easy, prediction is shorter and cruder
      const shortHorizon = tier === 'easy' ? 0.2 : 0.35;
      const longHorizon = tier === 'hard' ? 1.0 : tier === 'medium' ? 0.7 : 0.4;

      const predShort = other.position.add(otherVel.mul(shortHorizon * 60));
      const predLong = other.position.add(otherVel.mul(longHorizon * 60));

      // Heading angles
      const headingAngle = other.angle;
      const angleToUs = Math.atan2(head.y - other.position.y, head.x - other.position.x);
      let headingDiff = Math.abs(other.angle - angleToUs);
      while (headingDiff > Math.PI) headingDiff = Math.PI * 2 - headingDiff;
      const isHeadingTowardsUs = headingDiff < Math.PI * 0.38;

      // Relative angle from our heading towards their head
      const angleToOther = Math.atan2(other.position.y - head.y, other.position.x - head.x);
      let relAngleDiff = Math.abs(currentAngle - angleToOther);
      while (relAngleDiff > Math.PI) relAngleDiff = Math.PI * 2 - relAngleDiff;

      // Collision Trajectory Check
      // Are paths projected to intersect within 1.2s?
      let collisionTrajectory = false;
      let timeToCollision = 99.0;

      if (dist < 450) {
        const combinedRadius = botSnake.radius + other.radius + 24;
        const ttc = dist / Math.max(1, closingSpeed);
        if (closingSpeed > 1.2 && ttc < 1.4) {
          // Check closest point of approach (CPA)
          const relVelMagSq = relVel.magSq();
          if (relVelMagSq > 0.1) {
            const tCpa = Math.max(0, -toOther.dot(relVel) / relVelMagSq);
            if (tCpa < 1.5) {
              const posAtCpa = toOther.add(relVel.mul(tCpa));
              if (posAtCpa.mag() < combinedRadius * 1.5) {
                collisionTrajectory = true;
                timeToCollision = tCpa;
              }
            }
          }
        }
      }

      // Threat assessment
      // Bigger snake with head nearby or closing in is a threat.
      // Ghost powerup neutralizes physical threats.
      const isThreat = !hasGhost && (
        (other.mass > botSnake.mass * 0.85 && dist < 500) ||
        (isHeadingTowardsUs && dist < 380) ||
        collisionTrajectory ||
        (other.mass > botSnake.mass * 1.4 && dist < 700)
      );

      // Prey assessment: smaller snake, or similar snake in bad position, or bot has Ghost
      const isPrey = hasGhost || (
        (other.mass <= botSnake.mass * (tier === 'hard' ? 1.4 : 1.1)) &&
        !isThreat &&
        dist < (tier === 'hard' ? 700 : 500)
      );

      // Coiling suitability: bot must be significantly longer and heavier
      const canCoil =
        tier !== 'easy' &&
        botSnake.mass > 140 &&
        botSnake.segments.length > 25 &&
        botSnake.mass > other.mass * 1.3 &&
        dist < 420;

      const pSnake: PredictedSnake = {
        snake: other,
        distance: dist,
        closingSpeed,
        predictedHead: predLong,
        predictedHeadShort: predShort,
        predictedHeadLong: predLong,
        isThreat,
        isPrey,
        canCoil,
        headingAngle,
        relativeAngle: relAngleDiff,
        isHeadingTowardsUs,
        collisionTrajectory,
        timeToCollision,
      };

      nearbySnakes.push(pSnake);

      // Identify closest/highest threat
      if (isThreat && dist < minThreatDist) {
        minThreatDist = dist;
        closestThreat = pSnake;
      }

      // Score prey opportunity
      if (isPrey) {
        // High score for close, vulnerable prey with high mass reward
        const distScore = (1 - dist / viewDist) * 60;
        const massBonus = Math.min(40, (other.mass / Math.max(1, botSnake.mass)) * 30);
        const positionAdvantage = relAngleDiff < Math.PI * 0.4 ? 20 : 0;
        const totalScore = distScore + massBonus + positionAdvantage;

        if (totalScore > bestPreyScore) {
          bestPreyScore = totalScore;
          bestPrey = pSnake;
        }
      }

      // Score coil opportunity
      if (canCoil) {
        const coilScore = (botSnake.mass / Math.max(1, other.mass)) * 30 + (1 - dist / 420) * 40;
        if (coilScore > bestCoilScore) {
          bestCoilScore = coilScore;
          bestCoilTarget = pSnake;
        }
      }
    }

    const crowdCentroid = crowdCount > 0
      ? new Vector2D(crowdX / crowdCount, crowdY / crowdCount)
      : head;

    // -------------------------------------------------------------------------
    // 3. ENTRAPMENT / POCKET DETECTION (Anti-Coil & Anti-Trap)
    // -------------------------------------------------------------------------
    const entrapment = this.evaluateEntrapment(botSnake, allSnakes, hasGhost);

    // -------------------------------------------------------------------------
    // 4. FOOD CLUSTER & CORPSE TRAIL DETECTION
    // -------------------------------------------------------------------------
    const foodCluster = this.evaluateFood(botSnake, foodManager, viewDist);

    // -------------------------------------------------------------------------
    // 5. POWER-UP PERCEPTION
    // -------------------------------------------------------------------------
    let nearestPowerUp: { powerUp: PowerUp; distance: number } | null = null;
    let minPUDist = Infinity;

    for (const pu of powerUps) {
      const d = head.dist(pu.position);
      if (d < viewDist && d < minPUDist) {
        minPUDist = d;
        nearestPowerUp = { powerUp: pu, distance: d };
      }
    }

    return {
      nearbySnakes,
      closestThreat,
      bestPrey,
      bestCoilTarget,
      foodCluster,
      nearestPowerUp,
      wallDistance,
      timeToWall,
      wallNormalAngle,
      entrapment,
      crowdCount,
      crowdCentroid,
      viewDistance: viewDist,
    };
  }

  /**
   * Samples rays to flanks and forward to detect if trapped inside a concave coil.
   */
  private static evaluateEntrapment(
    snake: Snake,
    allSnakes: Snake[],
    hasGhost: boolean
  ): EntrapmentStatus {
    if (hasGhost) {
      return { isTrapped: false, severity: 0, trappingSnakeId: null, escapeAngle: 0, hasOpenFlank: true };
    }

    const head = snake.position;
    const angle = snake.angle;

    // Test three probe vectors: 60 deg Left, 60 deg Right, and Forward
    const probeDist = Math.max(120, snake.radius * 5.5);
    const leftVec = head.add(Vector2D.fromAngle(angle - Math.PI * 0.45, probeDist));
    const rightVec = head.add(Vector2D.fromAngle(angle + Math.PI * 0.45, probeDist));
    const frontVec = head.add(Vector2D.fromAngle(angle, probeDist * 1.3));

    let leftBlocked = false;
    let rightBlocked = false;
    let frontBlocked = false;
    let trapperId: string | null = null;

    for (const other of allSnakes) {
      if (other.id === snake.id || other.isDead) continue;
      const d = head.dist(other.position);
      if (d > 750) continue;

      const segs = other.segments;
      const step = segs.length > 40 ? 3 : 1;
      const hitRadiusSq = (other.radius + snake.radius + 15) ** 2;

      for (let s = 0; s < segs.length; s += step) {
        const seg = segs[s];
        if (!leftBlocked && (seg.x - leftVec.x) ** 2 + (seg.y - leftVec.y) ** 2 < hitRadiusSq) {
          leftBlocked = true;
          trapperId = other.id;
        }
        if (!rightBlocked && (seg.x - rightVec.x) ** 2 + (seg.y - rightVec.y) ** 2 < hitRadiusSq) {
          rightBlocked = true;
          trapperId = other.id;
        }
        if (!frontBlocked && (seg.x - frontVec.x) ** 2 + (seg.y - frontVec.y) ** 2 < hitRadiusSq) {
          frontBlocked = true;
          trapperId = other.id;
        }
        if (leftBlocked && rightBlocked) break;
      }
      if (leftBlocked && rightBlocked) break;
    }

    const isTrapped = (leftBlocked && rightBlocked) || (frontBlocked && (leftBlocked || rightBlocked));
    const severity = (leftBlocked ? 0.4 : 0) + (rightBlocked ? 0.4 : 0) + (frontBlocked ? 0.2 : 0);

    // Escape angle: towards whichever side has clearance, or complete reversal
    let escapeAngle = angle + Math.PI;
    if (!leftBlocked && rightBlocked) {
      escapeAngle = angle - Math.PI * 0.65;
    } else if (leftBlocked && !rightBlocked) {
      escapeAngle = angle + Math.PI * 0.65;
    }

    return {
      isTrapped,
      severity,
      trappingSnakeId: trapperId,
      escapeAngle,
      hasOpenFlank: !leftBlocked || !rightBlocked,
    };
  }

  /**
   * Spatial hash query for local food items and corpse clusters.
   */
  private static evaluateFood(
    snake: Snake,
    foodManager: FoodManager,
    viewDist: number
  ): FoodCluster | null {
    const head = snake.position;
    const scanRadius = Math.min(viewDist, 950);
    const items = foodManager.spatialGrid.queryRadius(head.x, head.y, scanRadius);

    if (items.length === 0) return null;

    // Physical turn radius calculation for orbital trap prevention
    const baseTurn = GAME_CONFIG.BASE_TURN_SPEED * snake.turnSpeedMultiplier;
    const turnRate = Math.max(
      GAME_CONFIG.MIN_TURN_SPEED,
      baseTurn - (snake.radius / GAME_CONFIG.MAX_RADIUS) * 0.04
    );
    const currentSpeed = snake.isBoosting
      ? snake.speed * GAME_CONFIG.BOOST_SPEED_MULTIPLIER
      : snake.speed;
    const minTurnRadius = currentSpeed / turnRate;

    let totalMass = 0;
    let corpseMass = 0;
    let weightedX = 0;
    let weightedY = 0;
    let totalEffectiveWeight = 0;
    let nearestDist = Infinity;
    let hasCorpse = false;

    // Reachable individual food target selection
    let bestTargetScore = -Infinity;
    let bestTargetPos: Vector2D | null = null;

    // For calculating principal corpse trail axis
    let corpseCount = 0;
    let corpseX1 = 0, corpseY1 = 0;
    let corpseX2 = 0, corpseY2 = 0;

    for (let i = 0; i < items.length; i++) {
      const food = items[i].data;
      if (!food) continue;

      const d = head.dist(food.position);
      if (d > scanRadius) continue;

      let angleToFood = Math.atan2(food.position.y - head.y, food.position.x - head.x);
      let diffA = Math.abs(snake.angle - angleToFood);
      while (diffA > Math.PI) diffA = Math.PI * 2 - diffA;

      // ANTI-SPIRAL / IMPOSSIBLE TURN RADIUS FILTER:
      // If food is inside snake's minimum physical turn diameter and off to the side,
      // the snake cannot turn sharp enough to eat it directly without entering an endless orbit.
      const isInsideTurnPocket = (d < minTurnRadius * 1.35 && diffA > 0.62) || (d < 45 && diffA > 0.45);

      // Check if food is enclosed inside snake's own coiled body segments
      let isInsideOwnCoil = false;
      if (snake.segments.length > 8 && d < 180) {
        const segStep = Math.max(1, Math.floor(snake.segments.length / 10));
        for (let s = 6; s < snake.segments.length; s += segStep) {
          const seg = snake.segments[s];
          const distSegSq = (seg.x - food.position.x) ** 2 + (seg.y - food.position.y) ** 2;
          if (distSegSq < 52 * 52) {
            isInsideOwnCoil = true;
            break;
          }
        }
      }

      if (isInsideOwnCoil) {
        continue; // Completely ignore pellets trapped inside own body coils
      }

      if (d < nearestDist) {
        nearestDist = d;
      }

      // Corpse and super food carry massive gravity
      const isCorpse = food.type === 'corpse';
      const isSuper = food.type === 'super';
      const weightMultiplier = isCorpse ? 14.0 : isSuper ? 8.0 : 1.5;

      // Only reachable items outside the tight side-pocket contribute to the steering centroid
      if (!isInsideTurnPocket) {
        const effectiveVal = food.value * weightMultiplier;
        totalMass += food.value;
        totalEffectiveWeight += effectiveVal;
        weightedX += food.position.x * effectiveVal;
        weightedY += food.position.y * effectiveVal;

        if (isCorpse) {
          hasCorpse = true;
          corpseMass += food.value;
          corpseCount++;
          if (corpseCount === 1) {
            corpseX1 = food.position.x;
            corpseY1 = food.position.y;
          } else {
            corpseX2 = food.position.x;
            corpseY2 = food.position.y;
          }
        }

        // Score reachable candidate target
        const forwardAlignment = 0.4 + 0.6 * Math.cos(diffA);
        const distScore = 1.0 / (d + 40);
        const candidateScore = food.value * weightMultiplier * forwardAlignment * distScore;
        if (candidateScore > bestTargetScore) {
          bestTargetScore = candidateScore;
          bestTargetPos = food.position;
        }
      }
    }

    if (totalEffectiveWeight === 0) {
      // If every detected food pellet was stuck in the tight turn pocket,
      // project a sweep-through target point forward so the bot breaks out and circles around cleanly
      const sweepPoint = head.add(Vector2D.fromAngle(snake.angle, Math.max(120, minTurnRadius * 2.0)));
      return {
        centroid: sweepPoint,
        bestTargetPos: sweepPoint,
        totalMass: 10,
        corpseMass: 0,
        nearestDist: minTurnRadius,
        hasCorpsePellets: false,
        trailAngle: snake.angle,
        foodCount: items.length,
      };
    }

    const centroid = new Vector2D(
      weightedX / totalEffectiveWeight,
      weightedY / totalEffectiveWeight
    );

    // If corpse trail exists, calculate line orientation
    const trailAngle = corpseCount >= 2
      ? Math.atan2(corpseY2 - corpseY1, corpseX2 - corpseX1)
      : Math.atan2(centroid.y - head.y, centroid.x - head.x);

    return {
      centroid,
      bestTargetPos: bestTargetPos || centroid,
      totalMass,
      corpseMass,
      nearestDist,
      hasCorpsePellets: hasCorpse,
      trailAngle,
      foodCount: items.length,
    };
  }
}

