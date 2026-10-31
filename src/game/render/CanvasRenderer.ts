import { Camera } from '../core/Camera';
import { Snake } from '../entities/Snake';
import { FoodManager, FoodItem } from '../entities/FoodManager';
import { PowerUp, POWERUP_CONFIGS } from '../entities/PowerUp';
import { ParticleSystem } from './ParticleSystem';
import { GAME_CONFIG } from '../config/constants';
import { GameSettings } from '../config/settings';
import { drawIllustratedSnake } from './IllustratedSnakeRenderer';
import { getPowerUpImage } from './PowerUpTextureAtlas';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  public settings: GameSettings;
  public arenaRadius: number = GAME_CONFIG.ARENA_RADIUS;

  constructor(ctx: CanvasRenderingContext2D, settings: GameSettings) {
    this.ctx = ctx;
    this.settings = settings;
  }

  setSettings(settings: GameSettings): void {
    this.settings = settings;
  }

  clear(width: number, height: number): void {
    this.ctx.fillStyle = '#080c16';
    this.ctx.fillRect(0, 0, width, height);
  }

  // Draw futuristic hexagonal/grid background
  drawBackground(camera: Camera): void {
    const ctx = this.ctx;
    const gridSize = 80;
    const halfW = (camera.viewportWidth / 2) / camera.zoom;
    const halfH = (camera.viewportHeight / 2) / camera.zoom;

    const startX = Math.floor((camera.position.x - halfW) / gridSize) * gridSize;
    const endX = Math.ceil((camera.position.x + halfW) / gridSize) * gridSize;
    const startY = Math.floor((camera.position.y - halfH) / gridSize) * gridSize;
    const endY = Math.ceil((camera.position.y + halfH) / gridSize) * gridSize;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      const p1 = camera.worldToScreen(x, camera.position.y - halfH);
      const p2 = camera.worldToScreen(x, camera.position.y + halfH);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      const p1 = camera.worldToScreen(camera.position.x - halfW, y);
      const p2 = camera.worldToScreen(camera.position.x + halfW, y);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw Arena Circular Boundary
    const centerScreen = camera.worldToScreen(0, 0);
    const screenRadius = this.arenaRadius * camera.zoom;

    ctx.lineWidth = Math.max(3, 5 * camera.zoom);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
    if (this.settings.glowEffects) {
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ef4444';
    }

    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, screenRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Secondary inner warning ring
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, screenRadius - 40 * camera.zoom, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // Draw glowing food orbs (spatial grid query + high-performance glossy rendering)
  drawFood(foodManager: FoodManager, camera: Camera): void {
    const ctx = this.ctx;
    const enableGlow = this.settings.glowEffects;

    const halfW = (camera.viewportWidth / 2) / camera.zoom + 60;
    const halfH = (camera.viewportHeight / 2) / camera.zoom + 60;
    const viewRadius = Math.hypot(halfW, halfH);

    // Query spatial grid instead of looping 2500 map items
    const nearby = foodManager.spatialGrid.queryRadius(camera.position.x, camera.position.y, viewRadius);

    for (let i = 0; i < nearby.length; i++) {
      const food = nearby[i].data as FoodItem;
      if (!food) continue;
      if (!camera.isInView(food.position.x, food.position.y, food.radius * 2)) continue;

      const screen = camera.worldToScreen(food.position.x, food.position.y);
      const r = Math.max(2, food.radius * camera.zoom);

      if (food.type === 'super') {
        // Super food: pulsing star
        ctx.save();
        if (enableGlow) {
          ctx.shadowBlur = 14;
          ctx.shadowColor = '#ffd700';
        }

        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Authentic Slither.io glossy orb: vibrant sphere with shiny highlight
        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Glossy core reflection (avoids expensive createRadialGradient)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(screen.x - r * 0.28, screen.y - r * 0.28, r * 0.36, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Draw power-up items (direct images without outer bubbles or circles)
  drawPowerUps(powerUps: PowerUp[], camera: Camera): void {
    const ctx = this.ctx;

    for (const p of powerUps) {
      if (!camera.isInView(p.position.x, p.position.y, p.radius * 3)) continue;

      const screen = camera.worldToScreen(p.position.x, p.position.y);
      const r = p.radius * camera.zoom;
      const size = r * 2.6;

      ctx.save();
      ctx.translate(screen.x, screen.y);

      // Subtle floating hover
      const floatY = Math.sin(p.pulsePhase) * (2.5 * camera.zoom);

      // Draw direct high-def WebP Power-up image
      const img = getPowerUpImage(p.type);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -size * 0.5, -size * 0.5 + floatY, size, size);
      } else {
        // Fallback to emoji if asset is loading
        const cfg = POWERUP_CONFIGS[p.type];
        ctx.font = `${Math.round(24 * camera.zoom)}px 'GameFont', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.icon, 0, floatY);
      }

      ctx.restore();
    }
  }

  // Draw illustrated snake with proper inked outline, scales, banded body, head and tapered tail
  drawSnake(snake: Snake, camera: Camera): void {
    drawIllustratedSnake(this.ctx, snake, camera, { enableGlow: this.settings.glowEffects });
  }

  /**
   * Fast viewport culling: returns true if any part of the snake is visible on screen.
   */
  private isSnakeInView(snake: Snake, camera: Camera): boolean {
    const headMargin = snake.radius * 2.5 + 60;
    // Fast path: head is near or inside the screen
    if (camera.isInView(snake.position.x, snake.position.y, headMargin)) {
      return true;
    }
    // Broadphase: is the snake's entire reach completely off-screen?
    const maxReach = snake.segments.length * GAME_CONFIG.SEGMENT_DISTANCE + headMargin;
    if (!camera.isInView(snake.position.x, snake.position.y, maxReach)) {
      return false;
    }
    // Check if any segment of long snake touches the viewport
    const step = Math.max(1, Math.floor(snake.segments.length / 8));
    for (let i = 0; i < snake.segments.length; i += step) {
      const seg = snake.segments[i];
      if (camera.isInView(seg.x, seg.y, seg.radius * 2 + 30)) {
        return true;
      }
    }
    return false;
  }

  // Draw complete scene
  renderScene(
    camera: Camera,
    allSnakes: Snake[],
    foodManager: FoodManager,
    powerUps: PowerUp[],
    particleSystem: ParticleSystem,
    playerSnake: Snake | null,
    dpr: number = 1
  ): void {
    const ctx = this.ctx;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    this.clear(width, height);

    ctx.save();
    if (dpr !== 1) {
      ctx.scale(dpr, dpr);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    this.drawBackground(camera);
    this.drawFood(foodManager, camera);
    this.drawPowerUps(powerUps, camera);

    // Draw bots first (with camera viewport culling)
    for (const snake of allSnakes) {
      if (snake.isBot && !snake.isDead) {
        if (this.isSnakeInView(snake, camera)) {
          this.drawSnake(snake, camera);
        }
      }
    }

    // Draw player on top
    if (playerSnake && !playerSnake.isDead) {
      if (this.isSnakeInView(playerSnake, camera)) {
        this.drawSnake(playerSnake, camera);
      }
    }

    // Draw particles
    if (this.settings.particles) {
      particleSystem.render(ctx, camera);
    }

    ctx.restore();
  }
}

