// Achievement definitions and the pure unlock check.
//
// Achievements are evaluated against a full GameState snapshot; anything a
// snapshot can't tell us (how many battles were won, how many cards were
// discarded…) lives in `state.stats`, which the game class increments.

import { AGES, RESOURCES, SKILLS, SKILL_ORDER, type AgeId, type ResourceId, type SkillId } from "./gameData";
import { getSkillLevels, type GameState } from "./gameEngine";
import { MAX_ENEMY_LEVEL, MAX_STARS, UNIT_IDS } from "./combatData";

export type AchievementCategory = "skills" | "resources" | "ages" | "army" | "combat" | "misc";

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  /** Hidden achievements show as "???" until unlocked. */
  hidden?: boolean;
  check: (state: GameState, levels: Record<SkillId, number>) => boolean;
  progress?: (state: GameState, levels: Record<SkillId, number>) => AchievementProgress;
}

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  skills: "Skill Milestones",
  resources: "Resources",
  ages: "Ages",
  army: "Army",
  combat: "Combat",
  misc: "Miscellaneous",
};

export const CATEGORY_ORDER: AchievementCategory[] = ["skills", "resources", "ages", "army", "combat", "misc"];

export const SKILL_MILESTONE_LEVELS = [10, 20, 50, 99] as const;

const MILESTONE_ICONS: Record<(typeof SKILL_MILESTONE_LEVELS)[number], string> = {
  10: "🌱",
  20: "🔨",
  50: "⚔️",
  99: "👑",
};

const MILESTONE_TITLES: Record<(typeof SKILL_MILESTONE_LEVELS)[number], string> = {
  10: "Apprentice",
  20: "Journeyman",
  50: "Expert",
  99: "Grandmaster",
};

export function skillMilestoneId(skillId: SkillId, level: number): string {
  return `skill.${skillId}.${level}`;
}

const AGE_ICONS: Record<AgeId, string> = {
  stoneAge: "🪨",
  bronzeAge: "🥉",
  ironAge: "⚙️",
  medieval: "🏰",
  renaissance: "🎨",
};

const RESOURCE_IDS = Object.keys(RESOURCES) as ResourceId[];

function maxResource(state: GameState): { id: ResourceId | null; amount: number } {
  let best: { id: ResourceId | null; amount: number } = { id: null, amount: 0 };
  for (const id of RESOURCE_IDS) {
    const amount = state.resources[id] ?? 0;
    if (amount > best.amount) best = { id, amount };
  }
  return best;
}

function totalResources(state: GameState): number {
  let total = 0;
  for (const id of RESOURCE_IDS) total += state.resources[id] ?? 0;
  return total;
}

function countAt(levels: Record<SkillId, number>, level: number): number {
  return SKILL_ORDER.filter((id) => levels[id] >= level).length;
}

function distinctUnits(state: GameState): number {
  return new Set(state.gacha.cards.map((c) => c.unitId)).size;
}

function totalUpgrades(): number {
  return SKILL_ORDER.reduce((sum, id) => sum + SKILLS[id].upgrades.length, 0);
}

function ownedUpgrades(state: GameState): number {
  return SKILL_ORDER.reduce((sum, id) => sum + state.skills[id].upgrades.length, 0);
}

const skillMilestones: AchievementDef[] = SKILL_ORDER.flatMap((skillId) =>
  SKILL_MILESTONE_LEVELS.map((level) => ({
    id: skillMilestoneId(skillId, level),
    name: `${SKILLS[skillId].name} ${MILESTONE_TITLES[level]}`,
    description: `Reach level ${level} in ${SKILLS[skillId].name}.`,
    icon: MILESTONE_ICONS[level],
    category: "skills" as const,
    check: (_state, levels) => levels[skillId] >= level,
    progress: (_state, levels) => ({ current: Math.min(levels[skillId], level), target: level }),
  })),
);

const skillCombos: AchievementDef[] = [
  {
    id: "skills.allTen",
    name: "Jack of All Trades",
    description: "Reach level 10 in every skill.",
    icon: "🃏",
    category: "skills",
    check: (_s, levels) => countAt(levels, 10) === SKILL_ORDER.length,
    progress: (_s, levels) => ({ current: countAt(levels, 10), target: SKILL_ORDER.length }),
  },
  {
    id: "skills.allFifty",
    name: "Renaissance Polymath",
    description: "Reach level 50 in every skill.",
    icon: "📚",
    category: "skills",
    check: (_s, levels) => countAt(levels, 50) === SKILL_ORDER.length,
    progress: (_s, levels) => ({ current: countAt(levels, 50), target: SKILL_ORDER.length }),
  },
  {
    id: "skills.allMax",
    name: "Master of All",
    description: "Reach level 99 in every skill. Touch grass.",
    icon: "🏆",
    category: "skills",
    check: (_s, levels) => countAt(levels, 99) === SKILL_ORDER.length,
    progress: (_s, levels) => ({ current: countAt(levels, 99), target: SKILL_ORDER.length }),
  },
  {
    id: "skills.nice",
    name: "Nice.",
    description: "Have a skill sitting at exactly level 69.",
    icon: "😏",
    category: "skills",
    hidden: true,
    check: (_s, levels) => SKILL_ORDER.some((id) => levels[id] === 69),
  },
];

