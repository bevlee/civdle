// Finds which skill recipe makes a resource, for jump chips next to costs and inputs.

import { SKILLS, SKILL_ORDER, type ResourceId, type SkillDef, type SkillId } from "../gameData";

export interface ResourceSource {
  skillId: SkillId;
  recipeId: string;
  /** Skill level at which this recipe yields the resource, e.g. 5 for "Foraging Lv 5". */
  level: number;
}

// Lowest effective level wins: the recipe's requiredLevel or the output's own levelRequired, whichever is
// higher. ageRequired doesn't affect ranking. Ties keep the first found (SKILL_ORDER, then recipe order).
export function buildResourceSources(
  skills: Record<SkillId, SkillDef>,
  order: SkillId[],
): Map<ResourceId, ResourceSource> {
  const best = new Map<ResourceId, ResourceSource>();
  for (const skillId of order) {
    for (const recipe of skills[skillId].recipes) {
      for (const output of recipe.outputs) {
        const level = Math.max(recipe.requiredLevel, output.levelRequired ?? 0);
        const current = best.get(output.resource);
        if (!current || level < current.level) {
          best.set(output.resource, { skillId, recipeId: recipe.id, level });
        }
      }
    }
  }
  return best;
}

let sources: Map<ResourceId, ResourceSource> | null = null;

export function resourceSource(resource: ResourceId): ResourceSource | null {
  sources ??= buildResourceSources(SKILLS, SKILL_ORDER);
  return sources.get(resource) ?? null;
}
