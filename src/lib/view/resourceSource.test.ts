import { describe, expect, it } from "vitest";
import type { ConditionalOutput, Recipe, ResourceId, SkillDef, SkillId } from "../gameData";
import { buildResourceSources, resourceSource } from "./resourceSource";

describe("resourceSource", () => {
  it("finds the skill and recipe that produce wood", () => {
    expect(resourceSource("wood")).toEqual({ skillId: "woodcutting", recipeId: "chopWood", level: 0 });
  });

  it("finds crafted and combat outputs", () => {
    expect(resourceSource("planks")).toEqual({ skillId: "carpentry", recipeId: "planks", level: 0 });
    expect(resourceSource("glory")).toEqual({ skillId: "conquest", recipeId: "raid", level: 0 });
  });

  it("prefers the earliest producer among several", () => {
    // Hides come from Hunting (level 0) and Herding's butcher (level 10).
    expect(resourceSource("rawHides")).toEqual({ skillId: "hunting", recipeId: "hunt", level: 0 });
    expect(resourceSource("food")).toEqual({ skillId: "foraging", recipeId: "forage", level: 0 });
  });

  it("reports the level a gated output needs", () => {
    // Forage makes Clay only from level 5.
    expect(resourceSource("clay")).toEqual({ skillId: "foraging", recipeId: "forage", level: 5 });
  });

  it("returns null for a resource nothing produces", () => {
    expect(resourceSource("unobtainium" as ResourceId)).toBeNull();
  });
});

// No real resource has a later producer at a lower level, so check the rule on fake data.
describe("buildResourceSources", () => {
  const recipe = (id: string, requiredLevel: number, outputs: (ResourceId | ConditionalOutput)[]): Recipe => ({
    id,
    name: id,
    requiredLevel,
    inputs: [],
    outputs: outputs.map((o) => (typeof o === "string" ? { resource: o, amount: 1 } : o)),
  });
  const skill = (id: SkillId, recipes: Recipe[]) => ({ id, recipes }) as SkillDef;

  it("prefers the lowest requiredLevel across skills", () => {
    const skills = {
      mining: skill("mining", [recipe("deepOre", 30, ["coal"])]),
      smithing: skill("smithing", [recipe("charcoal", 5, ["coal"])]),
    } as Record<SkillId, SkillDef>;
    const sources = buildResourceSources(skills, ["mining", "smithing"]);
    expect(sources.get("coal")).toEqual({ skillId: "smithing", recipeId: "charcoal", level: 5 });
  });

  it("breaks level ties by SKILL_ORDER, then recipe order", () => {
    const skills = {
      mining: skill("mining", [recipe("a", 10, ["stone"]), recipe("b", 10, ["stone", "coal"])]),
      smithing: skill("smithing", [recipe("c", 10, ["coal"])]),
    } as Record<SkillId, SkillDef>;
    const sources = buildResourceSources(skills, ["smithing", "mining"]);
    expect(sources.get("stone")).toEqual({ skillId: "mining", recipeId: "a", level: 10 });
    expect(sources.get("coal")).toEqual({ skillId: "smithing", recipeId: "c", level: 10 });
  });

  it("ranks by the output's own levelRequired, ignoring ageRequired", () => {
    const skills = {
      mining: skill("mining", [
        recipe("mineStone", 0, [
          "stone",
          { resource: "coal", amount: 1, levelRequired: 25 },
          { resource: "copperOre", amount: 1, ageRequired: "bronzeAge" },
        ]),
      ]),
      smithing: skill("smithing", [recipe("charcoal", 10, ["coal", "copperOre"])]),
    } as Record<SkillId, SkillDef>;
    const sources = buildResourceSources(skills, ["mining", "smithing"]);
    // Mining's recipe comes first and has the lower requiredLevel, but its coal needs level 25.
    expect(sources.get("coal")).toEqual({ skillId: "smithing", recipeId: "charcoal", level: 10 });
    expect(sources.get("copperOre")).toEqual({ skillId: "mining", recipeId: "mineStone", level: 0 });
    expect(sources.get("stone")).toEqual({ skillId: "mining", recipeId: "mineStone", level: 0 });
  });
});
