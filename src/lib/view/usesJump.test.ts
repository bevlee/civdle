import { describe, expect, it } from "vitest";
import type { SkillId } from "../gameData";
import { resourceSource } from "./resourceSource";
import { usesJump } from "./usesJump";

const cordage = { skillId: "crafting" as const, recipeId: "cordage", level: 5 };

const args = (viewedSkill: SkillId, craftingLevel: number, craftingUnlocked = true) => ({
  viewedSkill,
  levels: { crafting: craftingLevel } as Record<SkillId, number>,
  unlocked: (id: SkillId) => id !== "crafting" || craftingUnlocked,
});

describe("usesJump", () => {
  it("has no chip when nothing makes the input", () => {
    expect(usesJump(null, args("leatherworking", 10))).toBeNull();
  });

  it("has no chip when the source skill is locked", () => {
    expect(usesJump(cordage, args("leatherworking", 10, false))).toBeNull();
  });

  it("links another skill's reachable recipe under the skill's name", () => {
    expect(usesJump(cordage, args("leatherworking", 5))).toEqual({
      skillId: "crafting",
      recipeId: "cordage",
      label: "Crafting",
    });
  });

  it("opens another skill without its locked recipe", () => {
    expect(usesJump(cordage, args("leatherworking", 4))).toEqual({
      skillId: "crafting",
      recipeId: null,
      label: "Crafting",
    });
  });

  it("links a reachable recipe of the same skill under the recipe's name", () => {
    expect(usesJump(cordage, args("crafting", 5))).toEqual({
      skillId: "crafting",
      recipeId: "cordage",
      label: "Cordage",
    });
  });

  it("hides a locked recipe of the same skill", () => {
    expect(usesJump(cordage, args("crafting", 4))).toEqual({
      skillId: "crafting",
      recipeId: null,
      label: "???",
    });
  });

  it("waits for the level the output needs, not just the recipe (Clay from Foraging at Lv 5)", () => {
    const clay = resourceSource("clay");
    const at = (foraging: number) => ({
      viewedSkill: "pottery" as SkillId,
      levels: { foraging } as Record<SkillId, number>,
      unlocked: () => true,
    });
    expect(usesJump(clay, at(4))).toEqual({ skillId: "foraging", recipeId: null, label: "Foraging" });
    expect(usesJump(clay, at(5))).toEqual({ skillId: "foraging", recipeId: "forage", label: "Foraging" });
  });
});
