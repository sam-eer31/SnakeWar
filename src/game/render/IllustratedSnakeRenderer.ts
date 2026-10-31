import { Camera } from '../core/Camera';
import { Snake } from '../entities/Snake';
import { SnakeSkin } from '../config/skins';
import { getSnakeSprites, preheatSnakeSpriteAtlas } from './SnakeTextureAtlas';

if (typeof window !== 'undefined') {
  preheatSnakeSpriteAtlas();
}

export interface IllustratedRenderOptions {
  enableGlow?: boolean;
}

/**
 * Hand-drawn / Comic-illustrated Snake Renderer
 * Features:
 * - Bold dark-ink outer contour outlines
 * - Alternating colored body bands with dark demarcation rings (Coral/King snake style)
 * - Hand-inked diamond reptilian scale cross-hatching
 * - Sculpted viper/python head with dark inked outline & snout
 * - Expressive dark bead/reptile eyes with white glint & eyelid lines
 * - Slender jet-black forked tongue (Y-shaped) flicking from mouth
 * - Ultra-graceful, continuous tapered tail curving to a sharp needle tip
 */

interface Point2D {
  x: number;
  y: number;
  r: number;
  angle: number;
}

/**
 * Draw complete illustrated snake in world/camera space
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
    r: headRadius * 0.92,
    angle: snake.angle,
  };

  const scale = camera.zoom;
  const tongue = snake.getTongueState ? snake.getTongueState() : { isOut: false, extension: 0, flutter: 0 };

  // Render body, tail, and head
  renderIllustratedSerpent(ctx, points, headPoint, skin, tongue, scale, snake.isBoosting);

  // 2. Spawn Protection Shield (if active)
  if (snake.hasSpawnProtection) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1.5, 2.5 * scale);
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(headScreen.x, headScreen.y, headRadius * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Name Tag Badge
  ctx.font = `700 ${Math.max(10, Math.round(12 * scale))}px 'Inter', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  let nameColor = '#38bdf8';
  let borderColor = 'rgba(56, 189, 248, 0.4)';

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
  }

  const tagText = snake.name;
  const textWidth = ctx.measureText(tagText).width;
  const tagY = headScreen.y - headRadius * 1.3 - 6 * scale;
  const pillH = Math.max(14, 16 * scale);
  const pillW = textWidth + 14 * scale;

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

  const cx = width / 2;
  const cy = height / 2;
  const segCount = 16;
  const baseRadius = Math.min(width, height) * 0.125;

  const points: Point2D[] = [];
  for (let i = 0; i < segCount; i++) {
    const segDist = i * (baseRadius * 0.95);
    const wave = Math.sin(time - i * 0.42) * (baseRadius * 1.05);
    const x = cx - segDist + baseRadius * 3.8;
    const y = cy + wave;

    // Organic taper
    const u = i / (segCount - 1);
    let taper = 1.0;
    if (u < 0.08) {
      taper = 0.88 + 0.12 * (u / 0.08);
    } else if (u > 0.58) {
      const p = (u - 0.58) / 0.42;
      const cosP = Math.cos(p * Math.PI * 0.5);
      taper = 0.12 + 0.88 * (cosP * cosP);
    }
    const r = Math.max(1.8, baseRadius * taper);

    let angle = 0;
    if (i === 0) {
      const nextWave = Math.sin(time - 1 * 0.42) * (baseRadius * 1.05);
      const nextX = cx - (baseRadius * 0.95) + baseRadius * 3.8;
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
    r: headR * 0.92,
    angle: head.angle,
  };

  // Animated tongue flick for preview
  const tongueCycle = (Math.sin(time * 3.2) + 1) / 2;
  const isTongueOut = tongueCycle > 0.62;
  const tongue = {
    isOut: isTongueOut,
    extension: isTongueOut ? (tongueCycle - 0.62) / 0.38 : 0,
    flutter: Math.sin(time * 18),
  };

  renderIllustratedSerpent(ctx, points, headPoint, skin, tongue, 1.0, false);
}

/**
 * Core rendering pipeline for the hand-drawn / comic illustrated snake
 */
