import { Snake } from '../entities/Snake';
import { Vector2D } from '../core/Vector2D';
import { PowerUp } from '../entities/PowerUp';

export type BotState =
  | 'WANDER'
  | 'COLLECT_FOOD'
  | 'HUNT'
  | 'INTERCEPT'
  | 'CIRCLE'
  | 'ESCAPE'
  | 'EVADE'
  | 'SURVIVE'
  | 'BOOST';

export type BotTier = 'easy' | 'medium' | 'hard';

export type BotArchetype =
  | 'VIPER'       // Aggressive hunter, rapid intercepts
  | 'ANACONDA'    // Coiling constrictor, traps smaller snakes
  | 'GHOST'       // Cautious, evasive, elusive
  | 'SCAVENGER'   // Corpse rush, pellet vacuum, opportunist
  | 'TACTICIAN'   // Calculated, patient, strikes when safe
  | 'BERSERKER';  // Fearless, constant pressure, high risk

export interface BotPersonality {
  aggression: number;       // 0.0 - 1.0: Eagerness to hunt, cut, and challenge
  caution: number;          // 0.0 - 1.0: Threat sensitivity and escape trigger
  curiosity: number;        // 0.0 - 1.0: Roaming, seeking food and power-ups
  competitiveness: number;  // 0.0 - 1.0: Challenging top snakes and contesting kills
  riskTolerance: number;    // 0.0 - 1.0: Taking tight turns, cutting close, boosting with low mass
  archetype: BotArchetype;
}

export interface PredictedSnake {
  snake: Snake;
  distance: number;
  closingSpeed: number;
  predictedHead: Vector2D;
  predictedHeadShort: Vector2D; // 0.3s lead
  predictedHeadLong: Vector2D;  // 0.8s - 1.2s lead
  isThreat: boolean;
  isPrey: boolean;
  canCoil: boolean;
  headingAngle: number;
  relativeAngle: number;
  isHeadingTowardsUs: boolean;
  collisionTrajectory: boolean;
  timeToCollision: number;
}

export interface EntrapmentStatus {
  isTrapped: boolean;
  severity: number;         // 0.0 to 1.0
  trappingSnakeId: string | null;
  escapeAngle: number;
  hasOpenFlank: boolean;
}

export interface FoodCluster {
  centroid: Vector2D;
  totalMass: number;
  corpseMass: number;
  nearestDist: number;
  hasCorpsePellets: boolean;
  trailAngle: number;       // Principal direction of the corpse trail
  foodCount: number;
  bestTargetPos?: Vector2D;
}

export interface SensorySnapshot {
  nearbySnakes: PredictedSnake[];
  closestThreat: PredictedSnake | null;
  bestPrey: PredictedSnake | null;
  bestCoilTarget: PredictedSnake | null;
  foodCluster: FoodCluster | null;
  nearestPowerUp: { powerUp: PowerUp; distance: number } | null;
  wallDistance: number;
  timeToWall: number;
  wallNormalAngle: number;
  entrapment: EntrapmentStatus;
  crowdCount: number;
  crowdCentroid: Vector2D;
  viewDistance: number;
}

export interface UtilityScores {
  scores: Record<BotState, number>;
  selectedState: BotState;
  reason: string;
}

export interface ContextDecision {
  chosenAngle: number;
  shouldBoost: boolean;
  state: BotState;
  targetPoint: Vector2D | null;
  minThreatDist: number;
  threatLevel: number;
  isEmergency: boolean;
  debugNote?: string;
}

