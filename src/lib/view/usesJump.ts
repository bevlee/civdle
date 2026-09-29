// The chip next to a recipe input that jumps to whatever makes it, without naming
// a recipe the player hasn't reached yet.

import { SKILLS, type SkillId } from "../gameData";
import type { ResourceSource } from "./resourceSource";

export interface UsesJump {
  skillId: SkillId;
  /** The recipe to view, or null to open the skill as it is (its recipe is still locked). */
  recipeId: string | null;
  label: string;
}

export interface UsesJumpArgs {
  /** The skill on screen, if any: its own recipes are named rather than the skill. */
  viewedSkill?: SkillId;
  levels: Record<SkillId, number>;
  unlocked: (id: SkillId) => boolean;
}

export function usesJump(source: ResourceSource | null, { viewedSkill, levels, unlocked }: UsesJumpArgs): UsesJump | null {
  if (!source || !unlocked(source.skillId)) return null;
  const skill = SKILLS[source.skillId];
  const recipe = skill.recipes.find((r) => r.id === source.recipeId);
  // The source's level, not the recipe's: a recipe can open before it yields this output (Clay from Foraging at Lv 5).
  const reached = recipe !== undefined && source.level <= (levels[source.skillId] ?? 0);
  const sameSkill = source.skillId === viewedSkill;
  if (reached) return { skillId: source.skillId, recipeId: recipe.id, label: sameSkill ? recipe.name : skill.name };
  return { skillId: source.skillId, recipeId: null, label: sameSkill ? "???" : skill.name };
}
