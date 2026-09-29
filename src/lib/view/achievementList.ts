// Achievements for the phone screen: filter chips with counts, and each section sorted by how close you are.

import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  SKILL_MILESTONE_LEVELS,
  isSkillMilestone,
  skillMilestoneId,
  type AchievementCategory,
  type AchievementDef,
  type AchievementProgress,
} from "../achievements";
import { SKILL_ORDER, type SkillId } from "../gameData";
import type { GameState } from "../gameEngine";

export type AchievementFilter = "all" | AchievementCategory;

export interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  done: boolean;
  unlockedAt?: number;
  secret: boolean;
  progress?: AchievementProgress;
}

export interface AchievementFilterChip {
  id: AchievementFilter;
  label: string;
  done: number;
  total: number;
}

export interface AchievementSection {
  category: AchievementCategory;
  label: string;
  items: AchievementItem[];
}

export interface SkillMilestoneRow {
  skillId: SkillId;
  discovered: boolean;
  levels: { level: number; done: boolean }[];
}

export interface AchievementListView {
  done: number;
  total: number;
  filters: AchievementFilterChip[];
  sections: AchievementSection[];
  /** The per-skill milestone grid; empty unless the filter is "all" or "skills". */
  milestones: SkillMilestoneRow[];
}

// Short chip labels; section headers keep the longer CATEGORY_LABELS.
export const FILTER_LABELS: Record<AchievementCategory, string> = {
  skills: "Skills",
  resources: "Resources",
  ages: "Ages",
  army: "Army",
  combat: "Combat",
  misc: "Misc",
};

const SECRET_NAME = "???";
const SECRET_DESCRIPTION = "Hidden achievement. Keep playing to find out.";
const SECRET_ICON = "❓";

interface Ranked {
  item: AchievementItem;
  rank: number;
  score: number;
}

// rank: 0 done, 1 in progress, 2 not started, 3 secret. Higher score sorts first within a rank.
function rankItem(def: AchievementDef, state: GameState, levels: Record<SkillId, number>): Ranked {
  const unlockedAt = state.achievements[def.id];
  const done = unlockedAt !== undefined;
  const secret = !!def.hidden && !done;
  if (secret) {
    return {
      item: { id: def.id, name: SECRET_NAME, description: SECRET_DESCRIPTION, icon: SECRET_ICON, done, secret },
      rank: 3,
      score: 0,
    };
  }
  const item: AchievementItem = { id: def.id, name: def.name, description: def.description, icon: def.icon, done, secret };
  if (done) {
    item.unlockedAt = unlockedAt;
    return { item, rank: 0, score: unlockedAt };
  }
  const progress = def.progress?.(state, levels);
  if (progress && progress.target > 1) item.progress = progress;
  if (progress && progress.current > 0) return { item, rank: 1, score: progress.current / progress.target };
  return { item, rank: 2, score: 0 };
}

export function achievementList(
  state: GameState,
  levels: Record<SkillId, number>,
  filter: AchievementFilter,
): AchievementListView {
  const isDone = (def: AchievementDef) => state.achievements[def.id] !== undefined;
  const count = (defs: AchievementDef[]) => ({ done: defs.filter(isDone).length, total: defs.length });

  const byCategory = new Map<AchievementCategory, AchievementDef[]>(CATEGORY_ORDER.map((c) => [c, []]));
  for (const def of ACHIEVEMENTS) byCategory.get(def.category)!.push(def);

  const filters: AchievementFilterChip[] = [
    { id: "all", label: "All", ...count(ACHIEVEMENTS) },
    ...CATEGORY_ORDER.map((c) => ({ id: c, label: FILTER_LABELS[c], ...count(byCategory.get(c)!) })),
  ];

  const sections = CATEGORY_ORDER.filter((c) => filter === "all" || filter === c).map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: byCategory
      .get(category)!
      .filter((def) => !isSkillMilestone(def.id))
      .map((def) => rankItem(def, state, levels))
      .sort((a, b) => a.rank - b.rank || b.score - a.score)
      .map((r) => r.item),
  }));

  const milestones: SkillMilestoneRow[] =
    filter === "all" || filter === "skills"
      ? SKILL_ORDER.map((skillId) => ({
          skillId,
          discovered: state.skills[skillId].unlocked,
          levels: SKILL_MILESTONE_LEVELS.map((level) => ({
            level,
            done: state.achievements[skillMilestoneId(skillId, level)] !== undefined,
          })),
        }))
      : [];

  return { ...count(ACHIEVEMENTS), filters, sections, milestones };
}