const resourceAchievements: AchievementDef[] = [
  {
    id: "resources.first",
    name: "Humble Beginnings",
    description: "Gather your very first resource.",
    icon: "🫐",
    category: "resources",
    check: (s) => totalResources(s) >= 1,
  },
  {
    id: "resources.hoarder",
    name: "Hoarder",
    description: "Hold 1,000 of a single resource.",
    icon: "📦",
    category: "resources",
    check: (s) => maxResource(s).amount >= 1000,
    progress: (s) => ({ current: Math.min(Math.floor(maxResource(s).amount), 1000), target: 1000 }),
  },
  {
    id: "resources.over9000",
    name: "It's Over 9000!",
    description: "Hold more than 9,000 of a single resource. What, 9,000?!",
    icon: "💥",
    category: "resources",
    check: (s) => maxResource(s).amount > 9000,
    progress: (s) => ({ current: Math.min(Math.floor(maxResource(s).amount), 9001), target: 9001 }),
  },
  {
    id: "resources.dragon",
    name: "Dragon's Hoard",
    description: "Hold 100,000 resources in total across your inventory.",
    icon: "🐉",
    category: "resources",
    check: (s) => totalResources(s) >= 100_000,
    progress: (s) => ({ current: Math.min(Math.floor(totalResources(s)), 100_000), target: 100_000 }),
  },
  {
    id: "resources.wellStocked",
    name: "Well Stocked",
    description: "Have at least one of every resource at the same time.",
    icon: "🧺",
    category: "resources",
    check: (s) => RESOURCE_IDS.every((id) => (s.resources[id] ?? 0) >= 1),
    progress: (s) => ({
      current: RESOURCE_IDS.filter((id) => (s.resources[id] ?? 0) >= 1).length,
      target: RESOURCE_IDS.length,
    }),
  },
  {
    id: "resources.leet",
    name: "1337 Haxor",
    description: "Hold at least 1,337 tools of any tier. Elite.",
    icon: "🕶️",
    category: "resources",
    hidden: true,
    check: (s) =>
      (["tools", "copperTools", "ironTools", "steelTools"] as ResourceId[]).some(
        (id) => (s.resources[id] ?? 0) >= 1337,
      ),
  },
];

const ageAchievements: AchievementDef[] = AGES.filter((age) => age.id !== "stoneAge").map((age) => {
  const index = AGES.findIndex((a) => a.id === age.id);
  const label = age.name.endsWith("Age") ? age.name : `${age.name} era`;
  return {
    id: `age.${age.id}`,
    name: `Welcome to the ${label}`,
    description: `Advance your civilisation into the ${label}.`,
    icon: AGE_ICONS[age.id],
    category: "ages" as const,
    check: (s) => s.ageIndex >= index,
  };
});

const armyAchievements: AchievementDef[] = [
  {
    id: "army.firstSummon",
    name: "Is This a Gacha Game?",
    description: "Summon your first hero.",
    icon: "🎴",
    category: "army",
    check: (s) => s.stats.cardsSummoned >= 1,
  },
  {
    id: "army.pack",
    name: "Whale Watching",
    description: "Open a 10-card pack.",
    icon: "🐋",
    category: "army",
    check: (s) => s.stats.packsOpened >= 1,
  },
  {
    id: "army.hundred",
    name: "Pull Addict",
    description: "Summon 100 heroes in total.",
    icon: "🎰",
    category: "army",
    check: (s) => s.stats.cardsSummoned >= 100,
    progress: (s) => ({ current: Math.min(s.stats.cardsSummoned, 100), target: 100 }),
  },
  {
    id: "army.lucky",
    name: "Blessed RNG",
    description: "Pull a 5-star or better hero straight from a summon.",
    icon: "🍀",
    category: "army",
    check: (s) => s.stats.bestSummonStars >= 5,
  },
  {
    id: "army.merge",
    name: "Fusion Dance",
    description: "Merge two heroes into a stronger one.",
    icon: "✨",
    category: "army",
    check: (s) => s.stats.merges >= 1,
  },
  {
    id: "army.maxStars",
    name: "Shiny!",
    description: `Own a ${MAX_STARS}-star hero.`,
    icon: "🌟",
    category: "army",
    check: (s) => s.gacha.cards.some((c) => c.stars >= MAX_STARS),
    progress: (s) => ({
      current: s.gacha.cards.reduce((best, c) => Math.max(best, c.stars), 0),
      target: MAX_STARS,
    }),
  },
  {
    id: "army.collector",
    name: "Gotta Catch 'Em All",
    description: "Own at least one of every hero at the same time.",
    icon: "📖",
    category: "army",
    check: (s) => distinctUnits(s) >= UNIT_IDS.length,
    progress: (s) => ({ current: distinctUnits(s), target: UNIT_IDS.length }),
  },
  {
    id: "army.kondo",
    name: "Does It Spark Joy?",
    description: "Discard 10 heroes. They had families.",
    icon: "🗑️",
    category: "army",
    hidden: true,
    check: (s) => s.stats.cardsDiscarded >= 10,
  },
];

