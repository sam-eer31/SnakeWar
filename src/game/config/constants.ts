/**
 * Game Balance and Configuration Constants
 */
export const GAME_CONFIG = {
  // Arena (Massive Slither Scale)
  WORLD_SIZE: 9000, // World diameter/dimension
  ARENA_RADIUS: 4500, // Circular arena radius (Massive Slither Arena)

  // Snake Physics & Sizing (Authentic Slither.io / Worm.io pacing)
  INITIAL_SNAKE_LENGTH: 15,
  INITIAL_RADIUS: 14,
  MAX_RADIUS: 52, // Standard Slither max thickness
  SEGMENT_DISTANCE: 5.8, // Distance between body segments
  BASE_SPEED: 2.85, // Authentic Slither/Worm.io base forward velocity
  BOOST_SPEED_MULTIPLIER: 1.85, // Velocity when boosting (approx 5.28)
  BASE_TURN_SPEED: 0.075, // Radians per frame turn rate
  MIN_TURN_SPEED: 0.035, // Turn rate at maximum size
  
  // Growth & Mass (Standard Slither Standards)
  BASE_MASS: 50,
  MASS_GROWTH_FACTOR: 0.002,
  BOOST_MASS_LOSS_RATE: 0.22, // Sustainable mass loss when boosting
  BOOST_MIN_MASS: 50, // Cannot boost below initial base mass
  BOOST_DROP_INTERVAL: 6, // Spawn a food pellet every X boost frames
  
  // Camera (Authentic Slither.io Distance & Dynamic Zoom)
  CAMERA_SMOOTHING: 0.09,
  BASE_ZOOM: 1.68,
  MIN_ZOOM: 0.52,

  // Spawning & Population
  MAX_FOOD_COUNT: 2500,
  SUPER_FOOD_COUNT: 45,
  POWERUP_COUNT: 18,
  BOT_COUNT: 38,

  // Food Values
  FOOD_VALUE_TINY: 1,
  FOOD_VALUE_SMALL: 2,
  FOOD_VALUE_MEDIUM: 5,
  FOOD_VALUE_LARGE: 12,
  FOOD_VALUE_SUPER: 30,

  // Collision Detection
  SPATIAL_GRID_CELL_SIZE: 160,
  HEAD_COLLISION_RADIUS_FACTOR: 0.85,
  BODY_COLLISION_RADIUS_FACTOR: 0.9,
  EAT_MAGNET_RADIUS_BASE: 25,

  // Power-Up Durations (milliseconds)
  MAGNET_DURATION: 12000,
  MULTIPLIER_DURATION: 10000,
  MULTIPLIER_5X_DURATION: 10000,
  SPEED_DURATION: 8000,
  GHOST_DURATION: 5000,
} as const;

export type GameMode = 'classic' | 'rush' | 'mayhem';

