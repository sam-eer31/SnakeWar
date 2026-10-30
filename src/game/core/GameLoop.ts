export class GameLoop {
  private lastTime: number = 0;
  private running: boolean = false;
  private animFrameId: number | null = null;
  private fpsHistory: number[] = [];
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

    // Calculate rolling FPS
    const instantFps = 1 / dt;
    this.fpsHistory.push(instantFps);
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    this.currentFps = Math.round(sum / this.fpsHistory.length);

    this.updateFn(dt, deltaRatio);
    this.renderFn(1);

    this.animFrameId = requestAnimationFrame(this.loop);
  }
}

