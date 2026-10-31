import { Vector2D } from '../core/Vector2D';
import { GAME_CONFIG } from '../config/constants';
import { SpatialHashGrid } from '../core/SpatialHashGrid';

export type FoodType = 'regular' | 'boost_remnant' | 'super' | 'corpse';

const FOOD_COLORS = [
  '#f43f5e', '#ec4899', '#d946ef', '#a855f7',
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9',
  '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
  '#84cc16', '#eab308', '#f97316', '#ef4444'
];

export class FoodItem {
  public id: string;
  public position: Vector2D;
  public velocity: Vector2D;
  public value: number;
  public radius: number;
  public baseRadius: number;
  public color: string;
  public glowColor: string;
  public type: FoodType;
  public pulsePhase: number;
  public pulseSpeed: number;
  public beingAttractedTo: string | null = null;

  constructor(
    id: string,
    x: number,
    y: number,
    value: number = 2,
    type: FoodType = 'regular',
    color?: string
  ) {
    this.id = id;
    this.position = new Vector2D(x, y);
    this.velocity = new Vector2D(0, 0);
    this.value = value;
    this.type = type;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.04 + Math.random() * 0.03;

    // Sizing based on food value
    if (type === 'super') {
      this.baseRadius = 14;
    } else if (type === 'boost_remnant') {
      this.baseRadius = 4.5;
    } else {
      this.baseRadius = Math.min(12, Math.max(4, Math.sqrt(value) * 3));
    }
    this.radius = this.baseRadius;

    this.color = color || FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
    this.glowColor = this.color;
  }

  update(deltaRatio: number): void {
    this.pulsePhase += this.pulseSpeed * deltaRatio;
    this.radius = this.baseRadius + Math.sin(this.pulsePhase) * (this.baseRadius * 0.18);

    // If moving due to magnet attraction or velocity
    if (this.velocity.magSq() > 0.001) {
      this.position.addMut(this.velocity.mul(deltaRatio));
      this.velocity.mulMut(0.92); // Drag
    }

    // Wander slightly if super food
    if (this.type === 'super') {
      this.position.x += Math.cos(this.pulsePhase * 0.5) * 0.3 * deltaRatio;
      this.position.y += Math.sin(this.pulsePhase * 0.5) * 0.3 * deltaRatio;
    }
  }

  attractTowards(targetX: number, targetY: number, strength: number = 1): void {
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 1) return;

    const dist = Math.sqrt(distSq);
    const pullSpeed = Math.min(18, (strength * 450) / Math.max(30, dist));
    this.velocity.x += (dx / dist) * pullSpeed;
    this.velocity.y += (dy / dist) * pullSpeed;
  }
}

export class FoodManager {
  public foodItems: Map<string, FoodItem> = new Map();
  private nextId: number = 1;
  public spatialGrid: SpatialHashGrid<FoodItem>;
  public arenaRadius: number = GAME_CONFIG.ARENA_RADIUS;
  public maxFoodCount: number = GAME_CONFIG.MAX_FOOD_COUNT;

  // Track state changes for PartyKit edge broadcast
  public pendingEatenIds: number[] = [];
  public pendingNewFood: { id: number; x: number; y: number; v: number; t: 'regular' | 'boost_remnant' | 'super' | 'corpse'; c?: string | null }[] = [];

  constructor() {
    this.spatialGrid = new SpatialHashGrid<FoodItem>(GAME_CONFIG.SPATIAL_GRID_CELL_SIZE);
  }

  init(initialCount: number = GAME_CONFIG.MAX_FOOD_COUNT, arenaRadius: number = GAME_CONFIG.ARENA_RADIUS): void {
    this.arenaRadius = arenaRadius;
    this.maxFoodCount = initialCount;
    this.foodItems.clear();
    this.spatialGrid.clear();
    for (let i = 0; i < initialCount; i++) {
      this.spawnRandomFood();
    }
    for (let i = 0; i < GAME_CONFIG.SUPER_FOOD_COUNT; i++) {
      this.spawnSuperFood();
    }
  }

  private registerFood(food: FoodItem): FoodItem {
    this.foodItems.set(food.id, food);
    this.spatialGrid.insert({
      id: food.id,
      x: food.position.x,
      y: food.position.y,
      radius: food.radius,
      data: food,
    });

    const numericId = parseInt(food.id.replace(/\D/g, '') || '0', 10);
    if (numericId > 0 && this.pendingNewFood.length < 200) {
      this.pendingNewFood.push({
        id: numericId,
        x: Math.round(food.position.x),
        y: Math.round(food.position.y),
        v: food.value,
        t: food.type,
        c: food.color,
      });
    }

    return food;
  }