const combatAchievements: AchievementDef[] = [
  {
    id: "combat.firstWin",
    name: "First Blood",
    description: "Win your first battle.",
    icon: "🩸",
    category: "combat",
    check: (s) => s.stats.battlesWon >= 1,
  },
  {
    id: "combat.tenWins",
    name: "Warband",
    description: "Win 10 battles.",
    icon: "🛡️",
    category: "combat",
    check: (s) => s.stats.battlesWon >= 10,
    progress: (s) => ({ current: Math.min(s.stats.battlesWon, 10), target: 10 }),
  },
  {
    id: "combat.hundredWins",
    name: "Warlord",
    description: "Win 100 battles.",
    icon: "⚔️",
    category: "combat",
    check: (s) => s.stats.battlesWon >= 100,
    progress: (s) => ({ current: Math.min(s.stats.battlesWon, 100), target: 100 }),
  },
  {
    id: "combat.maxLevel",
    name: "Final Boss",
    description: `Defeat an enemy level ${MAX_ENEMY_LEVEL} encounter.`,
    icon: "💀",
    category: "combat",
    check: (s) => s.stats.bestWinLevel >= MAX_ENEMY_LEVEL,
    progress: (s) => ({ current: s.stats.bestWinLevel, target: MAX_ENEMY_LEVEL }),
  },
  {
    id: "combat.skillIssue",
    name: "Skill Issue",
    description: "Lose 5 battles. Have you tried getting good?",
    icon: "🤡",
    category: "combat",
    hidden: true,
    check: (s) => s.stats.battlesLost >= 5,
  },
];

const miscAchievements: AchievementDef[] = [
  {
    id: "misc.helloWorld",
    name: "Hello, World",
    description: "Complete your first action.",
    icon: "👋",
    category: "misc",
    check: (s) => s.stats.actions >= 1,
  },
  {
    id: "misc.grind",
    name: "The Grind Never Stops",
    description: "Complete 10,000 actions.",
    icon: "🔁",
    category: "misc",
    check: (s) => s.stats.actions >= 10_000,
    progress: (s) => ({ current: Math.min(s.stats.actions, 10_000), target: 10_000 }),
  },
  {
    id: "misc.nightShift",
    name: "Night Shift",
    description: "Come back to 500 or more actions completed while you were away.",
    icon: "🌙",
    category: "misc",
    check: (s) => s.stats.bestOfflineHaul >= 500,
  },
  {
    id: "misc.supplyChain",
    name: "Supply Chain Issues",
    description: "Run out of materials mid-training 10 times.",
    icon: "🚚",
    category: "misc",
    hidden: true,
    check: (s) => s.stats.outOfMaterials >= 10,
  },
  {
    id: "misc.pointless",
    name: "Pointless",
    description: "Sit on 100 unspent skill points.",
    icon: "🪙",
    category: "misc",
    hidden: true,
    check: (s) => s.skillPoints >= 100,
  },
  {
    id: "misc.fullyUpgraded",
    name: "Maxed Out",
    description: "Buy every upgrade in the shop.",
    icon: "🛒",
    category: "misc",
    check: (s) => ownedUpgrades(s) >= totalUpgrades(),
    progress: (s) => ({ current: ownedUpgrades(s), target: totalUpgrades() }),
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  ...skillMilestones,
  ...skillCombos,
  ...resourceAchievements,
  ...ageAchievements,
  ...armyAchievements,
  ...combatAchievements,
  ...miscAchievements,
];

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export interface AchievementCheckResult {
  state: GameState;
  newlyUnlocked: string[];
}

/**
 * Evaluates every locked achievement against `state`. Returns the same state
 * object when nothing new unlocked, so callers can cheaply detect "no change".
 */
export function checkAchievements(state: GameState, now: number = Date.now()): AchievementCheckResult {
  const levels = getSkillLevels(state);
  const newlyUnlocked: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (state.achievements[def.id] !== undefined) continue;
    if (def.check(state, levels)) newlyUnlocked.push(def.id);
  }
  if (newlyUnlocked.length === 0) return { state, newlyUnlocked };

  const achievements = { ...state.achievements };
  for (const id of newlyUnlocked) achievements[id] = now;
  return { state: { ...state, achievements }, newlyUnlocked };
}

export function unlockedCount(state: GameState): number {
  return Object.keys(state.achievements).length;
}

export const ACHIEVEMENT_MILESTONES = [25, 50, 75, 100];

export function checkAchievementMilestones(state: GameState): number[] {
  const pct = Math.floor((unlockedCount(state) / ACHIEVEMENTS.length) * 100);
  const claimed = state.achievementMilestonesClaimed ?? [];
  return ACHIEVEMENT_MILESTONES.filter((m) => pct >= m && !claimed.includes(m));
}
