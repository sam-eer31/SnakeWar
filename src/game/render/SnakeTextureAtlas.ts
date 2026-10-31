import { SnakeSkin, SKINS } from '../config/skins';

export type SpriteDrawable = HTMLImageElement;

export interface SnakeSprites {
  head: HTMLImageElement;
  body: HTMLImageElement;
  tail: HTMLImageElement;
  glowColor: string;
  eyeColor: string;
}

// In-memory cache for preloaded 3D dragon serpent sprites
const spriteCache: Map<string, SnakeSprites> = new Map();

function getSkinFolder(skinId: string): string {
  switch (skinId) {
    case 'emerald-dragon':
    case 'toxic-acid':
      return '/assets/snakes/emerald';
    case 'magma-obsidian':
    case 'magma-fury':
      return '/assets/snakes/magma';
    case 'cosmic-void':
    case 'galaxy-void':
      return '/assets/snakes/void';
    case 'golden-sovereign':
    case 'golden-emperor':
      return '/assets/snakes/gold';
    case 'cyber-neon':
      return '/assets/snakes/cyber';
    default:
      return '/assets/snakes/emerald';
  }
}

function loadWebpImage(src: string): HTMLImageElement {
  if (typeof Image === 'undefined') {
    return {} as HTMLImageElement;
  }
  const img = new Image();
  img.src = src;
  return img;
}

export function isSpriteReady(sprite: HTMLImageElement | null | undefined): boolean {
  return !!sprite && sprite.complete && sprite.naturalWidth > 0;
}

export function getSpriteDimensions(sprite: HTMLImageElement): { width: number; height: number } {
  return {
    width: sprite?.naturalWidth || 1,
    height: sprite?.naturalHeight || 1,
  };
}

/**
 * Get or load physical 3D dragon sprite assets for a skin
 * All skins now use ultra-lightweight, high-definition WebP textures
 */
export function getSnakeSprites(skin: SnakeSkin): SnakeSprites {
  let sprites = spriteCache.get(skin.id);
  if (sprites) return sprites;

  const folder = getSkinFolder(skin.id);

  sprites = {
    head: loadWebpImage(`${folder}/head.webp`),
    body: loadWebpImage(`${folder}/body.webp`),
    tail: loadWebpImage(`${folder}/tail.webp`),
    glowColor: skin.glowColor || 'rgba(16, 185, 129, 0.6)',
    eyeColor: skin.eyeColor || '#4ade80',
  };

  spriteCache.set(skin.id, sprites);
  return sprites;
}

/**
 * Pre-cache all skins at application startup
 */
export function preheatSnakeSpriteAtlas(): void {
  for (const skin of SKINS) {
    getSnakeSprites(skin);
  }
}