  private getRandomArenaPosition(): { x: number; y: number } {
    // Generate inside circular arena with uniform area distribution
    const r = Math.sqrt(Math.random()) * (this.arenaRadius - 80);
    const theta = Math.random() * Math.PI * 2;
    return {
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * r,
    };
  }

  spawnRandomFood(): FoodItem {
    const pos = this.getRandomArenaPosition();
    const id = `f_${this.nextId++}`;
    const value = Math.random() < 0.7 ? GAME_CONFIG.FOOD_VALUE_SMALL : GAME_CONFIG.FOOD_VALUE_MEDIUM;
    const food = new FoodItem(id, pos.x, pos.y, value, 'regular');
    return this.registerFood(food);
  }

  spawnSuperFood(): FoodItem {
    const pos = this.getRandomArenaPosition();
    const id = `sf_${this.nextId++}`;
    const food = new FoodItem(id, pos.x, pos.y, GAME_CONFIG.FOOD_VALUE_SUPER, 'super', '#ffd700');
    return this.registerFood(food);
  }

  spawnBoostPellet(x: number, y: number, color?: string): FoodItem {
    const id = `b_${this.nextId++}`;
    const food = new FoodItem(id, x, y, GAME_CONFIG.FOOD_VALUE_TINY, 'boost_remnant', color);
    return this.registerFood(food);
  }

  addFoodItem(id: string, x: number, y: number, value: number, type: FoodType = 'regular', color?: string): FoodItem {
    const food = new FoodItem(id, x, y, value, type, color);
    return this.registerFood(food);
  }

  spawnCorpsePellets(segments: { x: number; y: number }[], skinColor: string, totalMass: number): void {
    const count = Math.min(80, Math.max(12, Math.floor(segments.length * 0.75)));
    const valuePerPellet = Math.max(2, Math.floor((totalMass * 0.6) / count));
    
    for (let i = 0; i < count; i++) {
      const segIndex = Math.floor((i / count) * (segments.length - 1));
      const seg = segments[segIndex] || segments[0];
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = Math.random() * 25;
      const x = seg.x + Math.cos(offsetAngle) * offsetDist;
      const y = seg.y + Math.sin(offsetAngle) * offsetDist;

      const id = `cp_${this.nextId++}`;
      const food = new FoodItem(id, x, y, valuePerPellet, 'corpse', skinColor);
      this.registerFood(food);
    }
  }

  remove(id: string): void {
    const numericId = parseInt(id.replace(/\D/g, '') || '0', 10);
    if (numericId > 0 && this.pendingEatenIds.length < 300) {
      this.pendingEatenIds.push(numericId);
    }
    this.foodItems.delete(id);
    this.spatialGrid.remove(id);
  }

  getAndClearEatenFood(): number[] {
    const list = this.pendingEatenIds;
    this.pendingEatenIds = [];
    return list;
  }

  getAndClearNewFood() {
    const list = this.pendingNewFood;
    this.pendingNewFood = [];
    return list;
  }

  getAllFoodForSnapshot() {
    return Array.from(this.foodItems.values()).map((f) => {
      const numId = parseInt(f.id.replace(/\D/g, '') || '1', 10);
      return {
        id: numId,
        x: Math.round(f.position.x),
        y: Math.round(f.position.y),
        v: f.value,
        t: f.type,
        c: f.color,
      };
    });
  }

  update(deltaRatio: number): void {
    // Zero-allocation: only update and re-index items that actually move
    for (const food of this.foodItems.values()) {
      const isMoving = food.velocity.magSq() > 0.001 || food.type === 'super';
      if (isMoving) {
        food.update(deltaRatio);
        this.spatialGrid.updateItem({
          id: food.id,
          x: food.position.x,
          y: food.position.y,
          radius: food.radius,
          data: food,
        });
      }
    }

    // Replenish natural food if count drops below threshold
    if (this.foodItems.size < this.maxFoodCount) {
      const toSpawn = Math.min(10, this.maxFoodCount - this.foodItems.size);
      for (let i = 0; i < toSpawn; i++) {
        this.spawnRandomFood();
      }
    }
  }
}

