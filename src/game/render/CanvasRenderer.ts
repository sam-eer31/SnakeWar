import { Camera } from '../core/Camera';
import { Snake } from '../entities/Snake';
import { FoodManager, FoodItem } from '../entities/FoodManager';
import { PowerUp, POWERUP_CONFIGS } from '../entities/PowerUp';
import { ParticleSystem } from './ParticleSystem';
import { GAME_CONFIG } from '../config/constants';
import { GameSettings } from '../config/settings';
import { drawIllustratedSnake } from './IllustratedSnakeRenderer';

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

  // Draw glowing food orbs
  drawFood(foodManager: FoodManager, camera: Camera): void {
    const ctx = this.ctx;
    const enableGlow = this.settings.glowEffects;

    for (const food of foodManager.foodItems.values()) {
      if (!camera.isInView(food.position.x, food.position.y, food.radius * 2)) continue;

      const screen = camera.worldToScreen(food.position.x, food.position.y);
      const r = Math.max(2, food.radius * camera.zoom);

      ctx.save();

      if (food.type === 'super') {
        // Super food: rotating pulsing crystal star
        if (enableGlow) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ffd700';
        }

        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Regular or boost food with radial gradient
        const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, food.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Draw power-up items
  drawPowerUps(powerUps: PowerUp[], camera: Camera): void {
    const ctx = this.ctx;

    for (const p of powerUps) {
      if (!camera.isInView(p.position.x, p.position.y, p.radius * 3)) continue;

      const screen = camera.worldToScreen(p.position.x, p.position.y);
      const cfg = POWERUP_CONFIGS[p.type];
      const r = p.radius * camera.zoom;

      ctx.save();

      // Outer pulsing ring
      const pulseR = r + Math.sin(p.pulsePhase) * (6 * camera.zoom);
      ctx.lineWidth = 2 * camera.zoom;
      ctx.strokeStyle = cfg.color;
      if (this.settings.glowEffects) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = cfg.glowColor;
      }
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, Math.max(5, pulseR), 0, Math.PI * 2);
      ctx.stroke();

      // Inner disc
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, Math.max(3, r), 0, Math.PI * 2);
      ctx.fill();

      // Power-up Icon Emoji
      ctx.shadowBlur = 0;
      ctx.font = `${Math.round(20 * camera.zoom)}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.icon, screen.x, screen.y);

      ctx.restore();
    }
  }

  // Draw illustrated snake with proper inked outline, scales, banded body, head and tapered tail
  drawSnake(snake: Snake, camera: Camera): void {
    drawIllustratedSnake(this.ctx, snake, camera, { enableGlow: this.settings.glowEffects });
  }

  // Draw complete scene
  renderScene(
    camera: Camera,
    allSnakes: Snake[],
    foodManager: FoodManager,
    powerUps: PowerUp[],
    particleSystem: ParticleSystem,
    playerSnake: Snake | null
  ): void {
    const width = this.ctx.canvas.width;
    const height = this.ctx.canvas.height;

    this.clear(width, height);
    this.drawBackground(camera);
    this.drawFood(foodManager, camera);
    this.drawPowerUps(powerUps, camera);

    // Draw bots first
    for (const snake of allSnakes) {
      if (snake.isBot && !snake.isDead) {
        this.drawSnake(snake, camera);
      }
    }

    // Draw player on top
    if (playerSnake && !playerSnake.isDead) {
      this.drawSnake(playerSnake, camera);
    }

    // Draw particles
    if (this.settings.particles) {
      particleSystem.render(this.ctx, camera);
    }
  }
}

