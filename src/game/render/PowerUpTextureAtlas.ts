import { PowerUpType, POWERUP_CONFIGS } from '../entities/PowerUp';

// In-memory cache for preloaded power-up textures
const powerUpImageCache: Map<PowerUpType, HTMLImageElement> = new Map();

/**
 * Get or load the high-definition WebP graphic for a power-up
 */
export function getPowerUpImage(type: PowerUpType): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;

  let img = powerUpImageCache.get(type);
  if (!img) {
    img = new Image();
    img.src = POWERUP_CONFIGS[type].imageSrc;
    powerUpImageCache.set(type, img);
  }
  return img;
}

/**
 * Pre-cache all power-up graphics at game startup
 */
export function preheatPowerUpTextures(): void {
  if (typeof window === 'undefined') return;
  const types: PowerUpType[] = ['magnet', 'multiplier', 'turbo', 'ghost'];
  for (const t of types) {
    getPowerUpImage(t);
  }
}

if (typeof window !== 'undefined') {
  preheatPowerUpTextures();
}
