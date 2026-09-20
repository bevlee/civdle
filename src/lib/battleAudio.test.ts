import { afterEach, describe, expect, it, vi } from "vitest";
import { BattleAudio } from "./battleAudio";

function audioHarness() {
  const oscillators: { type: OscillatorType; stop: ReturnType<typeof vi.fn> }[] = [];
  const parameter = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const context = {
    state: "running", currentTime: 0, destination: {}, resume: vi.fn(async () => {}), close: vi.fn(async () => {}),
    createOscillator() {
      const voice = { type: "sine" as OscillatorType, frequency: parameter(), connect: vi.fn((gain) => gain), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
      oscillators.push(voice);
      return voice;
    },
    createGain() { return { gain: parameter(), connect: vi.fn(), disconnect: vi.fn() }; },
  };
  const constructor = vi.fn(function () { return context; });
  vi.stubGlobal("AudioContext", constructor);
  return { oscillators, context, constructor };
}

afterEach(() => vi.unstubAllGlobals());

describe("ultimate audio", () => {
  it("creates no audio until the player enables sounds", () => {
    const { constructor } = audioHarness();
    const audio = new BattleAudio();
    audio.play("magic", 1);
    audio.hit("melee", 1);
    audio.death(1);
    audio.result(true);
    audio.setMusicPlaying(true);
    expect(constructor).not.toHaveBeenCalled();
  });

  it("uses a thump, arrow triplet, and distinct magic chord", async () => {
    const { oscillators } = audioHarness();
    const audio = new BattleAudio();
    expect(await audio.setMuted(false)).toBe(false);
    audio.play("melee", 1);
    expect(oscillators.map(o => o.type)).toEqual(["triangle"]);
    audio.play("ranged", 2);
    expect(oscillators).toHaveLength(4);
    audio.play("magic", 0.5);
    expect(oscillators.slice(4).map(o => o.type)).toEqual(["sine", "sine", "sine"]);
    await audio.setMuted(true);
    expect(oscillators.every(o => o.stop.mock.calls.length === 2)).toBe(true);
    audio.play("melee", 1);
    expect(oscillators).toHaveLength(7);
  });

  it("plays hit, death and both result cues, and silences them on mute", async () => {
    const { oscillators } = audioHarness();
    const audio = new BattleAudio();
    await audio.setMuted(false);
    for (const type of ["melee", "ranged", "magic"] as const) audio.hit(type, 1);
    const hits = oscillators.length;
    expect(hits).toBeGreaterThan(0);
    audio.death(2);
    expect(oscillators.length).toBeGreaterThan(hits);
    const deaths = oscillators.length;
    audio.result(true);
    const victory = oscillators.length;
    expect(victory).toBeGreaterThan(deaths);
    audio.result(false);
    expect(oscillators.length).toBeGreaterThan(victory);
    await audio.setMuted(true);
    const count = oscillators.length;
    audio.hit("melee", 1);
    audio.death(1);
    audio.result(false);
    expect(oscillators).toHaveLength(count);
    expect(oscillators.every(o => o.stop.mock.calls.length === 2)).toBe(true);
  });

  it("keeps a later mute when an earlier audio unlock finishes", async () => {
    const { context, oscillators } = audioHarness();
    let unlock!: () => void;
    context.resume.mockImplementation(() => new Promise<void>(resolve => { unlock = resolve; }));
    const audio = new BattleAudio();
    const enabling = audio.setMuted(false);
    await audio.setMuted(true);
    unlock();
    expect(await enabling).toBe(true);
    audio.play("magic", 1);
    expect(oscillators).toHaveLength(0);
  });
});
