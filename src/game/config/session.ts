export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface ArenaSessionConfig {
  sessionName: string;
  gameMode: 'classic' | 'rush' | 'mayhem';
  botDifficulty: BotDifficulty;   // 'easy' = only easy bots; 'medium' = easy + med mix; 'hard' = easy + med + hard mix
  selfCollision: boolean;         // false = Slither rule (can cross self), true = Classic Snake (bite tail = death)
  enablePowerUps: boolean;        // Spawn and activate Magnet, Turbo, 2x, Ghost
  botCount: number;               // 15 = Casual, 28 = Standard, 42 = Mayhem
  arenaRadius: number;            // 2500 = Compact, 3500 = Normal, 4500 = Massive
  foodDensity: 'low' | 'normal' | 'rich'; // Multiplier for food count
  timeLimitSeconds?: number;      // Optional match timer (for Rush mode)
}

export const DEFAULT_SESSION_CONFIG: ArenaSessionConfig = {
  sessionName: 'Arena Server #1',
  gameMode: 'classic',
  botDifficulty: 'medium',
  selfCollision: false,
  enablePowerUps: true,
  botCount: 38,
  arenaRadius: 4500,
  foodDensity: 'normal',
};

export interface SessionPreset {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  config: Partial<ArenaSessionConfig>;
}

export const SESSION_PRESETS: SessionPreset[] = [
  {
    id: 'standard',
    name: 'Standard Arena',
    tagline: 'Authentic Slither rules, mixed intelligence bots',
    icon: '⚡',
    config: {
      gameMode: 'classic',
      botDifficulty: 'medium',
      selfCollision: false,
      enablePowerUps: true,
      botCount: 38,
      arenaRadius: 4500,
      foodDensity: 'normal',
    },
  },
  {
    id: 'hardcore',
    name: 'Hardcore Apex',
    tagline: 'Lethal tail biting, hard AI bots with predictive traps',
    icon: '💀',
    config: {
      gameMode: 'classic',
      botDifficulty: 'hard',
      selfCollision: true,
      enablePowerUps: true,
      botCount: 45,
      arenaRadius: 4500,
      foodDensity: 'normal',
    },
  },
  {
    id: 'casual',
    name: 'Casual Garden',
    tagline: 'Gentle grazing bots, no self biting, easy practice',
    icon: '🌱',
    config: {
      gameMode: 'classic',
      botDifficulty: 'easy',
      selfCollision: false,
      enablePowerUps: true,
      botCount: 25,
      arenaRadius: 3200,
      foodDensity: 'rich',
    },
  },
  {
    id: 'mayhem',
    name: 'Mayhem Royale',
    tagline: '55 bots, all intelligence tiers, dense food & powerups',
    icon: '🔥',
    config: {
      gameMode: 'mayhem',
      botDifficulty: 'hard',
      selfCollision: false,
      enablePowerUps: true,
      botCount: 55,
      arenaRadius: 5000,
      foodDensity: 'rich',
    },
  },
];
