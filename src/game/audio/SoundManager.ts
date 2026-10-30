export class SoundManager {
  private ctx: AudioContext | null = null;
  private volume: number = 0.7;
  private muted: boolean = false;
  private boostOsc: OscillatorNode | null = null;
  private boostGain: GainNode | null = null;
  private isBoosting: boolean = false;

  constructor() {}

  private initCtx(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.boostGain && this.ctx) {
      this.boostGain.gain.setValueAtTime(this.muted ? 0 : this.volume * 0.15, this.ctx.currentTime);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted && this.boostGain && this.ctx) {
      this.boostGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  // Pleasant eat chime with ascending musical harmonics
  playEat(pitchShift: number = 0): void {
    if (this.muted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = 520 + (pitchShift % 12) * 40;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {
      // Audio errors safely ignored
    }
  }

  startBoost(): void {
    if (this.isBoosting || this.muted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      this.isBoosting = true;
      this.boostOsc = this.ctx.createOscillator();
      this.boostGain = this.ctx.createGain();

      this.boostOsc.type = 'triangle';
      this.boostOsc.frequency.setValueAtTime(120, this.ctx.currentTime);

      this.boostGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.boostGain.gain.linearRampToValueAtTime(this.volume * 0.12, this.ctx.currentTime + 0.1);

      this.boostOsc.connect(this.boostGain);
      this.boostGain.connect(this.ctx.destination);
      this.boostOsc.start();
    } catch {
      // Audio errors ignored
    }
  }

  stopBoost(): void {
    if (!this.isBoosting) return;
    this.isBoosting = false;
    if (this.boostGain && this.ctx) {
      try {
        this.boostGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        setTimeout(() => {
          if (this.boostOsc) {
            this.boostOsc.stop();
            this.boostOsc.disconnect();
            this.boostOsc = null;
          }
        }, 110);
      } catch {
        this.boostOsc = null;
      }
    }
  }

  playDeath(): void {
    if (this.muted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.45);

      gain.gain.setValueAtTime(this.volume * 0.45, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.46);
    } catch {}
  }

  playKill(): void {
    if (this.muted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const time = this.ctx!.currentTime + idx * 0.05;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(this.volume * 0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(time);
        osc.stop(time + 0.16);
      });
    } catch {}
  }

  playPowerUp(): void {
    if (this.muted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const notes = [523, 659, 784, 1046];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const time = this.ctx!.currentTime + idx * 0.04;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(this.volume * 0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(time);
        osc.stop(time + 0.13);
      });
    } catch {}
  }
}

export const soundManager = new SoundManager();

