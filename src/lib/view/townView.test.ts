import { describe, expect, it } from "vitest";
import type { SkillId } from "../gameData";
import { costJump, formatUnlockDate, lockedOddsNote, missingLabel } from "./townView";

describe("missingLabel", () => {
  it("counts materials in the singular and plural", () => {
    expect(missingLabel(1)).toBe("Missing 1 material");
    expect(missingLabel(3)).toBe("Missing 3 materials");
  });
});

describe("lockedOddsNote", () => {
  it("is null when every tier is open", () => {
    expect(lockedOddsNote([{ stars: 5, pct: 1 }, { stars: 4, pct: 5 }])).toBeNull();
  });

  it("names the age each capped tier opens in, lowest first", () => {
    expect(
      lockedOddsNote([
        { stars: 5, pct: 0, lockedUntil: "Medieval" },
        { stars: 4, pct: 0, lockedUntil: "Iron Age" },
        { stars: 3, pct: 20 },
      ]),
    ).toBe("4★ from the Iron Age · 5★ from the Medieval era");
  });
});

describe("costJump", () => {
  const levels = (smithing: number) => ({ smithing }) as Record<SkillId, number>;

  it("has no jump while the making skill is undiscovered", () => {
    expect(costJump("steelBar", levels(50), () => false)).toBeNull();
  });

  it("opens the recipe that makes the resource once it is reached", () => {
    expect(costJump("steelBar", levels(40), () => true)).toMatchObject({ skillId: "smithing", recipeId: "steelBar" });
  });

  it("opens the skill without naming a recipe not yet reached", () => {
    expect(costJump("steelBar", levels(39), () => true)).toMatchObject({ skillId: "smithing", recipeId: null });
  });
});

describe("formatUnlockDate", () => {
  const now = new Date(2026, 8, 29).getTime();

  it("shows month and day for this year", () => {
    expect(formatUnlockDate(new Date(2026, 8, 14, 15).getTime(), now)).toBe("Sep 14");
  });

  it("adds the year for an earlier year", () => {
    expect(formatUnlockDate(new Date(2025, 11, 3).getTime(), now)).toBe("Dec 3, 2025");
  });
});
