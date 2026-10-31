import { GameMode } from './constants';

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';
export type ControlScheme = 'mouse' | 'keyboard' | 'touch';

export interface GameSettings {
  playerName: string;
  selectedSkinId: string;
  gameMode: GameMode;
  graphicsQuality: GraphicsQuality;
  glowEffects: boolean;
  particles: boolean;
  screenShake: boolean;
  soundVolume: number; // 0 to 1
  soundMuted: boolean;
  controlScheme: ControlScheme;
  showFps: boolean;
  showMinimap: boolean;
  autoBoostOnTouch: boolean;
  selfCollision: boolean; // false by default: allows crossing own body freely
}

export const DEFAULT_SETTINGS: GameSettings = {
  playerName: 'Player 1',
  selectedSkinId: 'emerald-dragon',
  gameMode: 'classic',
  graphicsQuality: 'high',
  glowEffects: true,
  particles: true,
  screenShake: true,
  soundVolume: 0.7,
  soundMuted: false,
  controlScheme: 'mouse',
  showFps: false,
  showMinimap: true,
  autoBoostOnTouch: false,
  selfCollision: false,
};

const STORAGE_KEY = 'snake_io_settings_v1';

export function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

