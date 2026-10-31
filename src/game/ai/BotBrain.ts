import { Snake } from '../entities/Snake';
import { Vector2D } from '../core/Vector2D';
import { GAME_CONFIG } from '../config/constants';
import { FoodManager } from '../entities/FoodManager';
import { PowerUp } from '../entities/PowerUp';
import {
  BotState,
  BotTier,
  BotPersonality,
  ContextDecision,
  UtilityScores,
  SensorySnapshot,
} from './AITypes';
import { BotPersonalityFactory } from './BotPersonality';
import { BotSensorySystem } from './BotSensorySystem';
import { BotUtilityEvaluator } from './BotUtilityEvaluator';
import { TacticalBehaviors } from './TacticalBehaviors';
import { ContextSteeringEngine } from './ContextSteering';

export type { BotTier, BotPersonality, BotState };

export class BotBrain {
  public snake: Snake;
  public tier: BotTier;
  public personality: BotPersonality;
  public state: BotState = 'WANDER';
  public stateTimer: number = 0;
  public viewDistance: number = 750;

  // Steering & Utility engines
  private steeringEngine: ContextSteeringEngine;
  private thinkTimer: number = 0;
  private thinkInterval: number = 0.08;

  // Macro Roaming Waypoint
  public macroTarget: Vector2D;
  private macroTimer: number = 0;
  private macroDuration: number = 10.0;

  // Feasting State
  public feastTarget: Vector2D | null = null;
  public feastTimer: number = 0;
  public isKillerFeasting: boolean = false;
  public feastCorpseMass: number = 0;

  // Constrictor Coiling
  public orbitClockwise: boolean = true;

  // Anti-Spiral / Spin-Lock Breakout System
  private cumulativeTurnAngle: number = 0;
  private lastAngle: number = 0;
  private spinAnchorPos: Vector2D;
  private spinAnchorTimer: number = 0;
  public isBreakingSpiral: boolean = false;
  public spiralBreakoutTimer: number = 0;
  public spiralBreakoutAngle: number = 0;

  // Human-like hesitation & mistake simulation
  private mistakeTimer: number = 0;
  private mistakeOffsetAngle: number = 0;
  private reactionDelayTimer: number = 0;

  // Steering & Decisions
  private lockedAngle: number = 0;
  public lastDecision: ContextDecision | null = null;
  public lastUtilityScores: UtilityScores | null = null;
  public lastSnapshot: SensorySnapshot | null = null;

  constructor(snake: Snake, tier: BotTier = 'medium') {
    this.snake = snake;
    snake.aiBrain = this;
    this.tier = tier;
    this.personality = BotPersonalityFactory.create(tier);
    this.steeringEngine = new ContextSteeringEngine();
    this.lockedAngle = snake.angle;
    this.lastAngle = snake.angle;
    this.spinAnchorPos = snake.position.clone();
    this.macroTarget = new Vector2D(0, 0);
    this.orbitClockwise = Math.random() < 0.5;

    // Configure distinct tier intelligence and reaction cycles
    if (tier === 'easy') {
      this.viewDistance = 600;
      this.thinkInterval = 0.16 + Math.random() * 0.06; // 160-220ms casual human reaction
      this.macroDuration = 12 + Math.random() * 8;
    } else if (tier === 'medium') {
      this.viewDistance = 950;
      this.thinkInterval = 0.075 + Math.random() * 0.03; // 75-105ms solid gamer reaction
      this.macroDuration = 9 + Math.random() * 5;
    } else {
      // Hard / Apex Bot
      this.viewDistance = 1450;
      this.thinkInterval = 0.035 + Math.random() * 0.015; // 35-50ms high-tier reflex loop
      this.macroDuration = 7 + Math.random() * 4;
    }

    // Stagger thinkTimer across bots to distribute frame calculations smoothly
    this.thinkTimer = Math.random() * this.thinkInterval;

    this.pickNewMacroTarget(GAME_CONFIG.ARENA_RADIUS);
  }

