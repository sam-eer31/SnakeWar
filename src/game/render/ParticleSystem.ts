import { Vector2D } from '../core/Vector2D';
import { Camera } from '../core/Camera';

export interface Particle {
  position: Vector2D;
  velocity: Vector2D;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  glow: boolean;
}

export class ParticleSystem {
  public particles: Particle[] = [];
  public maxParticles: number = 300;
  private particleBuckets: Map<string, number[]> = new Map();

  constructor(maxParticles: number = 300) {
    this.maxParticles = maxParticles;
  }

  setMaxParticles(max: number): void {
    this.maxParticles = max;
    if (this.particles.length > max) {
      this.particles.length = max;
    }
  }

  emitBurst(
    x: number,
    y: number,
    color: string,
    count: number = 20,
    speedMultiplier: number = 1
  ): void {
    const toEmit = Math.min(count, this.maxParticles - this.particles.length);
    for (let i = 0; i < toEmit; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2 + Math.random() * 5) * speedMultiplier;
      const life = 0.4 + Math.random() * 0.6;

      this.particles.push({
        position: new Vector2D(x, y),
        velocity: Vector2D.fromAngle(angle, speed),
        color,
        radius: 2.5 + Math.random() * 4,
        alpha: 1,
        life,
        maxLife: life,
        glow: true,
      });
    }
  }

  emitBoostTrail(x: number, y: number, color: string): void {
    if (this.particles.length >= this.maxParticles) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    const life = 0.25 + Math.random() * 0.2;

    this.particles.push({
      position: new Vector2D(x, y),
      velocity: Vector2D.fromAngle(angle, speed),
      color,
      radius: 2 + Math.random() * 2.5,
      alpha: 0.8,
      life,
      maxLife: life,
      glow: false,
    });
  }

  update(dt: number, deltaRatio: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        const last = this.particles.pop()!;
        if (i < this.particles.length) {
          this.particles[i] = last;
        }
        continue;
      }

      p.position.addMut(p.velocity.mul(deltaRatio));
      p.velocity.mulMut(0.96); // drag
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (this.particles.length === 0) return;

    for (const arr of this.particleBuckets.values()) {
      arr.length = 0;
    }

    const zoom = camera.zoom;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!camera.isInView(p.position.x, p.position.y, p.radius * 2)) continue;

      const screen = camera.worldToScreen(p.position.x, p.position.y);
      const r = Math.max(1, p.radius * zoom);

      let bucket = this.particleBuckets.get(p.color);
      if (!bucket) {
        bucket = [];
        this.particleBuckets.set(p.color, bucket);
      }
      bucket.push(screen.x, screen.y, r);
    }

    // Render all particles in batches by color (one beginPath/fill per color, cuts 300 calls to ~3)
    ctx.globalAlpha = 0.82;
    for (const [color, coords] of this.particleBuckets.entries()) {
      const len = coords.length;
      if (len === 0) continue;

      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < len; i += 3) {
        const x = coords[i];
        const y = coords[i + 1];
        const r = coords[i + 2];
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}

