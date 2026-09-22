import type { AttackType } from "./combatData";

// Set to a URL such as "/audio/bgm.ogg" once a track has been chosen.
export const BATTLE_BGM_SRC: string | null = null;

/** Layered synthesized battle cues, enabled by the player's sound toggle. */
export class BattleAudio {
  #context: AudioContext | null = null;
  #voices = new Set<OscillatorNode>();
  #muted = true;
  #request = 0;
  #music: HTMLAudioElement | null = null;

  setMusicPlaying(playing: boolean) {
    if (!BATTLE_BGM_SRC) return;
    if (!playing || this.#muted) { this.#music?.pause(); return; }
    this.#music ??= new Audio(BATTLE_BGM_SRC);
    this.#music.loop = true;
    this.#music.volume = .18;
    void this.#music.play().catch(() => {});
  }

  #tone(hz: number, endHz: number, delay: number, length: number, wave: OscillatorType, volume: number, speed = 1) {
    const context = this.#context;
    if (this.#muted || !context || context.state !== "running") return;
    const rate = Math.max(.5, speed);
    const start = context.currentTime + delay / rate;
    const end = start + length / rate;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(hz, start);
    oscillator.frequency.exponentialRampToValueAtTime(endHz, end);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + .006 / rate);
    gain.gain.exponentialRampToValueAtTime(.001, end);
    oscillator.connect(gain).connect(context.destination);
    this.#voices.add(oscillator);
    oscillator.onended = () => { this.#voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start);
    oscillator.stop(end);
  }

  hit(type: AttackType, speed: number) {
    // Low impact body with a brief, brighter attack; each weapon has its own timbre.
    const hz = type === "melee" ? 180 : type === "ranged" ? 480 : 660;
    this.#tone(hz, hz * .22, 0, .14, "triangle", .065, speed);
    this.#tone(hz * 3, hz, 0, .045, type === "magic" ? "sine" : "square", .018, speed);
    if (type === "magic") this.#tone(990, 1320, .025, .18, "sine", .025, speed);
  }

  death(speed: number) {
    this.#tone(220, 38, .025, .42, "sawtooth", .024, speed);
    this.#tone(85, 28, .06, .5, "sine", .075, speed);
    this.#tone(440, 80, 0, .2, "triangle", .025, speed);
  }

  result(won: boolean) {
    // A rising major fanfare versus a descending minor cadence, at a fixed musical tempo.
    const notes = won ? [261.63, 329.63, 392, 523.25] : [311.13, 261.63, 196, 155.56];
    notes.forEach((hz, i) => {
      this.#tone(hz, hz, i * .14, i === 3 ? .85 : .23, "triangle", .055);
      this.#tone(hz / 2, hz / 2, i * .14, i === 3 ? .95 : .25, "sine", .04);
    });
    if (won) [329.63, 392].forEach(hz => this.#tone(hz, hz, .42, .85, "sine", .025));
  }

  async setMuted(muted: boolean): Promise<boolean> {
    const request = ++this.#request;
    this.#muted = muted;
    if (muted) { this.stop(); this.setMusicPlaying(false); return true; }
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

  dispose() { this.#music?.pause(); this.#music = null; this.stop(); void this.#context?.close().catch(() => {}); this.#context = null; }
}
