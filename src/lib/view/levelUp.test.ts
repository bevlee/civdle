import { describe, expect, it } from "vitest";
import { latestLevelUp } from "./levelUp";

const event = (id: string, type: string, data: unknown) => ({ id, type, data });

describe("latestLevelUp", () => {
  it("is null without a level-up", () => {
    expect(latestLevelUp([event("a", "actionGain", {})])).toBeNull();
  });

  it("returns the newest level-up", () => {
    const events = [
      event("levelUp-1", "levelUp", { skillId: "foraging", newLevel: 2 }),
      event("skillPoint-2", "skillPoint", { amount: 1 }),
      event("levelUp-3", "levelUp", { skillId: "mining", newLevel: 7 }),
      event("actionGain-4", "actionGain", {}),
    ];
    expect(latestLevelUp(events)).toEqual({ id: "levelUp-3", skillId: "mining", newLevel: 7 });
  });
});