  /**
   * Generates long-range macro destinations based on tier intelligence.
   */
  public pickNewMacroTarget(arenaRadius: number = GAME_CONFIG.ARENA_RADIUS): void {
    this.macroTimer = 0;

    if (this.tier === 'hard') {
      this.macroDuration = 6 + Math.random() * 5;
      // Apex bots bias strongly toward arena center where heavy combat and high-value mass concentrate
      const toCenter = Math.random() < 0.70;
      if (toCenter) {
        const r = Math.random() * (arenaRadius * 0.42);
        const theta = Math.random() * Math.PI * 2;
        this.macroTarget = new Vector2D(Math.cos(theta) * r, Math.sin(theta) * r);
      } else {
        const currentAngle = Math.atan2(this.snake.position.y, this.snake.position.x);
        const targetAngle = currentAngle + Math.PI + (Math.random() - 0.5) * 1.2;
        const r = 0.30 * arenaRadius + Math.random() * (arenaRadius * 0.35);
        this.macroTarget = new Vector2D(Math.cos(targetAngle) * r, Math.sin(targetAngle) * r);
      }
    } else if (this.tier === 'medium') {
      this.macroDuration = 8 + Math.random() * 6;
      const toCenter = Math.random() < 0.45;
      if (toCenter) {
        const r = Math.random() * (arenaRadius * 0.5);
        const theta = Math.random() * Math.PI * 2;
        this.macroTarget = new Vector2D(Math.cos(theta) * r, Math.sin(theta) * r);
      } else {
        const r = 0.28 * arenaRadius + Math.random() * (arenaRadius * 0.45);
        const theta = Math.random() * Math.PI * 2;
        this.macroTarget = new Vector2D(Math.cos(theta) * r, Math.sin(theta) * r);
      }
    } else {
      // Easy bots wander loosely in broad outer orbits
      this.macroDuration = 12 + Math.random() * 8;
      const r = 0.40 * arenaRadius + Math.random() * (arenaRadius * 0.42);
      const theta = Math.random() * Math.PI * 2;
      this.macroTarget = new Vector2D(Math.cos(theta) * r, Math.sin(theta) * r);
    }
  }

  /**
   * Called when a snake dies nearby: sets feasting priority so bots vacuum the corpse.
   */
  onCorpseFeast(x: number, y: number, mass: number, isKiller: boolean): void {
    if (this.tier === 'easy' && !isKiller && this.snake.position.dist({ x, y } as any) > 650) {
      return;
    }
    this.feastTarget = new Vector2D(x, y);
    this.feastTimer = isKiller ? Math.min(8.5, 4.5 + mass * 0.003) : Math.min(6.5, 3.5 + mass * 0.002);
    this.isKillerFeasting = isKiller;
    this.feastCorpseMass = mass;
    this.macroTarget = new Vector2D(x, y);
    this.state = 'COLLECT_FOOD';
    this.stateTimer = 0;
  }

