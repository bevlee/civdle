// Groups skills for the phone skill picker.

import { SKILLS, SKILL_ORDER, type SkillId } from "../gameData";
import type { GameState } from "../gameEngine";

export type SkillGroupLabel = "Gathering" | "Production";

export interface SkillChip {
  id: SkillId;
  unlocked: boolean;
}

export interface SkillGroup {
  label: SkillGroupLabel;
  skills: SkillChip[];
}

const GROUP_LABELS: SkillGroupLabel[] = ["Gathering", "Production"];

// Crafting and combat (Conquest) both count as Production.
export const groupOf = (id: SkillId): SkillGroupLabel =>
  SKILLS[id].category === "gathering" ? "Gathering" : "Production";

// Always [Gathering, Production]; unlocked chips first, SKILL_ORDER within each partition.
export function skillGroups(state: GameState): SkillGroup[] {
  return GROUP_LABELS.map((label) => {
    const chips = SKILL_ORDER.filter((id) => groupOf(id) === label).map((id) => ({
      id,
      unlocked: state.skills[id].unlocked,
    }));
    return {
      label,
      skills: [...chips.filter((c) => c.unlocked), ...chips.filter((c) => !c.unlocked)],
    };
  });
}
