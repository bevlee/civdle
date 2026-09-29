// What it takes to reach the next age, and what it grants: shared by the desktop
// header dropdown and the phone age sheet.

import { RESOURCES, SKILLS, type AgeDef, type ResourceId, type SkillId } from "../gameData";
import { describeAgeBonus, describeAgeReward, type AgeAdvanceStatus } from "../gameEngine";

export interface ChecklistItem {
  label: string;
  current: number;
  required: number;
  met: boolean;
  /** Set on skill-level rows: the skill to train. */
  skill?: SkillId;
  /** Set on resource-cost rows: the resource to gather. */
  resource?: ResourceId;
}

export interface AgeChecklistArgs {
  ageAdvanceStatus: AgeAdvanceStatus;
  levels: Record<SkillId, number>;
  unlocked: (id: SkillId) => boolean;
  resources: Partial<Record<ResourceId, number>>;
}

export function ageChecklist({ ageAdvanceStatus, levels, unlocked, resources }: AgeChecklistArgs): ChecklistItem[] {
  const { nextAge, cost } = ageAdvanceStatus;
  if (!nextAge) return [];
  // A condition on a still-locked skill (e.g. Smithing) can't be trained
  // yet, so list the unmet prereqs that unlock it right before it.
  const items: ChecklistItem[] = [];
  const seen = new Set<string>();
  const addSkill = (skill: SkillId, level: number, unlocks?: SkillId) => {
    if (!unlocked(skill)) {
      for (const p of SKILLS[skill].prereqs) {
        if ((levels[p.skill] ?? 0) < p.level) addSkill(p.skill, p.level, skill);
      }
    }
    const label = `${unlocked(skill) ? "" : "🔒 "}${SKILLS[skill].name} Lv ${level}${unlocks ? ` → unlocks ${SKILLS[unlocks].name}` : ""}`;
    if (seen.has(label)) return;
    seen.add(label);
    const current = levels[skill] ?? 0;
    items.push({ label, current, required: level, met: current >= level, skill });
  };
  for (const c of nextAge.condition) addSkill(c.skill, c.level);
  return [
    ...items,
    ...cost.map((c) => ({
      label: RESOURCES[c.resource].name,
      current: Math.floor(resources[c.resource] ?? 0),
      required: c.amount,
      met: (resources[c.resource] ?? 0) >= c.amount,
      resource: c.resource,
    })),
  ];
}

/** The first requirement still to do, in list order (a locked skill's prereqs come first). */
export function firstUnmet(items: ChecklistItem[]): ChecklistItem | undefined {
  return items.find((item) => !item.met);
}

export function checklistProgress(items: ChecklistItem[]): { met: number; total: number } {
  return { met: items.filter((item) => item.met).length, total: items.length };
}

/** The age's bonus followed by its (concealed) reward chips. */
export function ageRewards(age: AgeDef): string[] {
  const bonus = describeAgeBonus({ flatTimeReduction: age.bonus.flatTime, outputMult: age.bonus.outputMult });
  return [bonus, ...describeAgeReward(age, { conceal: true })].filter(Boolean);
}

/** "Iron Age" → "Iron"; names without the suffix are kept. */
export function shortAgeName(name: string): string {
  return name.replace(/ Age$/, "");
}
