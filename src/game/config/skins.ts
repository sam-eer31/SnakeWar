export interface SnakeSkin {
  id: string;
  name: string;
  category: 'neon' | 'elemental' | 'pattern' | 'special';
  headColor: string;
  bodyColors: string[];
  eyeColor: string;
  pupilColor: string;
  glowColor: string;
  patternType: 'solid' | 'striped' | 'gradient' | 'spotted' | 'cosmic';
  accessory?: 'horns' | 'crown' | 'halo' | 'glasses' | 'none';
  trailColor?: string;
}

export const SKINS: SnakeSkin[] = [
  {
    id: 'cyber-neon',
    name: 'Cyberpunk Neon',
    category: 'neon',
    headColor: '#00f2fe',
    bodyColors: ['#00f2fe', '#4facfe', '#00c6ff', '#0072ff'],
    eyeColor: '#ffffff',
    pupilColor: '#0f172a',
    glowColor: 'rgba(0, 242, 254, 0.6)',
    patternType: 'striped',
    accessory: 'horns',
    trailColor: '#00f2fe',
  },
  {
    id: 'magma-fury',
    name: 'Magma Fury',
    category: 'elemental',
    headColor: '#ff0844',
    bodyColors: ['#ff0844', '#ff4e50', '#f9d423', '#ff8008'],
    eyeColor: '#fffb00',
    pupilColor: '#3a0007',
    glowColor: 'rgba(255, 78, 80, 0.6)',
    patternType: 'gradient',
    accessory: 'horns',
    trailColor: '#ff4e50',
  },
  {
    id: 'galaxy-void',
    name: 'Galaxy Void',
    category: 'special',
    headColor: '#b92b27',
    bodyColors: ['#8e2de2', '#4a00e0', '#654ea3', '#eaafc8'],
    eyeColor: '#00ffff',
    pupilColor: '#12002b',
    glowColor: 'rgba(142, 45, 226, 0.7)',
    patternType: 'cosmic',
    accessory: 'halo',
    trailColor: '#8e2de2',
  },
  {
    id: 'toxic-acid',
    name: 'Toxic Viper',
    category: 'elemental',
    headColor: '#10b981',
    bodyColors: ['#10b981', '#34d399', '#a3e635', '#22c55e'],
    eyeColor: '#ffffff',
    pupilColor: '#064e3b',
    glowColor: 'rgba(52, 211, 153, 0.6)',
    patternType: 'striped',
    accessory: 'horns',
    trailColor: '#34d399',
  },
  {
    id: 'rainbow-prism',
    name: 'Rainbow Prism',
    category: 'neon',
    headColor: '#ff007f',
    bodyColors: ['#ff007f', '#ff7700', '#ffdd00', '#00e176', '#00bfff', '#9900ff'],
    eyeColor: '#ffffff',
    pupilColor: '#1e1b4b',
    glowColor: 'rgba(255, 0, 127, 0.6)',
    patternType: 'striped',
    accessory: 'crown',
    trailColor: '#ffdd00',
  },
  {
    id: 'golden-emperor',
    name: 'Golden Sovereign',
    category: 'special',
    headColor: '#fbbf24',
    bodyColors: ['#fbbf24', '#f59e0b', '#d97706', '#b45309'],
    eyeColor: '#ffffff',
    pupilColor: '#451a03',
    glowColor: 'rgba(251, 191, 36, 0.7)',
    patternType: 'spotted',
    accessory: 'crown',
    trailColor: '#fbbf24',
  },
  {
    id: 'candy-pastel',
    name: 'Cotton Candy',
    category: 'pattern',
    headColor: '#f472b6',
    bodyColors: ['#f472b6', '#38bdf8', '#c084fc', '#fbcfe8'],
    eyeColor: '#ffffff',
    pupilColor: '#4c1d95',
    glowColor: 'rgba(244, 114, 182, 0.5)',
    patternType: 'striped',
    accessory: 'halo',
    trailColor: '#f472b6',
  },
  {
    id: 'stealth-shadow',
    name: 'Stealth Phantom',
    category: 'special',
    headColor: '#334155',
    bodyColors: ['#1e293b', '#0f172a', '#334155', '#475569'],
    eyeColor: '#ef4444',
    pupilColor: '#000000',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    patternType: 'gradient',
    accessory: 'glasses',
    trailColor: '#ef4444',
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

