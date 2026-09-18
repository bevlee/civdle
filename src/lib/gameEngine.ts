import type {
  AgeDef,
  AgeId,
  ConditionalOutput,
  Recipe,
  ResourceId,
  SkillId,
  SkillUpgrade,
} from "./gameData";
import {
  AGES,
  AGE_ADVANCE_COSTS,
  BASE_ACTION_TIME,
  DEBUG_GLOBAL_UPGRADES,
  GLOBAL_UPGRADES,
  LEGACY_UPGRADE_SLOTS,
  MAX_LEVEL,
  SKILLS,
  SKILL_ORDER,
  XP_PER_ACTION,
  XP_SCALING_RATE,
} from "./gameData";
import type { GachaState } from "./combatEngine";
import { createInitialGachaState } from "./combatEngine";

// ---------- XP / level math ----------

const LEVEL_XP_THRESHOLDS: number[] = (() => {
  const arr = [0];
  let total = 0;
  for (let i = 1; i <= MAX_LEVEL; i++) {
    total += Math.floor(50 * Math.pow(1.15, i - 1));
    arr.push(total);
  }
  return arr;
})();

export function xpForLevel(level: number): number {
  return LEVEL_XP_THRESHOLDS[Math.min(level, MAX_LEVEL)];
}

export function levelForXp(xp: number): number {
  let lo = 0;
  let hi = MAX_LEVEL;
  while (lo < hi) {
    const mid = lo + Math.ceil((hi - lo) / 2);
    if (LEVEL_XP_THRESHOLDS[mid] <= xp) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

// ---------- Game state ----------

/** Counters that a state snapshot alone can't reconstruct; used by achievements. */
export interface GameStats {
  actions: number;
  outOfMaterials: number;
  battlesWon: number;
  battlesLost: number;
  bestWinLevel: number;
  cardsSummoned: number;
  packsOpened: number;
  bestSummonStars: number;
  merges: number;
  cardsDiscarded: number;
  bestOfflineHaul: number;
}

export function createInitialStats(): GameStats {
  return {
    actions: 0,
    outOfMaterials: 0,
    battlesWon: 0,
    battlesLost: 0,
    bestWinLevel: 0,
    cardsSummoned: 0,
    packsOpened: 0,
    bestSummonStars: 0,
    merges: 0,
    cardsDiscarded: 0,
    bestOfflineHaul: 0,
  };
}

export interface SkillState {
  xp: number;
  unlocked: boolean;
  upgrades: string[];
  selectedRecipeId: string;
}

export interface GameState {
  skills: Record<SkillId, SkillState>;
  resources: Partial<Record<ResourceId, number>>;
  skillPoints: number;
  activeSkill: SkillId | null;
  lastSavedAt: number;
  globalUpgrades: string[];
  gacha: GachaState;
  ageIndex: number;
  /** Unlocked achievement ids mapped to their unlock timestamp (ms). */
  achievements: Record<string, number>;
  stats: GameStats;
}

export function createInitialState(): GameState {
  const skills = {} as Record<SkillId, SkillState>;
  for (const id of SKILL_ORDER) {
    const def = SKILLS[id];
    skills[id] = {
      xp: 0,
      unlocked: def.prereqs.length === 0,
      upgrades: [],
      selectedRecipeId: def.recipes[0].id,
    };
  }
  return {
    skills,
    resources: {},
    skillPoints: 0,
    activeSkill: null,
    lastSavedAt: Date.now(),
    globalUpgrades: [],
    gacha: createInitialGachaState(),
    ageIndex: 0,
    achievements: {},
    stats: createInitialStats(),
  };
}

export function getSkillLevels(state: GameState): Record<SkillId, number> {
  const levels = {} as Record<SkillId, number>;
  for (const id of SKILL_ORDER) {
    levels[id] = levelForXp(state.skills[id]?.xp ?? 0);
  }
  return levels;
}

// ---------- Ages ----------

// The highest age whose skill-level condition is satisfied — used only to
// migrate saves from before ages were resource-gated (see loadFromStorage)
// and is otherwise NOT the player's actual current age (that's state.ageIndex).
export function getSkillEligibleAgeIndex(skillLevels: Record<SkillId, number>): number {
  let best = 0;
  for (let i = 0; i < AGES.length; i++) {
    const age = AGES[i];
    if (age.condition.every((c) => (skillLevels[c.skill] ?? 0) >= c.level)) {
      best = i;
    }
  }
  return best;
}

export interface AgeBonus {
  timeMult: number;
  outputMult: number;
}

// Bonuses stack additively across every tier reached (see AGES for each tier's
// marginal contribution): Iron Age = Bronze's -10%/+10% plus Iron's own -10%/+10%.
export function getAgeBonus(ageIndex: number): AgeBonus {
  let timeReduction = 0;
  let outputBonus = 0;
  for (let i = 1; i <= ageIndex; i++) {
    timeReduction += 1 - AGES[i].bonus.timeMult;
    outputBonus += AGES[i].bonus.outputMult - 1;
  }
  return { timeMult: 1 - timeReduction, outputMult: 1 + outputBonus };
}

// ---------- Unlocks ----------

export function computeUnlocks(state: GameState): { state: GameState; newlyUnlocked: SkillId[] } {
  const levels = getSkillLevels(state);
  const newlyUnlocked: SkillId[] = [];
  const skills = { ...state.skills };
  for (const id of SKILL_ORDER) {
    if (!skills[id] || skills[id].unlocked) continue;
    const def = SKILLS[id];
    const met = def.prereqs.every((p) => (levels[p.skill] ?? 0) >= p.level);
    if (met) {
      skills[id] = { ...skills[id], unlocked: true };
      newlyUnlocked.push(id);
    }
  }
  return { state: { ...state, skills }, newlyUnlocked };
}

// ---------- Age advancement ----------

export interface AgeAdvanceStatus {
  nextAge: AgeDef | null;
  cost: ResourceAmount[];
  skillsMet: boolean;
  resourcesMet: boolean;
  canAdvance: boolean;
}

export function getAgeAdvanceStatus(state: GameState, skillLevels: Record<SkillId, number>): AgeAdvanceStatus {
  const nextIndex = state.ageIndex + 1;
  if (nextIndex >= AGES.length) {
    return { nextAge: null, cost: [], skillsMet: false, resourcesMet: false, canAdvance: false };
  }
  const nextAge = AGES[nextIndex];
  const cost = AGE_ADVANCE_COSTS[nextAge.id] ?? [];
  const skillsMet = nextAge.condition.every((c) => (skillLevels[c.skill] ?? 0) >= c.level);
  const resourcesMet = canAffordInputs(state.resources, cost);
  return { nextAge, cost, skillsMet, resourcesMet, canAdvance: skillsMet && resourcesMet };
}

// Consumes the next age's resource cost and advances state.ageIndex by one.
// Returns the unchanged state if the requirements aren't met.
export function advanceAge(state: GameState, skillLevels: Record<SkillId, number>): GameState {
  const status = getAgeAdvanceStatus(state, skillLevels);
  if (!status.canAdvance || !status.nextAge) return state;
  const resources = { ...state.resources };
  for (const c of status.cost) {
    resources[c.resource] = (resources[c.resource] ?? 0) - c.amount;
  }
  return { ...state, resources, ageIndex: state.ageIndex + 1 };
}

// ---------- Upgrade effects ----------

// One line of a hover breakdown: which buff, and what it did ("-0.2s", "×2").
export interface Modifier {
  source: string;
  effect: string;
}

interface ActionEffects {
  flatTimeReduction: number;
  timeMult: number;
  // Debug cheats multiply after the 0.2s floor so they stay 100x fast.
  postFloorTimeMult: number;
  outputBonuses: Partial<Record<ResourceId, number>>;
  primaryOutputBonus: number;
  outputMult: number;
  doubleChance: number;
  doubleResources: ResourceId[] | null;
  refundChance: number;
  xpMult: number;
  byproducts: ChancedOutput[];
  outputLevelOverrides: Partial<Record<ResourceId, number>>;
  timeModifiers: Modifier[];
  xpModifiers: Modifier[];
}

function formatMult(mult: number): string {
  return `×${Number(mult.toFixed(2))}`;
}

function formatSeconds(seconds: number): string {
  return `-${Number(seconds.toFixed(2))}s`;
}

function findUpgrade(skillId: SkillId, id: string): SkillUpgrade | undefined {
  return SKILLS[skillId].upgrades.find((u) => u.id === id);
}

function findGlobalUpgrade(id: string): SkillUpgrade | undefined {
  return GLOBAL_UPGRADES.find((u) => u.id === id) ?? DEBUG_GLOBAL_UPGRADES.find((u) => u.id === id);
}

function foldUpgrade(effects: ActionEffects, upgrade: SkillUpgrade, isDebug = false): void {
  for (const e of upgrade.effects) {
    switch (e.type) {
      case "flatTime":
        effects.flatTimeReduction += e.seconds;
        effects.timeModifiers.push({ source: upgrade.name, effect: formatSeconds(e.seconds) });
        break;
      case "timeMult":
        if (isDebug) effects.postFloorTimeMult *= e.mult;
        else effects.timeMult *= e.mult;
        effects.timeModifiers.push({ source: upgrade.name, effect: formatMult(e.mult) });
        break;
      case "flatOutput":
        effects.outputBonuses[e.resource] = (effects.outputBonuses[e.resource] ?? 0) + e.amount;
        break;
      case "flatPrimaryOutput":
        effects.primaryOutputBonus += e.amount;
        break;
      case "outputMult":
        effects.outputMult *= e.mult;
        break;
      case "doubleChance":
        // Chances don't stack multiplicatively; the best one wins.
        if (e.chance > effects.doubleChance) {
          effects.doubleChance = e.chance;
          effects.doubleResources = e.resources ?? null;
        }
        break;
      case "refundChance":
        effects.refundChance = Math.max(effects.refundChance, e.chance);
        break;
      case "xpMult":
        effects.xpMult *= e.mult;
        effects.xpModifiers.push({ source: upgrade.name, effect: formatMult(e.mult) });
        break;
      case "byproduct":
        effects.byproducts.push({ resource: e.resource, amount: e.amount, chance: e.chance ?? 1 });
        break;
      case "outputLevel": {
        const current = effects.outputLevelOverrides[e.resource];
        effects.outputLevelOverrides[e.resource] = current === undefined ? e.level : Math.min(current, e.level);
        break;
      }
    }
  }
}

// Folds every owned skill upgrade, then the age bonus, then every owned global
// upgrade, so the modifier lists read in the order the multipliers apply.
function getActionEffects(skillId: SkillId, owned: string[], ageIndex: number, globalUpgrades: string[]): ActionEffects {
  const effects: ActionEffects = {
    flatTimeReduction: 0,
    timeMult: 1,
    postFloorTimeMult: 1,
    outputBonuses: {},
    primaryOutputBonus: 0,
    outputMult: 1,
    doubleChance: 0,
    doubleResources: null,
    refundChance: 0,
    xpMult: 1,
    byproducts: [],
    outputLevelOverrides: {},
    timeModifiers: [],
    xpModifiers: [],
  };

  for (const id of owned) {
    const upgrade = findUpgrade(skillId, id);
    if (upgrade) foldUpgrade(effects, upgrade);
  }

  const ageBonus = getAgeBonus(ageIndex);
  effects.timeMult *= ageBonus.timeMult;
  effects.outputMult *= ageBonus.outputMult;
  if (ageIndex > 0) {
    effects.timeModifiers.push({ source: AGES[ageIndex].name, effect: formatMult(ageBonus.timeMult) });
  }

  for (const id of globalUpgrades) {
    const upgrade = findGlobalUpgrade(id);
    if (upgrade) foldUpgrade(effects, upgrade, DEBUG_GLOBAL_UPGRADES.includes(upgrade));
  }

  return effects;
}

// ---------- Recipes ----------

export function getAvailableRecipes(skillId: SkillId, level: number): Recipe[] {
  return SKILLS[skillId].recipes.filter((r) => r.requiredLevel <= level);
}

function resolveOutputs(
  outputs: ConditionalOutput[],
  level: number,
  ageIndex: number,
  levelOverrides: Partial<Record<ResourceId, number>>
): ResourceAmount[] {
  return outputs
    .filter((o) => {
      const override = levelOverrides[o.resource];
      const effectiveLevelRequired =
        override !== undefined && o.levelRequired !== undefined ? Math.min(override, o.levelRequired) : o.levelRequired;
      if (effectiveLevelRequired !== undefined && level < effectiveLevelRequired) return false;
      if (o.ageRequired !== undefined && ageIndex < AGES.findIndex((a) => a.id === o.ageRequired)) return false;
      return true;
    })
    .map((o) => ({ resource: o.resource, amount: o.amount }));
}

interface ResourceAmount {
  resource: ResourceId;
  amount: number;
}

export interface ChancedOutput extends ResourceAmount {
  chance: number;
}

export interface ActionResult {
  time: number;
  baseTime: number;
  timeModifiers: Modifier[];
  xp: number;
  baseXp: number;
  xpModifiers: Modifier[];
  // Expected (average) amounts, already scaled by every multiplier; may be
  // fractional. See rollOutputs.
  outputs: ResourceAmount[];
  // Extra outputs that each land with their own probability.
  chancedOutputs: ChancedOutput[];
  // Chance that every output (or just `doubleResources`) is doubled this action.
  doubleChance: number;
  doubleResources: ResourceId[] | null;
  // Chance the recipe's inputs are not consumed.
  refundChance: number;
  inputs: ResourceAmount[];
  recipe: Recipe;
}

// Computes the timing/expected outputs/inputs/XP for one action of a skill's
// currently selected recipe. Pure and deterministic: chance-based effects are
// reported as chances here and rolled by rollOutputs / applyAction.
export function computeActionResult(
  skillId: SkillId,
  level: number,
  owned: string[],
  ageIndex: number,
  selectedRecipeId: string,
  globalUpgrades: string[] = [],
): ActionResult | null {
  const def = SKILLS[skillId];
  const recipe = def.recipes.find((r) => r.id === selectedRecipeId) ?? def.recipes[0];
  if (recipe.requiredLevel > level) return null;

  const effects = getActionEffects(skillId, owned, ageIndex, globalUpgrades);

  const time = Math.max(0.2, (BASE_ACTION_TIME - effects.flatTimeReduction) * effects.timeMult) * effects.postFloorTimeMult;
  const scaledBaseXp = Math.round(XP_PER_ACTION * Math.pow(XP_SCALING_RATE, level));
  const xp = Math.round(scaledBaseXp * effects.xpMult);

  const outputs = resolveOutputs(recipe.outputs, level, ageIndex, effects.outputLevelOverrides).map((o, i) => {
    let amount = o.amount + (effects.outputBonuses[o.resource] ?? 0);
    if (i === 0) amount += effects.primaryOutputBonus;
    return { resource: o.resource, amount: amount * effects.outputMult };
  });

  const chancedOutputs: ChancedOutput[] = [];
  for (const b of effects.byproducts) {
    const scaled = b.amount * effects.outputMult;
    if (b.chance >= 1) {
      const existing = outputs.find((o) => o.resource === b.resource);
      if (existing) existing.amount += scaled;
      else outputs.push({ resource: b.resource, amount: scaled });
    } else {
      chancedOutputs.push({ resource: b.resource, amount: scaled, chance: b.chance });
    }
  }

  return {
    time,
    baseTime: BASE_ACTION_TIME,
    timeModifiers: effects.timeModifiers,
    xp,
    baseXp: scaledBaseXp,
    xpModifiers: effects.xpModifiers,
    outputs,
    chancedOutputs,
    doubleChance: effects.doubleChance,
    doubleResources: effects.doubleResources,
    refundChance: effects.refundChance,
    inputs: recipe.inputs,
    recipe,
  };
}

// ---------- Rolling outputs ----------

export interface RolledOutput {
  resource: ResourceId;
  // Whole number actually gained this action.
  amount: number;
  // The average this roll was drawn from.
  expected: number;
  // True when the roll beat the guaranteed floor(expected).
  bonus: boolean;
}

function chanceRound(expected: number, rng: () => number): { amount: number; base: number } {
  const base = Math.floor(expected);
  const fraction = expected - base;
  return { amount: base + (fraction > 0 && rng() < fraction ? 1 : 0), base };
}

// Chance rounding: a fractional expectation becomes a probability of one extra
// unit, so 1.1 pays 1 with a 10% chance of 2 and 0.3 pays 1 on 30% of actions.
// The long-run average equals the expected amount. Outputs that roll 0 are
// dropped. The action's double roll (one per action) and any chanced
// byproducts are applied here too.
export function rollOutputs(result: ActionResult, rng: () => number = Math.random): RolledOutput[] {
  const rolled: RolledOutput[] = [];
  const doubled = result.doubleChance > 0 && rng() < result.doubleChance;
  for (const o of result.outputs) {
    const expected = Math.round(o.amount * 1000) / 1000;
    let { amount, base } = chanceRound(expected, rng);
    const canDouble = result.doubleResources === null || result.doubleResources.includes(o.resource);
    if (amount > 0 && doubled && canDouble) amount *= 2;
    if (amount <= 0) continue;
    rolled.push({ resource: o.resource, amount, expected, bonus: amount > base });
  }
  for (const c of result.chancedOutputs) {
    if (rng() >= c.chance) continue;
    const expected = Math.round(c.amount * 1000) / 1000;
    const { amount } = chanceRound(expected, rng);
    if (amount <= 0) continue;
    rolled.push({ resource: c.resource, amount, expected, bonus: true });
  }
  return rolled;
}

export function canAffordInputs(resources: Partial<Record<ResourceId, number>>, inputs: ResourceAmount[]): boolean {
  return inputs.every((i) => (resources[i.resource] ?? 0) >= i.amount);
}

// ---------- Global (mastery) upgrades ----------

export function hasMaxedSkill(state: GameState): boolean {
  return SKILL_ORDER.some((id) => levelForXp(state.skills[id]?.xp ?? 0) >= MAX_LEVEL);
}

export function canBuyGlobalUpgrade(state: GameState, upgradeId: string): boolean {
  if (state.globalUpgrades.includes(upgradeId)) return false;
  if (DEBUG_GLOBAL_UPGRADES.some((u) => u.id === upgradeId)) return true;
  const upgrade = GLOBAL_UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return false;
  return hasMaxedSkill(state) && state.skillPoints >= upgrade.cost;
}

// Maps a saved upgrade list onto the current upgrade ids for a skill, dropping
// anything unknown and de-duplicating.
export function migrateUpgradeIds(skillId: SkillId, saved: string[]): string[] {
  const defs = SKILLS[skillId].upgrades;
  const out: string[] = [];
  for (const id of saved) {
    let resolved: string | undefined = defs.some((u) => u.id === id) ? id : undefined;
    if (!resolved) {
      const slot = LEGACY_UPGRADE_SLOTS[id];
      if (slot !== undefined && defs[slot]) resolved = defs[slot].id;
    }
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

// ---------- Applying a single action ----------

export interface ApplyActionOutcome {
  state: GameState;
  leveledUp: boolean;
  newlyUnlockedSkills: SkillId[];
  outOfMaterials: boolean;
  gains: RolledOutput[];
}

export function applyAction(state: GameState, skillId: SkillId, rng: () => number = Math.random): ApplyActionOutcome {
  const levels = getSkillLevels(state);
  const level = levels[skillId];
  const ageIndex = state.ageIndex;
  const skillState = state.skills[skillId];

  const result = computeActionResult(skillId, level, skillState.upgrades, ageIndex, skillState.selectedRecipeId, state.globalUpgrades);
  if (!result) {
    return { state, leveledUp: false, newlyUnlockedSkills: [], outOfMaterials: false, gains: [] };
  }

  if (!canAffordInputs(state.resources, result.inputs)) {
    return { state, leveledUp: false, newlyUnlockedSkills: [], outOfMaterials: true, gains: [] };
  }

  const gains = rollOutputs(result, rng);
  const resources = { ...state.resources };
  const refunded = result.refundChance > 0 && rng() < result.refundChance;
  if (!refunded) {
    for (const input of result.inputs) {
      resources[input.resource] = (resources[input.resource] ?? 0) - input.amount;
    }
  }
  for (const gain of gains) {
    resources[gain.resource] = (resources[gain.resource] ?? 0) + gain.amount;
  }

  const oldXp = skillState.xp;
  const oldLevel = level;
  const newXp = oldXp + result.xp;
  const newLevel = levelForXp(newXp);
  const levelsGained = Math.max(0, newLevel - oldLevel);

  let nextState: GameState = {
    ...state,
    resources,
    skills: { ...state.skills, [skillId]: { ...skillState, xp: newXp } },
    skillPoints: state.skillPoints + levelsGained,
    stats: { ...state.stats, actions: state.stats.actions + 1 },
  };

  let newlyUnlockedSkills: SkillId[] = [];
  if (levelsGained > 0) {
    const unlockResult = computeUnlocks(nextState);
    nextState = unlockResult.state;
    newlyUnlockedSkills = unlockResult.newlyUnlocked;
  }

  return { state: nextState, leveledUp: levelsGained > 0, newlyUnlockedSkills, outOfMaterials: false, gains };
}

// ---------- Offline catch-up ----------

export interface OfflineResult {
  state: GameState;
  actionsProcessed: number;
  secondsApplied: number;
  outOfMaterials: boolean;
}

const MAX_OFFLINE_ACTIONS = 2_000_000;

export function processOfflineProgress(state: GameState, elapsedSeconds: number): OfflineResult {
  if (!state.activeSkill || elapsedSeconds <= 0) {
    return { state, actionsProcessed: 0, secondsApplied: 0, outOfMaterials: false };
  }

  let working = state;
  let remaining = elapsedSeconds;
  let actionsProcessed = 0;
  let outOfMaterials = false;
  const skillId = state.activeSkill;

  while (actionsProcessed < MAX_OFFLINE_ACTIONS) {
    const levels = getSkillLevels(working);
    const level = levels[skillId];
    const ageIndex = working.ageIndex;
    const skillState = working.skills[skillId];
    const result = computeActionResult(skillId, level, skillState.upgrades, ageIndex, skillState.selectedRecipeId, working.globalUpgrades);
    if (!result || result.time > remaining) break;
    if (!canAffordInputs(working.resources, result.inputs)) {
      outOfMaterials = true;
      break;
    }

    const outcome = applyAction(working, skillId);
    working = outcome.state;
    remaining -= result.time;
    actionsProcessed++;
  }

  return { state: working, actionsProcessed, secondsApplied: elapsedSeconds - remaining, outOfMaterials };
}

export { AGES };
export type { AgeId };
