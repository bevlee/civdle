import { describe, expect, it } from "vitest";
import { xpForLevel } from "../gameEngine";
import { xpProgressPct } from "./xpProgress";

describe("xpProgressPct", () => {
  it("is 0 at the start of a level", () => {
    expect(xpProgressPct(xpForLevel(5), 5)).toBe(0);
  });

  it("is halfway between two thresholds", () => {
    const mid = (xpForLevel(10) + xpForLevel(11)) / 2;
    expect(xpProgressPct(mid, 10)).toBeCloseTo(50);
  });

  it("is full at the max level", () => {
    expect(xpProgressPct(xpForLevel(99), 99)).toBe(100);
  });

  it("clamps XP outside the level's range", () => {
    expect(xpProgressPct(xpForLevel(5) - 10, 5)).toBe(0);
    expect(xpProgressPct(xpForLevel(7), 5)).toBe(100);
  });
});
