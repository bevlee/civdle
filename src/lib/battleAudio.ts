import type { AttackType } from "./combatData";

/** Quiet, synthesized cues; no audio downloads and no sound before user opt-in. */
export class BattleAudio {
  #context: AudioContext | null = null;
  #voices = new Set<OscillatorNode>();
  #muted = true;
  #request = 0;

  async setMuted(muted: boolean): Promise<boolean> {
    const request = ++this.#request;
    this.#muted = muted;
    if (muted) { this.stop(); return true; }
    try {
      this.#context ??= new AudioContext();
      await this.#context.resume();
      if (request === this.#request) this.#muted = this.#context.state !== "running";
    } catch { if (request === this.#request) this.#muted = true; }
    return this.#muted;
  }

  play(type: AttackType, speed: number) {
    const context = this.#context;
    if (this.#muted || !context || context.state !== "running") return;
    const cue: { hz: number; end: number; delay: number; length: number; wave: OscillatorType }[] = type === "melee"
      ? [{ hz: 140, end: 45, delay: 0, length: .23, wave: "triangle" }]
      : type === "ranged"
        ? [0, 1, 2].map(i => ({ hz: 760 + i * 140, end: 330, delay: i * .045, length: .10, wave: "triangle" }))
        : [392, 523, 784].map((hz, i) => ({ hz, end: hz * 1.15, delay: i * .06, length: .22, wave: "sine" }));
    for (const note of cue) {
      const start = context.currentTime + note.delay / speed;
      const end = start + note.length / speed;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = note.wave;
      oscillator.frequency.setValueAtTime(note.hz, start);
      oscillator.frequency.exponentialRampToValueAtTime(note.end, end);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.055, start + .008 / speed);
      gain.gain.exponentialRampToValueAtTime(.001, end);
      oscillator.connect(gain).connect(context.destination);
      this.#voices.add(oscillator);
      oscillator.onended = () => { this.#voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start);
      oscillator.stop(end);
    }
  }

  stop() {
    for (const voice of this.#voices) voice.stop();
    this.#voices.clear();
  }

  dispose() { this.stop(); void this.#context?.close().catch(() => {}); this.#context = null; }
}
