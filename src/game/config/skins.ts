export interface SnakeSkin {
  id: string;
  name: string;
  category: 'neon' | 'elemental' | 'pattern' | 'special';
  headColor: string;
  bodyColors: string[];
  eyeColor: string;
  pupilColor: string;
  glowColor: string;
  trailColor?: string;
}

export const SKINS: SnakeSkin[] = [
  {
    id: 'emerald-dragon',
    name: 'Emerald Dragon',
    category: 'elemental',
    headColor: '#10b981',
    bodyColors: ['#10b981', '#34d399', '#a3e635', '#22c55e'],
    eyeColor: '#22c55e',
    pupilColor: '#052e16',
    glowColor: 'rgba(34, 197, 94, 0.7)',
    trailColor: '#22c55e',
  },
  {
    id: 'magma-obsidian',
    name: 'Magma Obsidian',
    category: 'elemental',
    headColor: '#ff0844',
    bodyColors: ['#ff0844', '#ff4e50', '#f9d423', '#ff8008'],
    eyeColor: '#ff4400',
    pupilColor: '#3a0007',
    glowColor: 'rgba(255, 68, 0, 0.75)',
    trailColor: '#ff4400',
  },
  {
    id: 'cosmic-void',
    name: 'Cosmic Void',
    category: 'special',
    headColor: '#8e2de2',
    bodyColors: ['#8e2de2', '#4a00e0', '#654ea3', '#eaafc8'],
    eyeColor: '#c084fc',
    pupilColor: '#12002b',
    glowColor: 'rgba(192, 132, 252, 0.75)',
    trailColor: '#c084fc',
  },
  {
    id: 'golden-sovereign',
    name: 'Golden Sovereign',
    category: 'special',
    headColor: '#fbbf24',
    bodyColors: ['#fbbf24', '#f59e0b', '#d97706', '#b45309'],
    eyeColor: '#ef4444',
    pupilColor: '#451a03',
    glowColor: 'rgba(251, 191, 36, 0.75)',
    trailColor: '#fbbf24',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    category: 'neon',
    headColor: '#00f2fe',
    bodyColors: ['#00f2fe', '#4facfe', '#00c6ff', '#0072ff'],
    eyeColor: '#00f2fe',
    pupilColor: '#082f49',
    glowColor: 'rgba(0, 242, 254, 0.7)',
    trailColor: '#00f2fe',
  },
];

export const BOT_NAMES = [
  'ViperKing', 'ShadowStalker', 'SlitherBot', 'ApexPredator', 'NeonGhost',
  'CosmicWorm', 'ByteBite', 'Hyperion', 'Venomous', 'Draco',
  'GlowWorm', 'TurboSlayer', 'Phantom99', 'TitanSerpent', 'Zenith',
  'NebulaBeast', 'PixelCoil', 'Vortex', 'Blitzkrieg', 'OmegaSnake',
  'Starlight', 'Eclipse', 'ThunderFang', 'Ragnarok', 'CrimsonFang',
  'HydroPython', 'Frostbite', 'InfernoCoil'
];
