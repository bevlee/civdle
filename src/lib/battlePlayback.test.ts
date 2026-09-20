import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BattlePlayback, ultimateCharge } from "./battlePlayback";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("battle playback clock", () => {
  it("freezes impact and turn timers and resumes their remaining time", () => {
    const clock = new BattlePlayback();
    const events: string[] = [];
    clock.schedule(() => events.push("impact"), 360);
    clock.schedule(() => events.push("turn"), 900);
    vi.advanceTimersByTime(200);
    clock.configure({ speed: 1, paused: true });
    vi.advanceTimersByTime(10000);
    expect(events).toEqual([]);
    clock.configure({ speed: 1, paused: false });
    vi.advanceTimersByTime(160);
    expect(events).toEqual(["impact"]);
    vi.advanceTimersByTime(540);
    expect(events).toEqual(["impact", "turn"]);
  });

  it("retimes a half-finished action without restarting when speed changes", () => {
    const clock = new BattlePlayback();
    const done = vi.fn();
    clock.schedule(done, 1000);
    vi.advanceTimersByTime(400);
    clock.configure({ speed: 2, paused: false });
    vi.advanceTimersByTime(299);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("can change speed and add or cancel effects while paused", () => {
    const clock = new BattlePlayback();
    clock.configure({ speed: 0.5, paused: true });
    const done = vi.fn();
    const cancelled = vi.fn();
    clock.schedule(done, 100);
    clock.schedule(cancelled, 50)();
    vi.advanceTimersByTime(5000);
    clock.configure({ speed: 0.5, paused: false });
    vi.advanceTimersByTime(199);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
    expect(cancelled).not.toHaveBeenCalled();
  });

  it("cleans up pending effects when the game is disposed", () => {
    const clock = new BattlePlayback();
    const done = vi.fn();
    clock.schedule(done, 100);
    clock.clear();
    vi.runAllTimers();
    expect(done).not.toHaveBeenCalled();
  });
});

describe("ultimate charge", () => {
  it("signals the next ultimate and resets after each three-action cycle", () => {
    expect([0, 1, 2, 3, 4, 5].map(turn => ultimateCharge(turn, 3).remaining)).toEqual([3, 2, 1, 3, 2, 1]);
    expect(ultimateCharge(2, 3).ready).toBe(true);
    expect(ultimateCharge(3, 3).filled).toBe(0);
  });
  it("uses the two-action cadence for Coven and Ascendant armies", () => {
    expect(ultimateCharge(1, 2)).toEqual({ filled: 1, remaining: 1, ready: true });
    expect(ultimateCharge(2, 2)).toEqual({ filled: 0, remaining: 2, ready: false });
  });
});
