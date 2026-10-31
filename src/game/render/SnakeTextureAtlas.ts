import { SnakeSkin, SKINS } from '../config/skins';

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

function loadFileImage(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

/**
 * Get or load physical 3D dragon sprite assets for a skin
 */
export function getSnakeSprites(skin: SnakeSkin): SnakeSprites {
  let sprites = spriteCache.get(skin.id);
  if (sprites) return sprites;

  const folder = getSkinFolder(skin.id);

  sprites = {
    head: loadFileImage(`${folder}/head.png`),
    body: loadFileImage(`${folder}/body.png`),
    tail: loadFileImage(`${folder}/tail.png`),
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
