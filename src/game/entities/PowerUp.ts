import { Vector2D } from '../core/Vector2D';
import { GAME_CONFIG } from '../config/constants';

export type PowerUpType = 'magnet' | 'multiplier' | 'multiplier_5x' | 'turbo' | 'ghost' | 'growth';

export const ALL_POWERUP_TYPES: PowerUpType[] = [
  'magnet',
  'multiplier',
  'multiplier_5x',
  'turbo',
  'ghost',
  'growth',
];

export interface PowerUpConfig {
  type: PowerUpType;
  label: string;
  icon: string;
  imageSrc: string;
  color: string;
  glowColor: string;
  duration: number;
}

export const POWERUP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  magnet: {
    type: 'magnet',
    label: 'Magnet',
    icon: '🧲',
    imageSrc: '/assets/powerups/magnet.webp',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.8)',
    duration: GAME_CONFIG.MAGNET_DURATION,
  },
  multiplier: {
    type: 'multiplier',
    label: '2x Mass',
    icon: '✖️2',
    imageSrc: '/assets/powerups/multiplier.webp',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    duration: GAME_CONFIG.MULTIPLIER_DURATION,
  },
  multiplier_5x: {
    type: 'multiplier_5x',
    label: '5x Mass',
    icon: '✖️5',
    imageSrc: '/assets/powerups/multiplier_5x.webp',
    color: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.8)',
    duration: GAME_CONFIG.MULTIPLIER_5X_DURATION,
  },
  turbo: {
    type: 'turbo',
    label: 'Turbo Rush',
    icon: '⚡',
    imageSrc: '/assets/powerups/turbo.webp',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.8)',
    duration: GAME_CONFIG.SPEED_DURATION,
  },
  ghost: {
    type: 'ghost',
    label: 'Ghost Phase',
    icon: '👻',
    imageSrc: '/assets/powerups/ghost.webp',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    duration: GAME_CONFIG.GHOST_DURATION,
  },
  growth: {
    type: 'growth',
    label: '+1000 Growth',
    icon: '🌱',
    imageSrc: '/assets/powerups/growth.webp',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    duration: 0, // Instant mass pickup
  },
};

export class PowerUp {
  public id: string;
  public position: Vector2D;
  public velocity: Vector2D = new Vector2D(0, 0);
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

    // Magnetic pull movement physics with smooth friction
    if (this.velocity.magSq() > 0.001) {
      this.position.x += this.velocity.x * deltaRatio;
      this.position.y += this.velocity.y * deltaRatio;
      this.velocity.mulMut(0.92);
    }
  }

  attractTowards(targetX: number, targetY: number, strength: number = 1): void {
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 1) return;

    const dist = Math.sqrt(distSq);
    // Smooth magnetic suction towards the snake's head
    const pullSpeed = Math.min(22, (strength * 480) / Math.max(25, dist));
    this.velocity.x += (dx / dist) * pullSpeed;
    this.velocity.y += (dy / dist) * pullSpeed;
  }
}

