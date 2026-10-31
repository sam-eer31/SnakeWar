import { Snake } from '../entities/Snake';
import { GAME_CONFIG } from '../config/constants';
import {
  BotState,
  BotTier,
  BotPersonality,
  SensorySnapshot,
  UtilityScores,
} from './AITypes';

export class BotUtilityEvaluator {
  /**
   * Computes utility scores for all 9 states and selects the winning action.
   * Incorporates personality traits, difficulty tier, environment snapshot, and state hysteresis.
   */
  static evaluate(
    snake: Snake,
    tier: BotTier,
    personality: BotPersonality,
    snapshot: SensorySnapshot,
    currentState: BotState,
    stateTimer: number,
    isKillerFeasting: boolean = false,
    isBreakingSpiral: boolean = false
  ): UtilityScores {
    const scores: Record<BotState, number> = {
      WANDER: isBreakingSpiral ? 95 : 20,
      COLLECT_FOOD: isBreakingSpiral ? 0 : 25,
      HUNT: isBreakingSpiral ? 0 : 15,
      INTERCEPT: isBreakingSpiral ? 0 : 10,
      CIRCLE: 5,
      ESCAPE: 10,
      EVADE: 10,
      SURVIVE: 0,
      BOOST: 10,
    };

    const hasGhost = snake.hasPowerUp('ghost');
    const hasTurbo = snake.hasPowerUp('turbo');
    const canAffordBoost = hasTurbo || snake.mass > GAME_CONFIG.BOOST_MIN_MASS + 8;

    // =========================================================================
    // 1. SURVIVE (Emergency collision avoidance & arena wall preservation)
    // =========================================================================
    let surviveScore = 0;

    // Wall danger: critical when close or approaching boundary fast
    if (snapshot.wallDistance < 180 || snapshot.timeToWall < 1.0) {
      surviveScore += 80 + Math.max(0, 1 - snapshot.wallDistance / 180) * 45;
    }

    // Lethal head-on trajectory
    if (!hasGhost && snapshot.closestThreat && snapshot.closestThreat.collisionTrajectory) {
      const ttc = snapshot.closestThreat.timeToCollision;
      if (ttc < 0.8) {
        surviveScore += 85 + (0.8 - ttc) * 40;
      }
    }

    // Critical proximity to deadly body segment
    if (!hasGhost && snapshot.closestThreat && snapshot.closestThreat.distance < snake.radius * 2.8) {
      surviveScore += 75;
    }

    scores.SURVIVE = surviveScore;

    // =========================================================================
    // 2. EVADE (Tactical short-range defensive deflection)
    // =========================================================================
    let evadeScore = 0;
    if (!hasGhost && snapshot.closestThreat) {
      const threat = snapshot.closestThreat;
      if (threat.distance < 360) {
        const proximityFactor = Math.pow(Math.max(0, 1 - threat.distance / 360), 1.2);
        evadeScore = 45 + proximityFactor * 40;

        // If threat is heading directly towards our flank, evasive urgency surges
        if (threat.isHeadingTowardsUs) {
          evadeScore += 20;
        }

        // Personality influence: cautious bots evade sooner
        evadeScore *= (0.75 + personality.caution * 0.5);
      }
    }
    scores.EVADE = evadeScore;

    // =========================================================================
    // 3. ESCAPE (Crowd retreat, trap breakout, fleeing giant predators)
    // =========================================================================
    let escapeScore = 0;
    if (!hasGhost) {
      // Entrapment in coiling pocket
      if (snapshot.entrapment.isTrapped) {
        escapeScore += 65 + snapshot.entrapment.severity * 35;
      }

      // Swarm crowding: 3 or more snakes clustering
      if (snapshot.crowdCount >= 3) {
        escapeScore += 35 + snapshot.crowdCount * 10;
      }

      // Massive predator in hunting proximity
      if (snapshot.closestThreat && snapshot.closestThreat.snake.mass > snake.mass * 1.6) {
        const d = snapshot.closestThreat.distance;
        if (d < 500) {
          escapeScore += (1 - d / 500) * 45;
        }
      }

      escapeScore *= (0.7 + personality.caution * 0.6 - personality.riskTolerance * 0.25);
    }
    scores.ESCAPE = escapeScore;

    // =========================================================================
    // 4. COLLECT_FOOD (Corpse vacuuming, super food, pellets, power-ups)
    // =========================================================================
    let foodScore = 18;
    if (snapshot.foodCluster) {
      const cluster = snapshot.foodCluster;

      // Regular ambient food grazing: moderate score so it doesn't suppress hunting
      const densityScore = Math.min(16, cluster.totalMass * 0.15);
      const proximityScore = Math.max(0, 1 - cluster.nearestDist / snapshot.viewDistance) * 16;
      foodScore += densityScore + proximityScore;

      // CORPSE FEASTING: Slither players prioritize fresh kills above all else!
      if (cluster.hasCorpsePellets || isKillerFeasting) {
        const corpseBonus = isKillerFeasting ? 55 : Math.min(48, cluster.corpseMass * 0.6);
        foodScore += corpseBonus;

        // Scavenger & curious personalities feast hungrily
        foodScore *= (0.85 + personality.curiosity * 0.35);
      }
    }

    // Power-up desire
    if (snapshot.nearestPowerUp) {
      const puDist = snapshot.nearestPowerUp.distance;
      const puScore = Math.max(0, 1 - puDist / snapshot.viewDistance) * 35;
      foodScore = Math.max(foodScore, foodScore * 0.7 + puScore);
    }
    scores.COLLECT_FOOD = foodScore;

    // =========================================================================
    // 5. INTERCEPT (Predictive Cut-Off: Slither's signature lethal strike)
    // =========================================================================
    let interceptScore = 0;

    // Easy bots don't possess predictive cut capability
    if (tier !== 'easy' && snapshot.bestPrey && !snapshot.entrapment.isTrapped) {
      const prey = snapshot.bestPrey;

      // Only attempt when prey is within striking range
      const strikeRange = tier === 'hard' ? 580 : 420;
      if (prey.distance < strikeRange) {
        const proximity = (1 - prey.distance / strikeRange) * 40;
        const massReward = Math.min(30, (prey.snake.mass / Math.max(1, snake.mass)) * 25);
        const positionAdvantage = prey.relativeAngle < Math.PI * 0.45 ? 25 : 5;

        interceptScore = proximity + massReward + positionAdvantage;

        // Personality influence: aggression and competitiveness drive intercepts
        interceptScore *= (0.6 + personality.aggression * 0.55 + personality.competitiveness * 0.3);

        if (personality.archetype === 'VIPER' || personality.archetype === 'BERSERKER') {
          interceptScore *= 1.25;
        }

        if (tier === 'hard') {
          interceptScore *= 1.2;
        }
      }
    }
    scores.INTERCEPT = interceptScore;

    // =========================================================================
    // 6. CIRCLE (Constrictor Coiling: Enclosing and crushing smaller victims)
    // =========================================================================
    let circleScore = 0;

    // Only attempted if bot is large, long, and target is suitable
    if (tier !== 'easy' && snapshot.bestCoilTarget && !snapshot.entrapment.isTrapped) {
      const target = snapshot.bestCoilTarget;
      const lengthAdvantage = snake.segments.length / Math.max(1, target.snake.segments.length);

      if (lengthAdvantage > 1.4 && target.distance < 380) {
        circleScore = 35 + Math.min(35, lengthAdvantage * 15) + (1 - target.distance / 380) * 20;

        // Personality archetype ANACONDA excels at coiling
        if (personality.archetype === 'ANACONDA') {
          circleScore *= 1.4;
        }
        if (tier === 'hard') {
          circleScore *= 1.25;
        }
      }
    }
    scores.CIRCLE = circleScore;

    // =========================================================================
    // 7. HUNT (Stalking, shadowing, and flanking prey from distance)
    // =========================================================================
    let huntScore = 0;
    if (snapshot.bestPrey && !snapshot.entrapment.isTrapped) {
      const prey = snapshot.bestPrey;
      if (prey.distance >= 250 && prey.distance < snapshot.viewDistance) {
        const distFactor = (1 - prey.distance / snapshot.viewDistance) * 42;
        const massAdvantage = Math.min(25, (snake.mass / Math.max(1, prey.snake.mass)) * 20);
        huntScore = 32 + distFactor + massAdvantage;
        huntScore *= (0.65 + personality.aggression * 0.7);

        if (personality.archetype === 'VIPER' || personality.archetype === 'BERSERKER') {
          huntScore *= 1.3;
        }

        // Easy bots rarely hunt
        if (tier === 'easy') {
          huntScore *= 0.25;
        }
      }
    }
    scores.HUNT = huntScore;

    // =========================================================================
    // 8. BOOST (High-velocity sprint dash)
    // =========================================================================
    let boostScore = 0;
    if (canAffordBoost) {
      // Sprint to contest a rich corpse before rivals reach it
      if (snapshot.foodCluster && snapshot.foodCluster.hasCorpsePellets && snapshot.foodCluster.nearestDist < 450) {
        boostScore = 50 + personality.competitiveness * 25;
      }
      // Sprint to escape imminent trap
      if (snapshot.entrapment.isTrapped && snapshot.entrapment.hasOpenFlank) {
        boostScore = Math.max(boostScore, 65);
      }
      // Free boost with turbo
      if (hasTurbo) {
        boostScore = Math.max(boostScore, 60);
      }
    }
    scores.BOOST = boostScore;

    // =========================================================================
    // 9. WANDER (Default baseline exploration)
    // =========================================================================
    scores.WANDER = 22 + personality.curiosity * 12;

    // =========================================================================
    // 10. STATE HYSTERESIS & COMMITMENT (Prevent 60Hz flickering)
    // =========================================================================
    // Once committed to an action, grant a stickiness bonus for a realistic human duration
    const minCommitTime = tier === 'hard' ? 0.35 : tier === 'medium' ? 0.6 : 0.9;
    if (stateTimer < minCommitTime && currentState !== 'SURVIVE' && currentState !== 'EVADE') {
      const stickinessBonus = 18;
      scores[currentState] += stickinessBonus;
    }

    // =========================================================================
    // 11. WINNER SELECTION
    // =========================================================================
    // Emergency states always take absolute precedence if threshold is breached
    let selectedState: BotState = 'WANDER';
    let highestScore = -Infinity;

    if (scores.SURVIVE > 65) {
      selectedState = 'SURVIVE';
      highestScore = scores.SURVIVE;
    } else if (scores.EVADE > 60 && scores.EVADE > scores.INTERCEPT * 1.1) {
      selectedState = 'EVADE';
      highestScore = scores.EVADE;
    } else if (scores.ESCAPE > 60) {
      selectedState = 'ESCAPE';
      highestScore = scores.ESCAPE;
    } else {
      // Select state with highest overall utility
      const allStates: BotState[] = [
        'INTERCEPT',
        'CIRCLE',
        'COLLECT_FOOD',
        'HUNT',
        'BOOST',
        'ESCAPE',
        'EVADE',
        'WANDER',
      ];

      for (const st of allStates) {
        if (scores[st] > highestScore) {
          highestScore = scores[st];
          selectedState = st;
        }
      }
    }

    return {
      scores,
      selectedState,
      reason: `Selected ${selectedState} with score ${highestScore.toFixed(1)}`,
    };
  }
}
