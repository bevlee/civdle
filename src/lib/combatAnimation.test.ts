import { describe, expect, it } from "vitest";
import { attackKeyframes, blinkDistance, projectilePath, timeline } from "./combatAnimation";
import { ATTACK_STEP_MS, ULT_STEP_MS } from "./gameState.svelte";

describe("battle animation geometry", () => {
  it.each([
    [{ x: 120, y: 300 }, { x: 760, y: 60 }],
    [{ x: 760, y: 60 }, { x: 120, y: 300 }],
    [{ x: 180, y: 120 }, { x: 240, y: 360 }],
  ])("lands on the actual target across rows and either side", (source, target) => {
    const path = projectilePath(source, target);
    expect(path.x + path.dx).toBe(target.x);
    expect(path.y + path.dy).toBe(target.y);
    expect(Math.cos(path.angle * Math.PI / 180) * Math.hypot(path.dx, path.dy)).toBeCloseTo(path.dx);
    expect(Math.sin(path.angle * Math.PI / 180) * Math.hypot(path.dx, path.dy)).toBeCloseTo(path.dy);
  });

  it("mirrors the blink and scales it down on a narrow battlefield", () => {
    expect(blinkDistance(800, false)).toBe(-blinkDistance(800, true));
    expect(Math.abs(blinkDistance(300, true))).toBeLessThan(blinkDistance(800, false));
    const frames = attackKeyframes(blinkDistance(800, false));
    expect(frames.at(-1)?.transform).toBe(frames[0].transform);
    expect(frames.at(-1)?.opacity).toBe(1);
  });

  it("finishes both attacks before the engine can schedule another action", () => {
    expect(timeline.launchAt).toBeLessThan(timeline.impactAt);
    expect(timeline.attackMs).toBeLessThan(ATTACK_STEP_MS);
    expect(timeline.ultimateMs).toBeLessThan(ULT_STEP_MS);
  });
});
