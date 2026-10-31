import { Snake } from '../entities/Snake';
import { Vector2D } from '../core/Vector2D';
import { GAME_CONFIG } from '../config/constants';
import {
  BotState,
  BotTier,
  BotPersonality,
  SensorySnapshot,
} from './AITypes';

export interface TacticalPlan {
  targetAngle: number;
  targetPoint: Vector2D | null;
  wantsBoost: boolean;
  peeledOff?: boolean;
}

export class TacticalBehaviors {
  /**
   * Translates the active state into precise directional targets and boosting intent.
   */
  static plan(
    snake: Snake,
    state: BotState,
    tier: BotTier,
    personality: BotPersonality,
    snapshot: SensorySnapshot,
    macroTarget: Vector2D,
    feastTarget: Vector2D | null,
    orbitClockwise: boolean = true,
    isBreakingSpiral: boolean = false,
    spiralBreakoutAngle: number = 0
  ): TacticalPlan {
    const head = snake.position;
    const currentAngle = snake.angle;
    const hasGhost = snake.hasPowerUp('ghost');
    const hasTurbo = snake.hasPowerUp('turbo');
    const canAffordBoost = hasTurbo || snake.mass > GAME_CONFIG.BOOST_MIN_MASS + 8;

    // SPIRAL BREAKOUT OVERRIDE:
    // If snake was trapped in a self-reinforcing donut loop around center food,
    // immediately steer outwards tangent to unwind the spiral into open space!
    if (isBreakingSpiral && state !== 'SURVIVE') {
      return {
        targetAngle: spiralBreakoutAngle,
        targetPoint: null,
        wantsBoost: canAffordBoost && snapshot.wallDistance > 350,
      };
    }

    switch (state) {
      // =======================================================================
      // INTERCEPT (Predictive Cut-Off across opponent's nose)
      // =======================================================================
      case 'INTERCEPT': {
        const prey = snapshot.bestPrey;
        if (!prey) {
          return this.planWander(snake, macroTarget);
        }

        const dist = prey.distance;
        const mySpeed = snake.isBoosting ? snake.speed * 1.85 : snake.speed;
        const preySpeed = prey.snake.isBoosting ? prey.snake.speed * 1.85 : prey.snake.speed;

        // Lead time calculation based on distance and closing speed
        const closingSpeedEst = Math.max(1, mySpeed * 1.4);
        let leadTime = Math.min(1.4, Math.max(0.2, dist / (closingSpeedEst * 60)));

        // Tier accuracy: Easy makes mistakes, Medium is reasonable, Hard is pinpoint
        if (tier === 'easy') {
          leadTime *= (0.6 + Math.random() * 0.8);
        } else if (tier === 'medium') {
          leadTime *= (0.85 + Math.random() * 0.3);
        }

        const predictedPreyHead = prey.snake.position.add(
          Vector2D.fromAngle(prey.snake.angle, preySpeed * leadTime * 60)
        );

        // Determine which side of prey's travel line the bot is on
        const preyDirX = Math.cos(prey.snake.angle);
        const preyDirY = Math.sin(prey.snake.angle);
        const toBotX = head.x - prey.snake.position.x;
        const toBotY = head.y - prey.snake.position.y;
        const cross = toBotX * preyDirY - toBotY * preyDirX;
        const cutSide = cross >= 0 ? 1 : -1;

        // Cut clearance: cross directly in front of their face
        const cutMargin = tier === 'hard' ? 22 : 28;
        const cutDist = prey.snake.radius + snake.radius + cutMargin;
        const cutAngle = prey.snake.angle + cutSide * (Math.PI * 0.48);
        const cutPoint = predictedPreyHead.add(Vector2D.fromAngle(cutAngle, cutDist));

        const targetAngle = Math.atan2(cutPoint.y - head.y, cutPoint.x - head.x);

        // DEFENSIVE PEEL-OFF REFLEX:
        // If prey turns directly towards our head (attempting a head-on ram or counter-cut),
        // instantly peel away outward to present our body flank rather than risking our head!
        let angleDiffToPrey = Math.abs(prey.headingAngle - Math.atan2(head.y - prey.snake.position.y, head.x - prey.snake.position.x));
        while (angleDiffToPrey > Math.PI) angleDiffToPrey = Math.PI * 2 - angleDiffToPrey;

        const headHeadDist = head.dist(prey.snake.position);
        if (headHeadDist < snake.radius + prey.snake.radius + 45 && angleDiffToPrey < Math.PI * 0.35) {
          const peelAngle = targetAngle + Math.PI * 0.5 * cutSide;
          return {
            targetAngle: peelAngle,
            targetPoint: cutPoint,
            wantsBoost: false,
            peeledOff: true,
          };
        }

        // Boosting: Sprint when aligned and within strike distance
        let angleDiff = Math.abs(targetAngle - currentAngle);
        while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        const wantsBoost = canAffordBoost && dist < 420 && dist > 70 && angleDiff < 0.65;

        return {
          targetAngle,
          targetPoint: cutPoint,
          wantsBoost,
        };
      }

      // =======================================================================
      // CIRCLE (Constrictor Coiling)
      // =======================================================================
      case 'CIRCLE': {
        const victim = snapshot.bestCoilTarget || snapshot.bestPrey;
        if (!victim) {
          return this.planWander(snake, macroTarget);
        }

        const center = victim.snake.position;
        const toHead = head.sub(center);
        const currentOrbitDist = Math.max(80, toHead.mag());
        const currentTheta = Math.atan2(toHead.y, toHead.x);

        // Desired orbit radius contracts to constrict victim
        const targetOrbitDist = Math.max(90, victim.snake.radius * 3.0 + snake.radius * 1.5);
        const orbitRadius = Math.max(targetOrbitDist, currentOrbitDist * 0.96);

        // Advance orbit angle along tangent
        const dirSign = orbitClockwise ? 1 : -1;
        const nextTheta = currentTheta + dirSign * (Math.PI * 0.32);
        const orbitPoint = center.add(new Vector2D(Math.cos(nextTheta) * orbitRadius, Math.sin(nextTheta) * orbitRadius));

        const targetAngle = Math.atan2(orbitPoint.y - head.y, orbitPoint.x - head.x);

        return {
          targetAngle,
          targetPoint: orbitPoint,
          wantsBoost: false, // Steady, tight circling conserves mass and maintains tight wall
        };
      }

      // =======================================================================
      // HUNT (Parallel Flanking Pursuit)
      // =======================================================================
      case 'HUNT': {
        const prey = snapshot.bestPrey;
        if (!prey) {
          return this.planWander(snake, macroTarget);
        }

        // Never chase directly in the wake of the prey's tail (the rookie blunder).
        // Instead, target an offset flanking point to approach alongside them.
        const preyAngle = prey.snake.angle;
        const toBot = head.sub(prey.snake.position);
        const cross = toBot.x * Math.sin(preyAngle) - toBot.y * Math.cos(preyAngle);
        const flankSign = cross >= 0 ? 1 : -1;

        const flankDist = Math.max(140, prey.snake.radius * 3.5);
        const flankAngle = preyAngle + flankSign * (Math.PI * 0.42);
        const flankTarget = prey.snake.position.add(Vector2D.fromAngle(flankAngle, flankDist));

        const targetAngle = Math.atan2(flankTarget.y - head.y, flankTarget.x - head.x);

        let angleDiff = Math.abs(targetAngle - currentAngle);
        while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        // Occasional boost burst if prey is speeding away
        const wantsBoost = canAffordBoost && prey.snake.isBoosting && prey.distance < 450 && angleDiff < 0.5;

        return {
          targetAngle,
          targetPoint: flankTarget,
          wantsBoost,
        };
      }

      // =======================================================================
      // COLLECT_FOOD (Corpse vacuuming, super food, powerups, pellets)
      // =======================================================================
      case 'COLLECT_FOOD': {
        // Priority 1: Power-up
        if (snapshot.nearestPowerUp && snapshot.nearestPowerUp.distance < 380) {
          const pu = snapshot.nearestPowerUp.powerUp;
          const targetAngle = Math.atan2(pu.position.y - head.y, pu.position.x - head.x);
          return {
            targetAngle,
            targetPoint: pu.position,
            wantsBoost: canAffordBoost && snapshot.nearestPowerUp.distance < 220,
          };
        }

        let targetPoint: Vector2D | null = null;
        let isCorpseVacuum = false;

        if (snapshot.foodCluster && snapshot.foodCluster.hasCorpsePellets) {
          targetPoint = snapshot.foodCluster.bestTargetPos || snapshot.foodCluster.centroid;
          isCorpseVacuum = true;
        } else if (feastTarget && head.dist(feastTarget) > 85) {
          targetPoint = feastTarget;
          isCorpseVacuum = true;
        } else if (snapshot.foodCluster) {
          targetPoint = snapshot.foodCluster.bestTargetPos || snapshot.foodCluster.centroid;
        }

        if (!targetPoint) {
          return this.planWander(snake, macroTarget);
        }

        const toTarget = targetPoint.sub(head);
        const dist = toTarget.mag();
        let targetAngle = Math.atan2(toTarget.y, toTarget.x);

        // Anti-Spin Orbital Gate:
        // If target is inside the turn radius off to the side, do not hard-steer into it.
        // Steer with a shallower sweep angle so the snake sweeps through the food rather than orbiting it.
        const turnRate = Math.max(
          GAME_CONFIG.MIN_TURN_SPEED,
          GAME_CONFIG.BASE_TURN_SPEED * snake.turnSpeedMultiplier - (snake.radius / GAME_CONFIG.MAX_RADIUS) * 0.04
        );
        const currentSpeed = (snake.isBoosting || hasTurbo)
          ? snake.speed * GAME_CONFIG.BOOST_SPEED_MULTIPLIER
          : snake.speed;
        const turnRadius = currentSpeed / turnRate;

        let diff = targetAngle - currentAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (dist < turnRadius * 1.45 && Math.abs(diff) > 0.6) {
          const turnSign = Math.sign(diff) || 1;
          targetAngle = currentAngle + turnSign * 0.35;
        }

        const wantsBoost = canAffordBoost && isCorpseVacuum && dist > 110 && dist < 550 && Math.abs(diff) < 0.7;

        return {
          targetAngle,
          targetPoint,
          wantsBoost,
        };
      }

      // =======================================================================
      // ESCAPE (Anti-Trap Breakout & Crowd Flight)
      // =======================================================================
      case 'ESCAPE': {
        // If trapped in a coiling pocket, aim towards detected exit angle
        if (snapshot.entrapment.isTrapped) {
          const exitAngle = snapshot.entrapment.escapeAngle;
          return {
            targetAngle: exitAngle,
            targetPoint: null,
            wantsBoost: canAffordBoost && snapshot.entrapment.hasOpenFlank,
          };
        }

        // If crowded, vector away from crowd center
        if (snapshot.crowdCount >= 2) {
          const awayFromCrowd = Math.atan2(head.y - snapshot.crowdCentroid.y, head.x - snapshot.crowdCentroid.x);
          return {
            targetAngle: awayFromCrowd,
            targetPoint: null,
            wantsBoost: canAffordBoost,
          };
        }

        // If fleeing closest threat
        if (snapshot.closestThreat) {
          const awayFromThreat = Math.atan2(head.y - snapshot.closestThreat.snake.position.y, head.x - snapshot.closestThreat.snake.position.x);
          return {
            targetAngle: awayFromThreat,
            targetPoint: null,
            wantsBoost: canAffordBoost && snapshot.closestThreat.distance < 320,
          };
        }

        return this.planWander(snake, macroTarget);
      }

      // =======================================================================
      // EVADE (Short-Range Defensive Banking)
      // =======================================================================
      case 'EVADE': {
        if (snapshot.closestThreat) {
          const threat = snapshot.closestThreat;
          const toThreat = threat.snake.position.sub(head);
          const threatAngle = Math.atan2(toThreat.y, toThreat.x);

          // Bank sharply 90 degrees away from threat line
          let diff = threatAngle - currentAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          const evadeSide = diff >= 0 ? -1 : 1;
          const evadeAngle = currentAngle + evadeSide * (Math.PI * 0.55);

          return {
            targetAngle: evadeAngle,
            targetPoint: null,
            wantsBoost: false, // Don't boost blindly when banking to avoid drifting into another segment
          };
        }

        return this.planWander(snake, macroTarget);
      }

      // =======================================================================
      // SURVIVE (Emergency Wall & Lethal Collision Avoidance)
      // =======================================================================
      case 'SURVIVE': {
        // Wall proximity emergency
        if (snapshot.wallDistance < 220 || snapshot.timeToWall < 1.2) {
          const inwardAngle = snapshot.wallNormalAngle;
          // Wall-surfing: blend inward normal with existing forward heading
          let diff = currentAngle - inwardAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          const surfSide = diff >= 0 ? 1 : -1;
          const surfAngle = inwardAngle + surfSide * (Math.PI * 0.42);

          return {
            targetAngle: surfAngle,
            targetPoint: null,
            wantsBoost: false,
          };
        }

        // Head-on crash emergency: sharp emergency deflection
        if (snapshot.closestThreat) {
          const toThreat = snapshot.closestThreat.snake.position.sub(head);
          const threatAngle = Math.atan2(toThreat.y, toThreat.x);
          const reverseAngle = threatAngle + Math.PI;
          return {
            targetAngle: reverseAngle,
            targetPoint: null,
            wantsBoost: false,
          };
        }

        return this.planWander(snake, macroTarget);
      }

      // =======================================================================
      // BOOST (Dedicated Sprint Rush)
      // =======================================================================
      case 'BOOST': {
        if (snapshot.foodCluster && snapshot.foodCluster.hasCorpsePellets) {
          const targetAngle = Math.atan2(snapshot.foodCluster.centroid.y - head.y, snapshot.foodCluster.centroid.x - head.x);
          return {
            targetAngle,
            targetPoint: snapshot.foodCluster.centroid,
            wantsBoost: canAffordBoost,
          };
        }

        return {
          targetAngle: currentAngle,
          targetPoint: null,
          wantsBoost: canAffordBoost,
        };
      }

      // =======================================================================
      // WANDER (Natural Slithering & Macro Waypoint Seeking)
      // =======================================================================
      case 'WANDER':
      default: {
        return this.planWander(snake, macroTarget);
      }
    }
  }

  private static planWander(snake: Snake, macroTarget: Vector2D): TacticalPlan {
    const head = snake.position;
    const targetAngle = Math.atan2(macroTarget.y - head.y, macroTarget.x - head.x);
    return {
      targetAngle,
      targetPoint: macroTarget,
      wantsBoost: false,
    };
  }
}

