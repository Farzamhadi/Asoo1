import type { SimEvent } from './types';

/**
 * Procedural Web Audio synthesizer tuned to warm earthen percussion & reed/harp intervals.
 * Safe in headless browsers (gracefully no-ops if AudioContext is unavailable).
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(value: boolean): void {
    this.muted = value;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      try {
        this.ctx = new AudioCtor();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private pitchJitter(base: number, range = 0.08): number {
    return base * (1 + (Math.random() * 2 - 1) * range);
  }

  private tone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
    delay = 0
  ): void {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public handleEvent(ev: SimEvent): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    switch (ev.type) {
      case 'jump':
        this.tone(this.pitchJitter(240), this.pitchJitter(490), 0.13, 'triangle', 0.12);
        break;
      case 'land': {
        const vol = 0.05 + (ev.intensity ?? 0.4) * 0.06;
        this.tone(this.pitchJitter(125), 62, 0.08, 'sine', vol);
        break;
      }
      case 'bounce':
        this.tone(this.pitchJitter(310), this.pitchJitter(740), 0.18, 'triangle', 0.14);
        break;
      case 'updraft':
        this.tone(280, 660, 0.24, 'sine', 0.11);
        this.tone(420, 880, 0.28, 'triangle', 0.08, 0.05);
        break;
      case 'collect':
        this.tone(523.25, 587.33, 0.14, 'triangle', 0.13);
        this.tone(783.99, 1046.5, 0.22, 'sine', 0.11, 0.08);
        break;
      case 'hurt':
        this.tone(190, 74, 0.22, 'sawtooth', 0.15);
        this.tone(130, 58, 0.24, 'square', 0.08, 0.03);
        break;
      case 'stomp':
        this.tone(95, 48, 0.16, 'sine', 0.07);
        break;
      case 'victory': {
        const notes = [392.0, 493.88, 587.33, 783.99, 987.77];
        notes.forEach((n, idx) => {
          this.tone(n, n * 1.01, 0.28, 'triangle', 0.13, idx * 0.085);
        });
        break;
      }
      case 'defeat':
        this.tone(260, 185, 0.26, 'triangle', 0.14);
        this.tone(185, 110, 0.42, 'sawtooth', 0.11, 0.16);
        break;
    }
  }
}
