import { describe, expect, it } from "vitest";
import type { Recipe, ResourceId, SkillDef, SkillId } from "../gameData";
import { buildResourceSources, resourceSource } from "./resourceSource";

describe("resourceSource", () => {
  it("finds the skill and recipe that produce wood", () => {
    expect(resourceSource("wood")).toEqual({ skillId: "woodcutting", recipeId: "chopWood" });
  });

  it("finds crafted and combat outputs", () => {
    expect(resourceSource("planks")).toEqual({ skillId: "carpentry", recipeId: "planks" });
    expect(resourceSource("glory")).toEqual({ skillId: "conquest", recipeId: "raid" });
  });

  it("prefers the earliest producer among several", () => {
    // Hides come from Hunting (level 0) and Herding's butcher (level 10).
    expect(resourceSource("rawHides")).toEqual({ skillId: "hunting", recipeId: "hunt" });
    expect(resourceSource("food")).toEqual({ skillId: "foraging", recipeId: "forage" });
  });

  it("returns null for a resource nothing produces", () => {
    expect(resourceSource("unobtainium" as ResourceId)).toBeNull();
  });
});

// No real resource has a later producer at a lower level, so check the rule on fake data.
describe("buildResourceSources", () => {
  const recipe = (id: string, requiredLevel: number, outputs: ResourceId[]): Recipe => ({
    id,
    name: id,
    requiredLevel,
    inputs: [],
    outputs: outputs.map((resource) => ({ resource, amount: 1 })),
  });
  const skill = (id: SkillId, recipes: Recipe[]) => ({ id, recipes }) as SkillDef;

  it("prefers the lowest requiredLevel across skills", () => {
    const skills = {
      mining: skill("mining", [recipe("deepOre", 30, ["coal"])]),
      smithing: skill("smithing", [recipe("charcoal", 5, ["coal"])]),
    } as Record<SkillId, SkillDef>;
    const sources = buildResourceSources(skills, ["mining", "smithing"]);
    expect(sources.get("coal")).toEqual({ skillId: "smithing", recipeId: "charcoal" });
  });

  it("breaks level ties by SKILL_ORDER, then recipe order", () => {
    const skills = {
      mining: skill("mining", [recipe("a", 10, ["stone"]), recipe("b", 10, ["stone", "coal"])]),
      smithing: skill("smithing", [recipe("c", 10, ["coal"])]),
    } as Record<SkillId, SkillDef>;
    const sources = buildResourceSources(skills, ["smithing", "mining"]);
    expect(sources.get("stone")).toEqual({ skillId: "mining", recipeId: "a" });
    expect(sources.get("coal")).toEqual({ skillId: "smithing", recipeId: "c" });
  });
});