  update(
    dt: number,
    deltaRatio: number,
    otherSnakes: Snake[],
    foodManager: FoodManager,
    powerUps: PowerUp[] = [],
    selfCollision: boolean = false
  ): void {
    if (this.snake.isDead) return;

    this.stateTimer += dt;
    const arenaRadius = foodManager.arenaRadius || GAME_CONFIG.ARENA_RADIUS;

    // -------------------------------------------------------------------------
    // ANTI-SPIRAL / SPIN-LOCK BREAKOUT DETECTOR
    // -------------------------------------------------------------------------
    let dAngle = this.snake.angle - this.lastAngle;
    while (dAngle > Math.PI) dAngle -= Math.PI * 2;
    while (dAngle < -Math.PI) dAngle += Math.PI * 2;
    this.cumulativeTurnAngle += dAngle;
    this.lastAngle = this.snake.angle;

    this.spinAnchorTimer += dt;
    if (this.spinAnchorTimer >= 2.0) {
      const distFromAnchor = this.snake.position.dist(this.spinAnchorPos);
      const totalTurns = Math.abs(this.cumulativeTurnAngle);

      // If snake turned > 270 degrees in either direction within 2.0s with displacement < 220px:
      const isCoilingLivingPrey = this.state === 'CIRCLE' && this.lastSnapshot?.bestPrey != null;
      if (totalTurns > Math.PI * 1.5 && distFromAnchor < 220 && !isCoilingLivingPrey) {
        this.isBreakingSpiral = true;
        this.spiralBreakoutTimer = 2.2; // Break out for 2.2 seconds
        // Turn sharply outward away from current curvature to unwind loop
        const turnSign = Math.sign(this.cumulativeTurnAngle) || 1;
        this.spiralBreakoutAngle = this.snake.angle - turnSign * (Math.PI * 0.7);
        // Clear any stuck feast lock
        this.feastTarget = null;
        this.isKillerFeasting = false;
        this.state = 'WANDER';
        this.stateTimer = 0;
        this.pickNewMacroTarget(arenaRadius);
      }

      // Reset sample window
      this.cumulativeTurnAngle = 0;
      this.spinAnchorPos = this.snake.position.clone();
      this.spinAnchorTimer = 0;
    }

    if (this.isBreakingSpiral) {
      this.spiralBreakoutTimer -= dt;
      if (this.spiralBreakoutTimer <= 0) {
        this.isBreakingSpiral = false;
      }
    }

    // -------------------------------------------------------------------------
    // 1. DYNAMIC FEAST LOCK DECAY
    // -------------------------------------------------------------------------
    if (this.feastTarget) {
      this.feastTimer -= dt;
      let remainingFoodMass = 0;
      const nearbyFeastFood = foodManager.spatialGrid.queryRadius(this.feastTarget.x, this.feastTarget.y, 250);
      for (const item of nearbyFeastFood) {
        if (item.data && (item.data.type === 'corpse' || item.data.type === 'super' || item.data.value >= 4)) {
          remainingFoodMass += item.data.value;
        }
      }

      if (this.feastTimer <= 0 || remainingFoodMass < 6) {
        this.feastTarget = null;
        this.isKillerFeasting = false;
        this.feastTimer = 0;
        this.pickNewMacroTarget(arenaRadius);
      }
    }

    // -------------------------------------------------------------------------
    // 2. MACRO DESTINATION RENEWAL
    // -------------------------------------------------------------------------
    this.macroTimer += dt;
    if (
      !this.isKillerFeasting &&
      (this.macroTimer >= this.macroDuration || this.snake.position.dist(this.macroTarget) < 220)
    ) {
      this.pickNewMacroTarget(arenaRadius);
    }

    // -------------------------------------------------------------------------
    // 3. HUMAN-LIKE MISTAKE & HESITATION CYCLE
    // -------------------------------------------------------------------------
    this.mistakeTimer += dt;
    if (this.mistakeTimer > 2.5) {
      this.mistakeTimer = 0;
      if (this.tier === 'easy' && Math.random() < 0.22) {
        // Easy bot hesitates or misjudges steering arc
        this.mistakeOffsetAngle = (Math.random() - 0.5) * 0.45;
      } else if (this.tier === 'medium' && Math.random() < 0.06) {
        this.mistakeOffsetAngle = (Math.random() - 0.5) * 0.22;
      } else {
        this.mistakeOffsetAngle = 0;
      }
    }

    // -------------------------------------------------------------------------
    // 4. STAGGERED AI THINK EVALUATION
    // -------------------------------------------------------------------------
    this.thinkTimer += dt;
    if (this.thinkTimer >= this.thinkInterval) {
      this.thinkTimer = 0;

      // Step A: Environment Perception (non-omniscient, local spatial awareness)
      const snapshot = BotSensorySystem.perceive(
        this.snake,
        this.tier,
        this.personality,
        otherSnakes,
        foodManager,
        powerUps,
        selfCollision,
        this.viewDistance
      );
      this.lastSnapshot = snapshot;

      // Step B: Utility Evaluation & State Selection
      const utilityScores = BotUtilityEvaluator.evaluate(
        this.snake,
        this.tier,
        this.personality,
        snapshot,
        this.state,
        this.stateTimer,
        this.isKillerFeasting,
        this.isBreakingSpiral
      );
      this.lastUtilityScores = utilityScores;

      if (this.state !== utilityScores.selectedState) {
        this.state = utilityScores.selectedState;
        this.stateTimer = 0;
        // Invert or randomize orbit direction occasionally on entering circle
        if (this.state === 'CIRCLE') {
          this.orbitClockwise = Math.random() < 0.5;
        }
      }

      // Step C: Tactical Planning (calculate target angle, intercept cut, coiling point, etc.)
      const tacticalPlan = TacticalBehaviors.plan(
        this.snake,
        this.state,
        this.tier,
        this.personality,
        snapshot,
        this.macroTarget,
        this.feastTarget,
        this.orbitClockwise,
        this.isBreakingSpiral,
        this.spiralBreakoutAngle
      );

      // Apply mistake offset angle if non-emergency
      if (this.mistakeOffsetAngle !== 0 && this.state !== 'SURVIVE' && this.state !== 'EVADE') {
        tacticalPlan.targetAngle += this.mistakeOffsetAngle;
      }

      // Step D: Context Steering (32-ray danger & interest map, turn radius clearance, smoothing)
      const decision = this.steeringEngine.evaluate(
        this.snake,
        this.state,
        this.tier,
        this.personality,
        tacticalPlan,
        otherSnakes,
        foodManager,
        selfCollision,
        snapshot.viewDistance
      );

      this.lastDecision = decision;
      this.lockedAngle = decision.chosenAngle;
      this.snake.isBoosting = decision.shouldBoost;
    }

    // -------------------------------------------------------------------------
    // 5. NATURAL SNAKE STEERING INTERPOLATION
    // -------------------------------------------------------------------------
    // Pass target angle directly into the snake physics.
    // The snake engine applies turnRate * deltaRatio to smoothly turn without artificial lag.
    this.snake.setTargetAngle(this.lockedAngle);
  }
}
