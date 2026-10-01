// Groups skills for the phone skill picker.

import { AGES, SKILLS, SKILL_ORDER, type SkillId } from "../gameData";
import { getSkillLevels, theAge, type GameState } from "../gameEngine";

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

/**
 * What to do next to discover a skill in this group, e.g. "Woodcutting Lv 10" or
 * "Reach the Iron Age", or null when it has nothing left to discover. Only skills whose
 * prerequisites the player can already see count, so no locked skill is named.
 */
export function nextDiscovery(state: GameState, label: SkillGroupLabel): string | null {
  const levels = getSkillLevels(state);
  for (const id of SKILL_ORDER) {
    if (groupOf(id) !== label || state.skills[id].unlocked) continue;
    const def = SKILLS[id];
    if (!def.prereqs.every((p) => state.skills[p.skill].unlocked)) continue;
    const unmet = def.prereqs.find((p) => levels[p.skill] < p.level);
    if (unmet) return `${SKILLS[unmet.skill].name} Lv ${unmet.level}`;
    const age = AGES.findIndex((a) => a.id === def.ageRequired);
    if (age > state.ageIndex) return `Reach ${theAge(AGES[age].name)}`;
  }
  return null;
}
