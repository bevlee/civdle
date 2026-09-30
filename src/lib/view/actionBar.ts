// Decides what the phone Train screen's sticky action button says and does.

import { RESOURCES, SKILLS, type Recipe, type ResourceId, type SkillId } from "../gameData";

export type ActionBarState =
  | { kind: "stop"; label: string }
  | { kind: "locked"; label: string }
  | { kind: "short"; label: string; sub: string }
  | { kind: "switch"; label: string; sub: string }
  | { kind: "train"; label: string; sub: string };

export interface ActionBarArgs {
  viewedSkill: SkillId;
  viewedRecipeId: string;
  viewedLevel: number;
  activeSkill: SkillId | null;
  activeRecipeId: string | null;
  resources: Partial<Record<ResourceId, number>>;
}

// Unknown ids fall back to the first recipe, as the engine does.
const recipeOf = (skillId: SkillId, recipeId: string): Recipe =>
  SKILLS[skillId].recipes.find((r) => r.id === recipeId) ?? SKILLS[skillId].recipes[0];

export function actionBarState(args: ActionBarArgs): ActionBarState {
  const { viewedSkill, viewedRecipeId, activeSkill, activeRecipeId, resources } = args;
  if (viewedSkill === activeSkill && viewedRecipeId === activeRecipeId) {
    return { kind: "stop", label: "Stop" };
  }

  const recipe = recipeOf(viewedSkill, viewedRecipeId);
  if (recipe.requiredLevel > args.viewedLevel) {
    return { kind: "locked", label: `Unlocks at Lv ${recipe.requiredLevel}` };
  }

  const missing = recipe.inputs.find(({ resource, amount }) => (resources[resource] ?? 0) < amount);
  if (missing) {
    const name = RESOURCES[missing.resource].name;
    return { kind: "short", label: `Short on ${name}`, sub: `Needs ${missing.amount} ${name}` };
  }

  // The recipe is named beside the button, and its time and XP just above it.
  if (activeSkill !== null) return { kind: "switch", label: "Switch", sub: `Stops ${SKILLS[activeSkill].name}` };
  return { kind: "train", label: "Train", sub: "" };
}

export function stillTrainingLine(activeSkill: SkillId, activeRecipeId: string): string {
  return `${SKILLS[activeSkill].name} · ${recipeOf(activeSkill, activeRecipeId).name}`;
}
