import { SnakeSkin, SKINS } from '../config/skins';

export interface SnakeSprites {
  head: HTMLImageElement;
  bandA: HTMLImageElement;
  bandB: HTMLImageElement;
  tail: HTMLImageElement;
  tongue: HTMLImageElement;
}

// In-memory cache for pre-rasterized SVG sprite images
const spriteCache: Map<string, SnakeSprites> = new Map();

/**
 * Build SVG string for the hand-drawn illustrated viper/python head
 */
function createHeadSvg(skin: SnakeSkin): string {
  const headColor = skin.headColor;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="120" height="100">
  <defs>
    <filter id="inkShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="2" dy="3" stdDeviation="1.5" flood-color="rgba(0,0,0,0.22)" />
    </filter>
  </defs>
  <!-- Main Head Contour with Dark Ink Outline -->
  <path d="M 112,50 C 108,62 95,72 82,78 C 65,86 45,88 32,84 C 20,80 15,68 12,58 C 10,54 8,50 8,50 C 8,50 10,46 12,42 C 15,32 20,20 32,16 C 45,12 65,14 82,22 C 95,28 108,38 112,50 Z" 
        fill="${headColor}" stroke="#18181b" stroke-width="4.5" stroke-linejoin="round" filter="url(#inkShadow)" />
  
  <!-- Inked Cranial Scale Plate Suture Lines -->
  <polygon points="75,50 55,68 32,60 22,50 32,40 55,32" fill="none" stroke="#18181b" stroke-width="2.5" stroke-linejoin="round" opacity="0.65" />
  <line x1="75" y1="50" x2="105" y2="50" stroke="#18181b" stroke-width="2.5" opacity="0.75" />
  <line x1="22" y1="50" x2="8" y2="50" stroke="#18181b" stroke-width="2.5" opacity="0.75" />
  
  <!-- Mouth Slit at Snout Tip -->
  <line x1="102" y1="50" x2="114" y2="50" stroke="#18181b" stroke-width="3" stroke-linecap="round" />
  
  <!-- Dark Nostril Pits -->
  <ellipse cx="98" cy="43" rx="3.5" ry="2" transform="rotate(-15 98 43)" fill="#18181b" />
  <ellipse cx="98" cy="57" rx="3.5" ry="2" transform="rotate(15 98 57)" fill="#18181b" />

  <!-- Expressive Eyes (matching reference illustration) -->
  <!-- Right Eye -->
  <ellipse cx="68" cy="27" rx="8" ry="6" transform="rotate(12 68 27)" fill="#ffffff" stroke="#18181b" stroke-width="2.6" />
  <circle cx="70" cy="27" r="4.2" fill="#18181b" />
  <circle cx="72" cy="25" r="1.5" fill="#ffffff" />
  <path d="M 58,21 Q 68,17 78,24" fill="none" stroke="#18181b" stroke-width="2.8" stroke-linecap="round" />

  <!-- Left Eye -->
  <ellipse cx="68" cy="73" rx="8" ry="6" transform="rotate(-12 68 73)" fill="#ffffff" stroke="#18181b" stroke-width="2.6" />
  <circle cx="70" cy="73" r="4.2" fill="#18181b" />
  <circle cx="72" cy="71" r="1.5" fill="#ffffff" />
  <path d="M 58,79 Q 68,83 78,76" fill="none" stroke="#18181b" stroke-width="2.8" stroke-linecap="round" />
</svg>
`.trim();
}

/**
 * Build SVG string for Band A (Primary color segment with diamond cross-hatch scales)
 */
function createBandASvg(color: string): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <defs>
    <filter id="discShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="1.5" dy="2.5" stdDeviation="1" flood-color="rgba(0,0,0,0.2)" />
    </filter>
  </defs>
  <!-- Segment Base Disc -->
  <circle cx="40" cy="40" r="36" fill="${color}" stroke="#18181b" stroke-width="4.0" filter="url(#discShadow)" />
  
  <!-- Hand-Inked Diamond Scale Cross-Hatch Lines (\\ / \\ /) -->
  <path d="M 18,22 L 62,58 M 20,40 L 60,76 M 20,4 L 60,40 M 18,58 L 62,22 M 20,76 L 60,40 M 20,40 L 60,4" 
        fill="none" stroke="#18181b" stroke-width="2.2" stroke-linecap="round" opacity="0.65" />
  
  <!-- Underbelly / Ventral Scute Plate Notches -->
  <path d="M 8,30 Q 18,30 22,33 M 8,40 Q 18,40 22,43 M 8,50 Q 18,50 22,53" 
        fill="none" stroke="#18181b" stroke-width="2.2" stroke-linecap="round" opacity="0.55" />
</svg>
`.trim();
}

