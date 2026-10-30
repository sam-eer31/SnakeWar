import { Camera } from '../core/Camera';
import { Snake } from '../entities/Snake';
import { FoodManager, FoodItem } from '../entities/FoodManager';
import { PowerUp, POWERUP_CONFIGS } from '../entities/PowerUp';
import { ParticleSystem } from './ParticleSystem';
import { GAME_CONFIG } from '../config/constants';
import { GameSettings } from '../config/settings';

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

  // Draw snake body, head, eyes, and skin details
  drawSnake(snake: Snake, camera: Camera): void {
    if (snake.isDead || snake.segments.length === 0) return;

    const ctx = this.ctx;
    const skin = snake.skin;
    const isGhost = snake.hasPowerUp('ghost');
    const enableGlow = this.settings.glowEffects;

    ctx.save();
    if (isGhost) {
      ctx.globalAlpha = 0.55;
    } else if (snake.hasSpawnProtection) {
      // Shimmering shield transparency during 3-second spawn protection
      const shieldPulse = 0.72 + Math.sin(Date.now() * 0.015) * 0.22;
      ctx.globalAlpha = shieldPulse;
    }

    // 1. Draw Body Segments (from tail to head for proper layering)
    const segCount = snake.segments.length;
    const bodyPalette = skin.bodyColors;

    for (let i = segCount - 1; i >= 0; i--) {
      const seg = snake.segments[i];
      if (!camera.isInView(seg.x, seg.y, seg.radius * 2)) continue;

      const screen = camera.worldToScreen(seg.x, seg.y);
      const r = Math.max(2, seg.radius * camera.zoom);

      // Color selection based on skin pattern
      let color = bodyPalette[i % bodyPalette.length];
      if (skin.patternType === 'gradient') {
        const colorIdx = Math.floor((i / segCount) * bodyPalette.length) % bodyPalette.length;
        color = bodyPalette[colorIdx];
      }

      ctx.fillStyle = color;

      // Glow on body when boosting
      if (snake.isBoosting && enableGlow && i % 3 === 0) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = skin.headColor;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Segment spine pattern / inner disc
      if (r > 6 && skin.patternType !== 'solid') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Draw Head
    const headScreen = camera.worldToScreen(snake.position.x, snake.position.y);
    const headRadius = Math.max(3, snake.radius * camera.zoom);

    if (enableGlow) {
      ctx.shadowBlur = snake.isBoosting ? 20 : 12;
      ctx.shadowColor = skin.glowColor;
    }

    ctx.fillStyle = skin.headColor;
    ctx.beginPath();
    ctx.arc(headScreen.x, headScreen.y, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Eyes
    ctx.shadowBlur = 0;
    const eyes = snake.getEyePositions();
    const eyeRadius = Math.max(2, headRadius * 0.28);
    const pupilRadius = Math.max(1, eyeRadius * 0.55);

    // Left Eye
    const leftEyeScreen = camera.worldToScreen(eyes.leftEye.x, eyes.leftEye.y);
    ctx.fillStyle = skin.eyeColor;
    ctx.beginPath();
    ctx.arc(leftEyeScreen.x, leftEyeScreen.y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Left Pupil
    const leftPupilScreen = camera.worldToScreen(eyes.leftEye.pupilX, eyes.leftEye.pupilY);
    ctx.fillStyle = skin.pupilColor;
    ctx.beginPath();
    ctx.arc(leftPupilScreen.x, leftPupilScreen.y, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    // Left Eye Shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(leftPupilScreen.x - pupilRadius * 0.3, leftPupilScreen.y - pupilRadius * 0.3, pupilRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye
    const rightEyeScreen = camera.worldToScreen(eyes.rightEye.x, eyes.rightEye.y);
    ctx.fillStyle = skin.eyeColor;
    ctx.beginPath();
    ctx.arc(rightEyeScreen.x, rightEyeScreen.y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Right Pupil
    const rightPupilScreen = camera.worldToScreen(eyes.rightEye.pupilX, eyes.rightEye.pupilY);
    ctx.fillStyle = skin.pupilColor;
    ctx.beginPath();
    ctx.arc(rightPupilScreen.x, rightPupilScreen.y, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye Shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(rightPupilScreen.x - pupilRadius * 0.3, rightPupilScreen.y - pupilRadius * 0.3, pupilRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw Accessory (if any)
    if (skin.accessory === 'crown') {
      ctx.font = `${Math.round(18 * camera.zoom)}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('👑', headScreen.x, headScreen.y - headRadius * 0.8);
    } else if (skin.accessory === 'halo') {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2 * camera.zoom;
      ctx.beginPath();
      ctx.ellipse(headScreen.x, headScreen.y - headRadius * 0.85, headRadius * 0.6, headRadius * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (skin.accessory === 'glasses') {
      ctx.fillStyle = '#0f172a';
      ctx.lineWidth = 2 * camera.zoom;
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(leftEyeScreen.x, leftEyeScreen.y, eyeRadius * 1.1, 0, Math.PI * 2);
      ctx.arc(rightEyeScreen.x, rightEyeScreen.y, eyeRadius * 1.1, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Draw 3-Second Spawn Protection Shield Bubble
    if (snake.hasSpawnProtection) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(1.5, 2.5 * camera.zoom);
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#0ea5e9';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(headScreen.x, headScreen.y, headRadius * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Name Tag
    ctx.font = `700 ${Math.max(10, Math.round(12 * camera.zoom))}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Determine name & border color based on player or bot difficulty tier:
    // Green = Lowest/Easy, Yellow = Mid/Medium, Red = Strongest/Hard
    let nameColor = '#38bdf8'; // Cyan for player
    let borderColor = 'rgba(56, 189, 248, 0.4)';

    if (snake.isBot) {
      if (snake.tier === 'easy') {
        nameColor = '#4ade80'; // Green for lowest tier
        borderColor = 'rgba(74, 222, 128, 0.4)';
      } else if (snake.tier === 'medium') {
        nameColor = '#facc15'; // Yellow for mid tier
        borderColor = 'rgba(250, 204, 21, 0.4)';
      } else if (snake.tier === 'hard') {
        nameColor = '#f87171'; // Red for strongest tier
        borderColor = 'rgba(248, 113, 113, 0.5)';
      } else {
        nameColor = '#cbd5e1';
        borderColor = 'rgba(203, 213, 225, 0.3)';
      }
    }

    const tagText = snake.name;
    const textWidth = ctx.measureText(tagText).width;
    const tagY = headScreen.y - headRadius - 10 * camera.zoom;
    const pillH = Math.max(14, 16 * camera.zoom);
    const pillW = textWidth + 14 * camera.zoom;

    // Tag background pill with subtle difficulty-colored border
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(headScreen.x - pillW / 2, tagY - pillH + 2, pillW, pillH, 5);
    ctx.fill();
    ctx.stroke();

    // Render name text in difficulty color
    ctx.fillStyle = nameColor;
    ctx.fillText(tagText, headScreen.x, tagY);

    ctx.restore();
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

