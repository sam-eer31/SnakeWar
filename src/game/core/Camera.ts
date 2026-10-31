import { Vector2D } from './Vector2D';
import { GAME_CONFIG } from '../config/constants';

export class Camera {
  public position: Vector2D;
  public target: Vector2D;
  public zoom: number;
  public targetZoom: number;
  public viewportWidth: number;
  public viewportHeight: number;
  public shakeAmount: number = 0;
  public shakeDecay: number = 0.9;

  // Free Cam & Manual Zoom for Spectator Mode
  public isFreeCam: boolean = false;
  public manualZoomMin: number = 0.25;
  public manualZoomMax: number = 2.8;
  public hasManualZoom: boolean = false;

  constructor(width: number, height: number) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.position = new Vector2D(0, 0);
    this.target = new Vector2D(0, 0);
    this.zoom = GAME_CONFIG.BASE_ZOOM;
    this.targetZoom = GAME_CONFIG.BASE_ZOOM;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  setTarget(target: Vector2D): void {
    if (!this.isFreeCam) {
      this.target.copy(target);
    }
  }

  setTargetZoom(zoom: number): void {
    if (!this.hasManualZoom) {
      this.targetZoom = Math.max(GAME_CONFIG.MIN_ZOOM, Math.min(this.manualZoomMax, zoom));
    }
  }

  // Spectator Free Cam Pan (1:1 direct cursor tracking)
  panFreeCam(screenDx: number, screenDy: number): void {
    this.isFreeCam = true;
    const worldDx = screenDx / this.zoom;
    const worldDy = screenDy / this.zoom;
    this.target.x -= worldDx;
    this.target.y -= worldDy;
    this.position.x -= worldDx;
    this.position.y -= worldDy;
  }

  // Spectator Manual Zoom In / Out
  adjustManualZoom(factor: number): void {
    this.hasManualZoom = true;
    const newTarget = this.targetZoom * factor;
    this.targetZoom = Math.max(this.manualZoomMin, Math.min(this.manualZoomMax, newTarget));
  }

  setManualZoomDirect(zoom: number): void {
    this.hasManualZoom = true;
    this.targetZoom = Math.max(this.manualZoomMin, Math.min(this.manualZoomMax, zoom));
  }

  resetManualZoom(): void {
    this.hasManualZoom = false;
    this.targetZoom = GAME_CONFIG.BASE_ZOOM;
  }

  shake(intensity: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, intensity);
  }

  update(deltaRatio: number = 1): void {
    // Smooth camera motion
    const smoothing = this.isFreeCam ? 0.2 : GAME_CONFIG.CAMERA_SMOOTHING;
    const factor = 1 - Math.pow(1 - smoothing, deltaRatio);
    this.position.lerpMut(this.target, factor);
    this.zoom += (this.targetZoom - this.zoom) * factor;

    // Decay screen shake
    if (this.shakeAmount > 0.01) {
      this.shakeAmount *= Math.pow(this.shakeDecay, deltaRatio);
    } else {
      this.shakeAmount = 0;
    }
  }

  getShakeOffset(): { x: number; y: number } {
    if (this.shakeAmount <= 0) return { x: 0, y: 0 };
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * this.shakeAmount;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
    };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const shake = this.getShakeOffset();
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;
    return {
      x: cx + (worldX - this.position.x) * this.zoom + shake.x,
      y: cy + (worldY - this.position.y) * this.zoom + shake.y,
    };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;
    return {
      x: this.position.x + (screenX - cx) / this.zoom,
      y: this.position.y + (screenY - cy) / this.zoom,
    };
  }

  isInView(worldX: number, worldY: number, radius: number): boolean {
    const halfW = (this.viewportWidth / 2) / this.zoom;
    const halfH = (this.viewportHeight / 2) / this.zoom;
    return (
      worldX + radius >= this.position.x - halfW &&
      worldX - radius <= this.position.x + halfW &&
      worldY + radius >= this.position.y - halfH &&
      worldY - radius <= this.position.y + halfH
    );
  }
}
