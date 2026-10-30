export class Vector2D {
  constructor(public x: number = 0, public y: number = 0) {}

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v: Vector2D): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  add(v: Vector2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  addMut(v: Vector2D): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  subMut(v: Vector2D): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mul(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  mulMut(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  div(scalar: number): Vector2D {
    if (scalar === 0) return new Vector2D(0, 0);
    return new Vector2D(this.x / scalar, this.y / scalar);
  }

  divMut(scalar: number): this {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
    }
    return this;
  }

  magSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  mag(): number {
    return Math.sqrt(this.magSq());
  }

  distSq(v: Vector2D): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  dist(v: Vector2D): number {
    return Math.sqrt(this.distSq(v));
  }

  normalize(): this {
    const m = this.mag();
    if (m > 0.00001) {
      this.divMut(m);
    }
    return this;
  }

  heading(): number {
    return Math.atan2(this.y, this.x);
  }

  static fromAngle(angle: number, length: number = 1): Vector2D {
    return new Vector2D(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  dot(v: Vector2D): number {
    return this.x * v.x + this.y * v.y;
  }

  lerp(target: Vector2D, t: number): Vector2D {
    return new Vector2D(
      this.x + (target.x - this.x) * t,
      this.y + (target.y - this.y) * t
    );
  }

  lerpMut(target: Vector2D, t: number): this {
    this.x += (target.x - this.x) * t;
    this.y += (target.y - this.y) * t;
    return this;
  }
}

