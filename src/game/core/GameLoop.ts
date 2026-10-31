export class GameLoop {
  private lastTime: number = 0;
  private running: boolean = false;
  private animFrameId: number | null = null;
  private fpsBuffer: Float32Array = new Float32Array(30);
  private fpsIndex: number = 0;
  private fpsCount: number = 0;
  private fpsSum: number = 0;
  public currentFps: number = 60;

  get isRunning(): boolean {
    return this.running;
  }

  constructor(
    private updateFn: (dt: number, deltaRatio: number) => void,
    private renderFn: (interpolation: number) => void
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.fpsIndex = 0;
    this.fpsCount = 0;
    this.fpsSum = 0;
    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop(now: number): void {
    if (!this.running) return;

    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Guard against huge spikes when tab was minimized
    if (dt > 0.1) dt = 0.1;
    if (dt < 0.001) dt = 0.001;

    // Delta ratio relative to standard 60fps (1/60s ≈ 0.01667s)
    const deltaRatio = dt / (1 / 60);

    // Calculate rolling FPS via circular buffer (zero allocations)
    const instantFps = 1 / dt;
    if (this.fpsCount < 30) {
      this.fpsBuffer[this.fpsIndex] = instantFps;
      this.fpsSum += instantFps;
      this.fpsCount++;
    } else {
      this.fpsSum -= this.fpsBuffer[this.fpsIndex];
      this.fpsBuffer[this.fpsIndex] = instantFps;
      this.fpsSum += instantFps;
    }
    this.fpsIndex = (this.fpsIndex + 1) % 30;
    this.currentFps = Math.round(this.fpsSum / this.fpsCount);

    this.updateFn(dt, deltaRatio);
    this.renderFn(1);

    this.animFrameId = requestAnimationFrame(this.loop);
  }
}