/**
 * Build SVG string for Band B (Secondary alternating color band with black ring border)
 */
function createBandBSvg(color: string): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <defs>
    <filter id="discShadowB" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="1.5" dy="2.5" stdDeviation="1" flood-color="rgba(0,0,0,0.2)" />
    </filter>
  </defs>
  <!-- Segment Base Disc -->
  <circle cx="40" cy="40" r="36" fill="${color}" stroke="#18181b" stroke-width="4.5" filter="url(#discShadowB)" />
  
  <!-- Bold Transverse Ring Accent -->
  <path d="M 10,40 Q 40,46 70,40" fill="none" stroke="#18181b" stroke-width="3.2" stroke-linecap="round" opacity="0.8" />
  
  <!-- Diamond Scale Cross-Hatch Lines -->
  <path d="M 18,22 L 62,58 M 20,40 L 60,76 M 20,4 L 60,40 M 18,58 L 62,22 M 20,76 L 60,40 M 20,40 L 60,4" 
        fill="none" stroke="#18181b" stroke-width="2.2" stroke-linecap="round" opacity="0.65" />
  
  <!-- Underbelly Scute Notches -->
  <path d="M 8,30 Q 18,30 22,33 M 8,40 Q 18,40 22,43 M 8,50 Q 18,50 22,53" 
        fill="none" stroke="#18181b" stroke-width="2.2" stroke-linecap="round" opacity="0.55" />
</svg>
`.trim();
}

/**
 * Build SVG string for the tapered needle tail tip
 */
function createTailSvg(color: string): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" width="100" height="60">
  <!-- Sinuous Tapered Needle Tail Tip -->
  <path d="M 4,14 C 32,17 68,25 96,30 C 68,35 32,43 4,46 Z" 
        fill="${color}" stroke="#18181b" stroke-width="4.0" stroke-linejoin="round" />
  
  <!-- Inked Tail Cross-Hatching -->
  <path d="M 16,21 L 42,35 M 16,39 L 42,25 M 36,25 L 62,33 M 36,35 L 62,27" 
        fill="none" stroke="#18181b" stroke-width="2" stroke-linecap="round" opacity="0.7" />
</svg>
`.trim();
}

/**
 * Build SVG string for the classical jet-black forked Y-tongue
 */
function createTongueSvg(): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" width="60" height="40">
  <path d="M 2,20 L 34,20 M 34,20 Q 44,16 56,10 M 34,20 Q 44,24 56,30" 
        fill="none" stroke="#0a0a0a" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`.trim();
}

function getSkinFolder(skinId: string): string {
  switch (skinId) {
    case 'magma-fury':
      return '/assets/snakes/coral';
    case 'toxic-acid':
      return '/assets/snakes/viper';
    case 'cyber-neon':
      return '/assets/snakes/krait';
    case 'golden-emperor':
      return '/assets/snakes/rattlesnake';
    default:
      return '/assets/snakes/coral';
  }
}

function loadFileImage(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

/**
 * Get or load physical illustrated SVG file sprites for a skin
 */
export function getSnakeSprites(skin: SnakeSkin): SnakeSprites {
  let sprites = spriteCache.get(skin.id);
  if (sprites) return sprites;

  const folder = getSkinFolder(skin.id);

  sprites = {
    head: loadFileImage(`${folder}/head.svg`),
    bandA: loadFileImage(`${folder}/body_a.svg`),
    bandB: loadFileImage(`${folder}/body_b.svg`),
    tail: loadFileImage(`${folder}/tail.svg`),
    tongue: loadFileImage(`/assets/snakes/coral/tongue.svg`),
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