function renderIllustratedSerpent(
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

  const inkColor = '#18181b'; // Deep dark ink outline
  const outlineWidth = Math.max(2.0, 3.0 * scale);
  const ringWidth = Math.max(1.5, 2.2 * scale);
  const hatchWidth = Math.max(1.0, 1.3 * scale);

  const bodyPalette = skin.bodyColors;
  // Band colors: alternating primary and secondary colors (Coral/King snake banding)
  const bandA = bodyPalette[0];
  const bandB = bodyPalette[1] || bodyPalette[0];

  // Precompute left and right edge points for all segments
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

  // Tail tip calculation
  const lastSeg = points[segCount - 1];
  const prevSeg = points[segCount - 2];
  const tailAngle = Math.atan2(lastSeg.y - prevSeg.y, lastSeg.x - prevSeg.x);
  const tipLen = lastSeg.r * 2.4;
  const tipX = lastSeg.x + Math.cos(tailAngle) * tipLen;
  const tipY = lastSeg.y + Math.sin(tailAngle) * tipLen;

  // 1. Soft Ground Drop Shadow
  const shadowOffX = 3.0 * scale;
  const shadowOffY = 4.5 * scale;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  // Left side from head to tail
  ctx.moveTo(edges[0].lx + shadowOffX, edges[0].ly + shadowOffY);
  for (let i = 1; i < segCount; i++) {
    ctx.lineTo(edges[i].lx + shadowOffX, edges[i].ly + shadowOffY);
  }
  // To tail tip
  ctx.lineTo(tipX + shadowOffX, tipY + shadowOffY);
  // Right side from tail to head
  for (let i = segCount - 1; i >= 0; i--) {
    ctx.lineTo(edges[i].rx + shadowOffX, edges[i].ry + shadowOffY);
  }
  ctx.closePath();
  ctx.fill();

  // Shadow under head
  ctx.beginPath();
  ctx.arc(headPoint.x + shadowOffX, headPoint.y + shadowOffY, headPoint.r * 1.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Draw Solid Alternating Color Bands (Between Segments)
  for (let i = segCount - 1; i >= 0; i--) {
    const p1 = points[i];
    const p2 = i === 0 ? headPoint : points[i - 1];
    const e1 = edges[i];
    const e2 = i === 0 ? {
      lx: headPoint.x - (-Math.sin(headPoint.angle)) * headPoint.r,
      ly: headPoint.y - Math.cos(headPoint.angle) * headPoint.r,
      rx: headPoint.x + (-Math.sin(headPoint.angle)) * headPoint.r,
      ry: headPoint.y + Math.cos(headPoint.angle) * headPoint.r,
    } : edges[i - 1];

    // Determine band color: alternating bands of 2 segments
    const bandIndex = Math.floor(i / 2);
    let segColor = bandIndex % 2 === 0 ? bandA : bandB;
    if (skin.patternType === 'gradient') {
      const cIdx = Math.floor((i / segCount) * bodyPalette.length) % bodyPalette.length;
      segColor = bodyPalette[cIdx];
    } else if (skin.patternType === 'striped' && bodyPalette.length >= 3) {
      segColor = bodyPalette[i % bodyPalette.length];
    }

    // Fill connecting quad
    ctx.fillStyle = segColor;
    ctx.beginPath();
    ctx.moveTo(e1.lx, e1.ly);
    ctx.lineTo(e2.lx, e2.ly);
    ctx.lineTo(e2.rx, e2.ry);
    ctx.lineTo(e1.rx, e1.ry);
    ctx.closePath();
    ctx.fill();

    // Fill segment disc to eliminate any joint crevices
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, p1.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tail tip fill
  const lastEdge = edges[segCount - 1];
  const lastBandIndex = Math.floor((segCount - 1) / 2);
  ctx.fillStyle = lastBandIndex % 2 === 0 ? bandA : bandB;
  ctx.beginPath();
  ctx.moveTo(lastEdge.lx, lastEdge.ly);
  ctx.quadraticCurveTo(
    lastSeg.x + Math.cos(tailAngle) * (tipLen * 0.5),
    lastSeg.y + Math.sin(tailAngle) * (tipLen * 0.5),
    tipX,
    tipY
  );
  ctx.quadraticCurveTo(
    lastSeg.x + Math.cos(tailAngle) * (tipLen * 0.5),
    lastSeg.y + Math.sin(tailAngle) * (tipLen * 0.5),
    lastEdge.rx,
    lastEdge.ry
  );
  ctx.closePath();
  ctx.fill();

  // 3. Render Hand-Crafted SVG Scale Texture Sprites & Inked Cross-Hatching
  const sprites = typeof window !== 'undefined' ? getSnakeSprites(skin) : null;

  for (let i = segCount - 1; i >= 0; i--) {
    const p = points[i];
    const bandIndex = Math.floor(i / 2);
    const sprite = bandIndex % 2 === 0 ? sprites?.bandA : sprites?.bandB;

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      // Draw crisp vector SVG scale disc with authentic cross-hatching
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const spriteR = p.r * 1.08;
      ctx.drawImage(sprite, -spriteR, -spriteR, spriteR * 2, spriteR * 2);
      ctx.restore();
    } else {
      // Fallback in-canvas cross-hatching if sprite is loading
      if (p.r >= 2.5) {
        const tx = Math.cos(p.angle);
        const ty = Math.sin(p.angle);
        const nx = -ty;
        const ny = tx;
        const scaleLen = p.r * 0.68;
        ctx.strokeStyle = 'rgba(24, 24, 27, 0.48)';
        ctx.lineWidth = hatchWidth;
        for (const offset of [-0.45, 0, 0.45]) {
          const cx = p.x + nx * (p.r * offset);
          const cy = p.y + ny * (p.r * offset);
          ctx.beginPath();
          ctx.moveTo(cx - tx * (scaleLen * 0.5) - nx * (scaleLen * 0.45), cy - ty * (scaleLen * 0.5) - ny * (scaleLen * 0.45));
          ctx.lineTo(cx + tx * (scaleLen * 0.5) + nx * (scaleLen * 0.45), cy + ty * (scaleLen * 0.5) + ny * (scaleLen * 0.45));
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx - tx * (scaleLen * 0.5) + nx * (scaleLen * 0.45), cy - ty * (scaleLen * 0.5) + ny * (scaleLen * 0.45));
          ctx.lineTo(cx + tx * (scaleLen * 0.5) - nx * (scaleLen * 0.45), cy + ty * (scaleLen * 0.5) - ny * (scaleLen * 0.45));
          ctx.stroke();
        }
      }
    }
  }

  // Draw Tail Tip SVG Texture
  if (sprites?.tail && sprites.tail.complete && sprites.tail.naturalWidth > 0) {
    ctx.save();
    ctx.translate(lastSeg.x, lastSeg.y);
    ctx.rotate(tailAngle);
    ctx.drawImage(sprites.tail, 0, -lastSeg.r, tipLen, lastSeg.r * 2);
    ctx.restore();
  }

  // 4. Bold Inked Outer Body Contour (Continuous Dark Ink Boundary)
  ctx.save();
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = outlineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  // Trace Left flank from neck down to tail
  ctx.moveTo(edges[0].lx, edges[0].ly);
  for (let i = 1; i < segCount; i++) {
    ctx.lineTo(edges[i].lx, edges[i].ly);
  }
  // Curve down to pointed needle tail tip
  ctx.quadraticCurveTo(
    lastSeg.x + Math.cos(tailAngle) * (tipLen * 0.5),
    lastSeg.y + Math.sin(tailAngle) * (tipLen * 0.5),
    tipX,
    tipY
  );
  // Curve back along Right flank from tail up to neck
  ctx.quadraticCurveTo(
    lastSeg.x + Math.cos(tailAngle) * (tipLen * 0.5),
    lastSeg.y + Math.sin(tailAngle) * (tipLen * 0.5),
    lastEdge.rx,
    lastEdge.ry
  );
  for (let i = segCount - 2; i >= 0; i--) {
    ctx.lineTo(edges[i].rx, edges[i].ry);
  }
  ctx.stroke();
  ctx.restore();

  // 5. Illustrated Viper / Python Head
  const R = Math.max(4.0, headPoint.r * 1.15);

  ctx.save();
  ctx.translate(headPoint.x, headPoint.y);
  ctx.rotate(headPoint.angle);

  // A. Slender Jet-Black Forked Tongue (Animated Y-shape from snout)
  if (tongue.isOut && tongue.extension > 0.05) {
    if (sprites?.tongue && sprites.tongue.complete && sprites.tongue.naturalWidth > 0) {
      const tW = R * 1.55 * tongue.extension;
      const tH = R * 1.05 * tongue.extension;
      ctx.drawImage(sprites.tongue, R * 1.05, -tH * 0.5 + tongue.flutter * 0.08 * R, tW, tH);
    } else {
      const snoutX = 1.34 * R;
      const maxLen = 1.38 * R * tongue.extension;
      const forkStart = snoutX + maxLen * 0.65;
      const tipForkX = snoutX + maxLen;
      const forkSpread = 0.26 * R * tongue.extension;
      const flutterY = tongue.flutter * 0.08 * R;

      ctx.save();
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = Math.max(1.8, 2.4 * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
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
      ctx.restore();
    }
  }

  // B. Draw Head SVG Texture (with hand-inked eyes, cranial plates, nostrils, and ink outline)
  if (sprites?.head && sprites.head.complete && sprites.head.naturalWidth > 0) {
    const headW = R * 2.45;
    const headH = R * 2.05;
    // Align neck socket at (12/120) with (0,0)
    ctx.drawImage(sprites.head, -headW * 0.22, -headH * 0.5, headW, headH);
  } else {
    // Fallback head rendering if sprite is still loading
    const traceHeadPath = () => {
      ctx.beginPath();
      ctx.moveTo(1.34 * R, 0);
      ctx.bezierCurveTo(1.30 * R, 0.35 * R, 1.08 * R, 0.52 * R, 0.82 * R, 0.62 * R);
      ctx.bezierCurveTo(0.48 * R, 0.74 * R, 0.20 * R, 1.04 * R, -0.15 * R, 1.08 * R);
      ctx.bezierCurveTo(-0.55 * R, 1.10 * R, -0.78 * R, 0.88 * R, -0.88 * R, 0.62 * R);
      ctx.bezierCurveTo(-0.95 * R, 0.42 * R, -0.98 * R, 0.20 * R, -1.00 * R, 0);
      ctx.bezierCurveTo(-0.98 * R, -0.20 * R, -0.95 * R, -0.42 * R, -0.88 * R, -0.62 * R);
      ctx.bezierCurveTo(-0.78 * R, -0.88 * R, -0.55 * R, -1.10 * R, -0.15 * R, -1.08 * R);
      ctx.bezierCurveTo(0.20 * R, -1.04 * R, 0.48 * R, -0.74 * R, 0.82 * R, -0.62 * R);
      ctx.bezierCurveTo(1.08 * R, -0.52 * R, 1.30 * R, -0.35 * R, 1.34 * R, 0);
      ctx.closePath();
    };

    traceHeadPath();
    ctx.fillStyle = skin.headColor;
    ctx.fill();

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = outlineWidth;
    ctx.lineJoin = 'round';
    traceHeadPath();
    ctx.stroke();

    // Expressive eye fallback
    const drawEye = (ey: number, side: number) => {
      ctx.save();
      ctx.translate(0.40 * R, ey);
      ctx.rotate(side * 0.16);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.28 * R, 0.22 * R, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = inkColor;
      ctx.beginPath();
      ctx.arc(0.02 * R, 0, 0.14 * R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawEye(0.66 * R, 1);
    drawEye(-0.66 * R, -1);
  }

  // G. Illustrated Accessories (Clean Inked Style)
  if (skin.accessory === 'horns') {
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = outlineWidth * 0.8;
    const drawHorn = (side: number) => {
      ctx.beginPath();
      ctx.moveTo(-0.25 * R, side * 0.75 * R);
      ctx.quadraticCurveTo(-0.60 * R, side * 1.15 * R, -0.95 * R, side * 1.35 * R);
      ctx.quadraticCurveTo(-0.55 * R, side * 0.90 * R, -0.45 * R, side * 0.60 * R);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    drawHorn(1);
    drawHorn(-1);
  } else if (skin.accessory === 'crown') {
    ctx.save();
    ctx.translate(-0.35 * R, 0);
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = outlineWidth * 0.8;

    // 3-spire royal crown with black ink outline
    ctx.beginPath();
    ctx.moveTo(-0.25 * R, -0.45 * R);
    ctx.lineTo(0.20 * R, -0.50 * R);
    ctx.lineTo(0.02 * R, -0.22 * R);
    ctx.lineTo(0.32 * R, 0);
    ctx.lineTo(0.02 * R, 0.22 * R);
    ctx.lineTo(0.20 * R, 0.50 * R);
    ctx.lineTo(-0.25 * R, 0.45 * R);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ruby dots
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0.32 * R, 0, 0.07 * R, 0, Math.PI * 2);
    ctx.arc(0.20 * R, -0.50 * R, 0.05 * R, 0, Math.PI * 2);
    ctx.arc(0.20 * R, 0.50 * R, 0.05 * R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (skin.accessory === 'halo') {
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = Math.max(2, 3.0 * scale);
    ctx.beginPath();
    ctx.ellipse(-0.30 * R, 0, 0.35 * R, 0.70 * R, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (skin.accessory === 'glasses') {
    ctx.save();
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.5, 2.0 * scale);

    // Left & right shades
    ctx.beginPath();
    ctx.roundRect(0.26 * R, -0.85 * R, 0.30 * R, 0.38 * R, 0.08 * R);
    ctx.roundRect(0.26 * R, 0.47 * R, 0.30 * R, 0.38 * R, 0.08 * R);
    ctx.fill();
    ctx.stroke();

    // Bridge
    ctx.beginPath();
    ctx.moveTo(0.38 * R, -0.47 * R);
    ctx.lineTo(0.38 * R, 0.47 * R);
    ctx.stroke();

    // White glare slash
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 1.3 * scale);
    ctx.beginPath();
    ctx.moveTo(0.30 * R, -0.78 * R);
    ctx.lineTo(0.48 * R, -0.58 * R);
    ctx.moveTo(0.30 * R, 0.54 * R);
    ctx.lineTo(0.48 * R, 0.74 * R);
    ctx.stroke();
    ctx.restore();
  }

  // Boost speed line particles
  if (isBoosting) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-1.2 * R, -0.5 * R);
    ctx.lineTo(-1.8 * R, -0.5 * R);
    ctx.moveTo(-1.2 * R, 0.5 * R);
    ctx.lineTo(-1.8 * R, 0.5 * R);
    ctx.stroke();
  }

  ctx.restore();
}

