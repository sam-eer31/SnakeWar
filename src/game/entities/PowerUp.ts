import { Vector2D } from '../core/Vector2D';
import { GAME_CONFIG } from '../config/constants';

export type PowerUpType = 'magnet' | 'multiplier' | 'turbo' | 'ghost';

export interface PowerUpConfig {
  type: PowerUpType;
  label: string;
  icon: string;
  color: string;
  glowColor: string;
  duration: number;
}

export const POWERUP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  magnet: {
    type: 'magnet',
    label: 'Magnet',
    icon: '🧲',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.8)',
    duration: GAME_CONFIG.MAGNET_DURATION,
  },
  multiplier: {
    type: 'multiplier',
    label: '2x Mass',
    icon: '✖️2',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    duration: GAME_CONFIG.MULTIPLIER_DURATION,
  },
  turbo: {
    type: 'turbo',
    label: 'Turbo Rush',
    icon: '⚡',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.8)',
    duration: GAME_CONFIG.SPEED_DURATION,
  },
  ghost: {
    type: 'ghost',
    label: 'Ghost Phase',
    icon: '👻',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    duration: GAME_CONFIG.GHOST_DURATION,
  },
};

export class PowerUp {
  public id: string;
  public position: Vector2D;
  public type: PowerUpType;
  public radius: number = 22;
  public pulsePhase: number = Math.random() * Math.PI * 2;
  public rotation: number = 0;

  constructor(id: string, x: number, y: number, type: PowerUpType) {
    this.id = id;
    this.position = new Vector2D(x, y);
    this.type = type;
  }

  update(deltaRatio: number): void {
    this.pulsePhase += 0.05 * deltaRatio;
    this.rotation += 0.02 * deltaRatio;
  }
}

