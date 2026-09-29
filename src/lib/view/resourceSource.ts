// Finds which skill recipe makes a resource, for jump chips next to costs and inputs.

import { SKILLS, SKILL_ORDER, type ResourceId, type SkillDef, type SkillId } from "../gameData";

export interface ResourceSource {
  skillId: SkillId;
  recipeId: string;
}

// Lowest requiredLevel wins; ties keep the first found (SKILL_ORDER, then recipe order).
export function buildResourceSources(
  skills: Record<SkillId, SkillDef>,
  order: SkillId[],
): Map<ResourceId, ResourceSource> {
  const best = new Map<ResourceId, ResourceSource & { level: number }>();
  for (const skillId of order) {
    for (const recipe of skills[skillId].recipes) {
      for (const { resource } of recipe.outputs) {
        const current = best.get(resource);
        if (!current || recipe.requiredLevel < current.level) {
          best.set(resource, { skillId, recipeId: recipe.id, level: recipe.requiredLevel });
        }
      }
    }
  }
  return new Map([...best].map(([resource, { skillId, recipeId }]) => [resource, { skillId, recipeId }]));
}

let sources: Map<ResourceId, ResourceSource> | null = null;

export function resourceSource(resource: ResourceId): ResourceSource | null {
  sources ??= buildResourceSources(SKILLS, SKILL_ORDER);
  return sources.get(resource) ?? null;
}
