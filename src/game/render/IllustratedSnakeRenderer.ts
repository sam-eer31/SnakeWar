import { Camera } from '../core/Camera';
import { Snake } from '../entities/Snake';
import { SnakeSkin } from '../config/skins';
import { getSnakeSprites, preheatSnakeSpriteAtlas, isSpriteReady, getSpriteDimensions } from './SnakeTextureAtlas';

if (typeof window !== 'undefined') {
  preheatSnakeSpriteAtlas();
}

const glowCanvasCache: Map<string, HTMLCanvasElement> = new Map();
function getSkinGlowCanvas(glowColor: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  let c = glowCanvasCache.get(glowColor);
  if (!c) {
    c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const gctx = c.getContext('2d');
    if (gctx) {
      const g = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, glowColor);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      gctx.fillStyle = g;
      gctx.beginPath();
      gctx.arc(64, 64, 64, 0, Math.PI * 2);
      gctx.fill();
    }
    glowCanvasCache.set(glowColor, c);
  }
  return c;
}

export interface IllustratedRenderOptions {
  enableGlow?: boolean;
}

interface Point2D {
  x: number;
  y: number;
  r: number;
  angle: number;
}

/**
 * Draw complete realistic 3D dragon serpent in world/camera space
 */
export function drawIllustratedSnake(
  ctx: CanvasRenderingContext2D,
  snake: Snake,
  camera: Camera,
  _options: IllustratedRenderOptions = {}
): void {
  if (snake.isDead || snake.segments.length === 0) return;

  const segCount = snake.segments.length;
  const skin = snake.skin;
  const isGhost = snake.hasPowerUp('ghost');

  ctx.save();
  if (isGhost) {
    ctx.globalAlpha = 0.55;
  } else if (snake.hasSpawnProtection) {
    const shieldPulse = 0.72 + Math.sin(Date.now() * 0.015) * 0.22;
    ctx.globalAlpha = shieldPulse;
  }

  // 1. Gather screen points
  const points: Point2D[] = [];
  for (let i = 0; i < segCount; i++) {
    const seg = snake.segments[i];
    const screen = camera.worldToScreen(seg.x, seg.y);
    const r = Math.max(1.8, seg.radius * camera.zoom);
    points.push({
      x: screen.x,
      y: screen.y,
      r,
      angle: seg.angle,
    });
  }

  const headScreen = camera.worldToScreen(snake.position.x, snake.position.y);
  const headRadius = Math.max(3.5, snake.radius * camera.zoom);
  const headPoint: Point2D = {
    x: headScreen.x,
    y: headScreen.y,
    r: headRadius * 0.95,
    angle: snake.angle,
  };

  const scale = camera.zoom;
  const tongue = snake.getTongueState ? snake.getTongueState() : { isOut: false, extension: 0, flutter: 0 };

  // Render body, tail, and head
  renderRealisticDragonSerpent(ctx, points, headPoint, skin, tongue, scale, snake.isBoosting);

  // 2. Spawn Protection Shield (if active)
  if (snake.hasSpawnProtection) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1.5, 2.5 * scale);
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(headScreen.x, headScreen.y, headRadius * 1.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Name Tag Badge
  ctx.font = `700 ${Math.max(10, Math.round(12 * scale))}px 'GameFont', 'Inter', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Real human players: pure white name with green accent tag border
  let nameColor = '#ffffff';
  let borderColor = 'rgba(34, 197, 94, 0.5)';

  if (snake.isBot) {
    if (snake.tier === 'easy') {
      nameColor = '#4ade80';
      borderColor = 'rgba(74, 222, 128, 0.4)';
    } else if (snake.tier === 'medium') {
      nameColor = '#facc15';
      borderColor = 'rgba(250, 204, 21, 0.4)';
    } else if (snake.tier === 'hard') {
      nameColor = '#f87171';
      borderColor = 'rgba(248, 113, 113, 0.5)';
    } else {
      nameColor = '#cbd5e1';
      borderColor = 'rgba(203, 213, 225, 0.3)';
    }
  } else if (snake.id === 'player') {
    // Local Player tag
    nameColor = '#ffffff';
    borderColor = 'rgba(56, 189, 248, 0.6)';
  }

  const tagText = snake.name;
  const textWidth = ctx.measureText(tagText).width;
  const tagY = headScreen.y - headRadius * 1.4 - 8 * scale;
  const pillH = Math.max(15, 17 * scale);
  const pillW = textWidth + 16 * scale;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(headScreen.x - pillW / 2, tagY - pillH + 2, pillW, pillH, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = nameColor;
  ctx.fillText(tagText, headScreen.x, tagY);

  ctx.restore();
}

/**
 * Draw slithering preview in UI canvases (Start Menu & Skin Selector)
 */
export function drawIllustratedSnakePreview(
  ctx: CanvasRenderingContext2D,
  skin: SnakeSkin,
  width: number,
  height: number,
  time: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const cx = width / 2;
  const cy = height / 2;
  const segCount = 20;
  const baseRadius = Math.min(width, height) * 0.12;

  const points: Point2D[] = [];
  for (let i = 0; i < segCount; i++) {
    const segDist = i * (baseRadius * 0.82);
    const wave = Math.sin(time * 1.8 - i * 0.38) * (baseRadius * 0.95);
    const x = cx - segDist + baseRadius * 4.2;
    const y = cy + wave;

    // Serpentine taper
    const u = i / (segCount - 1);
    let taper = 1.0;
    if (u < 0.08) {
      taper = 0.88 + 0.12 * (u / 0.08);
    } else if (u > 0.55) {
      const p = (u - 0.55) / 0.45;
      const cosP = Math.cos(p * Math.PI * 0.5);
      taper = 0.12 + 0.88 * (cosP * cosP);
    }
    const r = Math.max(2.0, baseRadius * taper);

    let angle = 0;
    if (i === 0) {
      const nextWave = Math.sin(time * 1.8 - 1 * 0.38) * (baseRadius * 0.95);
      const nextX = cx - (baseRadius * 0.82) + baseRadius * 4.2;
      const nextY = cy + nextWave;
      angle = Math.atan2(y - nextY, x - nextX);
    } else {
      angle = Math.atan2(points[i - 1].y - y, points[i - 1].x - x);
    }

    points.push({ x, y, r, angle });
  }

  const head = points[0];
  const headR = baseRadius * 1.15;
  const headPoint: Point2D = {
    x: head.x,
    y: head.y,
    r: headR,
    angle: head.angle,
  };

  const tongueCycle = (Math.sin(time * 3.5) + 1) / 2;
  const isTongueOut = tongueCycle > 0.65;
  const tongue = {
    isOut: isTongueOut,
    extension: isTongueOut ? (tongueCycle - 0.65) / 0.35 : 0,
    flutter: Math.sin(time * 20),
  };

  renderRealisticDragonSerpent(ctx, points, headPoint, skin, tongue, 1.0, false);
}

/**
 * Core AAA Realistic 3D Dragon Serpent Rendering Engine
 */
function renderRealisticDragonSerpent(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  headPoint: Point2D,
  skin: SnakeSkin,
  tongue: { isOut: boolean; extension: number; flutter: number },
  scale: number,
  isBoosting: boolean
): void {
  const segCount = points.length;
  if (segCount < 2) return;

  const sprites = typeof window !== 'undefined' ? getSnakeSprites(skin) : null;

  // Precompute left and right edge points
  interface EdgePoint {
    lx: number;
    ly: number;
    rx: number;
    ry: number;
  }
  const edges: EdgePoint[] = [];

  for (let i = 0; i < segCount; i++) {
    const p = points[i];
    const nx = -Math.sin(p.angle);
    const ny = Math.cos(p.angle);
    edges.push({
      lx: p.x - nx * p.r,
      ly: p.y - ny * p.r,
      rx: p.x + nx * p.r,
      ry: p.y + ny * p.r,
    });
  }

  // Tail tip vector
  const lastSeg = points[segCount - 1];
  const prevSeg = points[segCount - 2];
  const tailAngle = Math.atan2(lastSeg.y - prevSeg.y, lastSeg.x - prevSeg.x);
  const tipLen = lastSeg.r * 3.6;
  const tipX = lastSeg.x + Math.cos(tailAngle) * tipLen;
  const tipY = lastSeg.y + Math.sin(tailAngle) * tipLen;

  // 1. Volumetric Ground Ambient Occlusion / Drop Shadow
  const shadowOffX = 4.0 * scale;
  const shadowOffY = 6.0 * scale;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.moveTo(edges[0].lx + shadowOffX, edges[0].ly + shadowOffY);
  for (let i = 1; i < segCount; i++) {
    ctx.lineTo(edges[i].lx + shadowOffX, edges[i].ly + shadowOffY);
  }
  ctx.lineTo(tipX + shadowOffX, tipY + shadowOffY);
  for (let i = segCount - 1; i >= 0; i--) {
    ctx.lineTo(edges[i].rx + shadowOffX, edges[i].ry + shadowOffY);
  }
  ctx.closePath();
  ctx.fill();

  // Shadow under head
  ctx.beginPath();
  ctx.arc(headPoint.x + shadowOffX, headPoint.y + shadowOffY, headPoint.r * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Underlying Sub-skin Tube (prevents gaps during sharp turns with single-draw-call ribbon)
  ctx.save();
  const subSkinColor = skin.headColor || '#052e16';
  ctx.fillStyle = subSkinColor;
  ctx.beginPath();
  ctx.moveTo(edges[0].lx, edges[0].ly);
  for (let i = 1; i < segCount; i++) {
    ctx.lineTo(edges[i].lx, edges[i].ly);
  }
  ctx.lineTo(tipX, tipY);
  for (let i = segCount - 1; i >= 0; i--) {
    ctx.lineTo(edges[i].rx, edges[i].ry);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. 3D Tapered Tail Tip Sprite (drawn under the body so root connects seamlessly)
  if (sprites?.tail && isSpriteReady(sprites.tail)) {
    const tailH = lastSeg.r * 2.2;
    ctx.save();
    ctx.translate(lastSeg.x, lastSeg.y);
    ctx.rotate(tailAngle);
    ctx.drawImage(sprites.tail, -lastSeg.r * 0.15, -tailH * 0.5, tipLen, tailH);
    ctx.restore();
  }

  // 4. 3D Dragon Scale Body Segments (spaced by distance stride for smooth, high-fidelity scale flow)
  const hasBodySprite = !!sprites?.body && isSpriteReady(sprites.body);
  const baseTransform = ctx.getTransform();
  const dprX = baseTransform.a;
  const dprY = baseTransform.d;

  if (hasBodySprite) {
    // Select vertebra positions using cumulative distance stride (~0.68 * radius)
    const drawnIndices: number[] = [segCount - 1]; // start from tail
    for (let i = segCount - 2; i > 0; i--) {
      const p1 = points[i];
      const p2 = points[drawnIndices[drawnIndices.length - 1]];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const targetStep = Math.max(3.5, p1.r * 0.68);
      if (d >= targetStep) {
        drawnIndices.push(i);
      }
    }

    // Draw from tail to neck using direct hardware matrix writes (zero context save/restore state cloning)
    for (const idx of drawnIndices) {
      const p = points[idx];
      const segW = p.r * 2.15;
      const segH = p.r * 2.25;
      const cos = Math.cos(p.angle);
      const sin = Math.sin(p.angle);

      ctx.setTransform(cos * dprX, sin * dprY, -sin * dprX, cos * dprY, p.x * dprX, p.y * dprY);
      ctx.drawImage(sprites.body, -segW * 0.5, -segH * 0.5, segW, segH);
    }
    ctx.setTransform(baseTransform);
  } else {
    // High-contrast fallback scales if asset is still loading
    for (let i = segCount - 1; i >= 0; i--) {
      const p = points[i];
      const cos = Math.cos(p.angle);
      const sin = Math.sin(p.angle);

      ctx.setTransform(cos * dprX, sin * dprY, -sin * dprX, cos * dprY, p.x * dprX, p.y * dprY);

      // Base disc
      ctx.fillStyle = skin.bodyColors[i % skin.bodyColors.length] || skin.headColor;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();

      // Ridge highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = Math.max(1.2, 1.6 * scale);
      ctx.beginPath();
      ctx.moveTo(-p.r * 0.8, 0);
      ctx.lineTo(p.r * 0.8, 0);
      ctx.stroke();
    }
    ctx.setTransform(baseTransform);
  }

  // 5. Hyper-Realistic 3D Dragon Head (Majestic proportions matching the reference dragon)
  const R = Math.max(5.5, headPoint.r * 1.65);

  ctx.save();
  ctx.translate(headPoint.x, headPoint.y);
  ctx.rotate(headPoint.angle);

  // A. Forked Dragon Tongue
  if (tongue.isOut && tongue.extension > 0.05) {
    const headWEst = R * 2.85;
    const snoutX = headWEst * 0.52;
    const maxLen = 1.35 * R * tongue.extension;
    const forkStart = snoutX + maxLen * 0.65;
    const tipForkX = snoutX + maxLen;
    const forkSpread = 0.26 * R * tongue.extension;
    const flutterY = tongue.flutter * 0.08 * R;

    ctx.save();
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = Math.max(2.0, 2.5 * scale);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(snoutX, 0);
    ctx.lineTo(forkStart, flutterY * 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(forkStart, flutterY * 0.5);
    ctx.quadraticCurveTo(forkStart + maxLen * 0.18, -forkSpread * 0.5 + flutterY, tipForkX, -forkSpread + flutterY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(forkStart, flutterY * 0.5);
    ctx.quadraticCurveTo(forkStart + maxLen * 0.18, forkSpread * 0.5 + flutterY, tipForkX, forkSpread + flutterY);
    ctx.stroke();

    // Subtle neon tip glow on tongue
    ctx.fillStyle = skin.eyeColor || '#22c55e';
    ctx.beginPath();
    ctx.arc(tipForkX, -forkSpread + flutterY, 1.4 * scale, 0, Math.PI * 2);
    ctx.arc(tipForkX, forkSpread + flutterY, 1.4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // B. Draw 3D Dragon Head Sprite (High-resolution render with authentic glowing slit eyes)
  const hasHeadSprite = !!sprites?.head && isSpriteReady(sprites.head);

  if (hasHeadSprite && sprites?.head) {
    const { width: headW_orig, height: headH_orig } = getSpriteDimensions(sprites.head);
    const headAspect = headH_orig / headW_orig;
    const headW = R * 2.85;
    const headH = headW * headAspect;

    // Draw 3D Head aligned at neck
    ctx.drawImage(sprites.head, -headW * 0.42, -headH * 0.5, headW, headH);
  } else {
    // Clean fallback head while sprite loads
    ctx.fillStyle = skin.headColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.3, R * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
  }

  // D. Boosting Aura (pre-baked texture blit, zero runtime createRadialGradient CPU cost)
  if (isBoosting) {
    const glowCanvas = getSkinGlowCanvas(skin.glowColor || 'rgba(34, 197, 94, 0.45)');
    if (glowCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const size = R * 4.4;
      ctx.drawImage(glowCanvas, -size * 0.5, -size * 0.5, size, size);
      ctx.restore();
    }
  }

  ctx.restore();
}
