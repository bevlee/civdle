import type {
  AgeDef,
  AgeId,
  ConditionalOutput,
  Recipe,
  ResourceId,
  SkillId,
} from "./gameData";
import {
  AGES,
  AGE_ADVANCE_COSTS,
  BASE_ACTION_TIME,
  MAX_LEVEL,
  SKILLS,
  SKILL_ORDER,
  XP_PER_ACTION,
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

interface ActionEffects {
  flatTimeReduction: number;
  outputBonuses: Partial<Record<ResourceId, number>>;
  clayLevelOverride?: number;
  oreDoubleChance: number;
}

function getActionEffects(skillId: SkillId, owned: string[]): ActionEffects {
  const has = (id: string) => owned.includes(id);
  const effects: ActionEffects = { flatTimeReduction: 0, outputBonuses: {}, oreDoubleChance: 0 };

  switch (skillId) {
    case "foraging":
      if (has("keenEye")) effects.outputBonuses.food = (effects.outputBonuses.food ?? 0) + 1;
      if (has("quickHands")) effects.flatTimeReduction += 0.2;
      if (has("expertForager")) {
        effects.outputBonuses.plantFibres = (effects.outputBonuses.plantFibres ?? 0) + 1;
        effects.clayLevelOverride = 1;
      }
      break;
    case "woodcutting":
      if (has("sharpAxe")) effects.outputBonuses.wood = (effects.outputBonuses.wood ?? 0) + 1;
      if (has("efficientLogging")) effects.flatTimeReduction += 0.2;
      if (has("timberExpert")) effects.outputBonuses.wood = (effects.outputBonuses.wood ?? 0) + 2;
      break;
    case "mining":
      if (has("betterPick")) {
        effects.outputBonuses.stone = (effects.outputBonuses.stone ?? 0) + 1;
        effects.outputBonuses.copperOre = (effects.outputBonuses.copperOre ?? 0) + 1;
        effects.outputBonuses.ironOre = (effects.outputBonuses.ironOre ?? 0) + 1;
        effects.outputBonuses.coal = (effects.outputBonuses.coal ?? 0) + 1;
      }
      if (has("deepMining")) effects.flatTimeReduction += 0.2;
      if (has("oreSense")) effects.oreDoubleChance = 0.25;
      break;
    case "fishing":
      if (has("betterBait")) effects.outputBonuses.rawFish = (effects.outputBonuses.rawFish ?? 0) + 1;
      if (has("netFishing")) effects.flatTimeReduction += 0.2;
      if (has("masterFisher")) effects.outputBonuses.rawFish = (effects.outputBonuses.rawFish ?? 0) + 2;
      break;
    case "hunting":
      if (has("keenHunter")) effects.outputBonuses.rawHides = (effects.outputBonuses.rawHides ?? 0) + 1;
      if (has("swiftHunt")) effects.flatTimeReduction += 0.2;
      if (has("masterHunter")) effects.outputBonuses.food = (effects.outputBonuses.food ?? 0) + 1;
      break;
    case "farming":
      if (has("greenThumb")) effects.outputBonuses.grain = (effects.outputBonuses.grain ?? 0) + 1;
      if (has("irrigation")) effects.flatTimeReduction += 0.2;
      if (has("masterFarmer")) effects.outputBonuses.vegetables = (effects.outputBonuses.vegetables ?? 0) + 1;
      break;
    case "herding":
      if (has("gentleHand")) effects.outputBonuses.wool = (effects.outputBonuses.wool ?? 0) + 1;
      if (has("swiftShepherd")) effects.flatTimeReduction += 0.2;
      if (has("masterHerder")) effects.outputBonuses.milk = (effects.outputBonuses.milk ?? 0) + 1;
      break;
    case "crafting":
    case "pottery":
    case "leatherworking":
    case "cooking":
    case "smithing":
    case "weaving":
    case "carpentry":
    case "brewing":
    case "construction":
      if (has("efficiency")) effects.flatTimeReduction += 0.2;
      if (has("mastery")) effects.flatTimeReduction += 0.4;
      break;
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
  clayLevelOverride: number | undefined
): ResourceAmount[] {
  return outputs
    .filter((o) => {
      const effectiveLevelRequired =
        o.resource === "clay" && clayLevelOverride !== undefined ? clayLevelOverride : o.levelRequired;
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

export interface ActionResult {
  time: number;
  outputs: ResourceAmount[];
  inputs: ResourceAmount[];
  recipe: Recipe;
}

// Computes the timing/outputs/inputs for one action of a skill's currently
// selected recipe, given the skill's level, owned upgrades, and current age.
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

  const effects = getActionEffects(skillId, owned);
  const ageBonus = getAgeBonus(ageIndex);

  const speedMult = globalUpgrades.includes("debugSpeed") ? 0.01 : 1;
  const time = Math.max(0.2, (BASE_ACTION_TIME - effects.flatTimeReduction) * ageBonus.timeMult) * speedMult;

  let outputs = resolveOutputs(recipe.outputs, level, ageIndex, effects.clayLevelOverride);
  outputs = outputs.map((o) => {
    let amount = o.amount + (effects.outputBonuses[o.resource] ?? 0);
    const isOre = o.resource === "copperOre" || o.resource === "ironOre" || o.resource === "coal";
    if (isOre && effects.oreDoubleChance > 0 && Math.random() < effects.oreDoubleChance) {
      amount *= 2;
    }
    amount *= ageBonus.outputMult;
    return { resource: o.resource, amount };
  });

  if (recipe.inputs.length > 0 && owned.includes("betterRecipes") && outputs.length > 0) {
    outputs = outputs.map((o, i) => (i === 0 ? { ...o, amount: o.amount + 1 * ageBonus.outputMult } : o));
  }

  return { time, outputs, inputs: recipe.inputs, recipe };
}

export function canAffordInputs(resources: Partial<Record<ResourceId, number>>, inputs: ResourceAmount[]): boolean {
  return inputs.every((i) => (resources[i.resource] ?? 0) >= i.amount);
}

// ---------- Applying a single action ----------

export interface ApplyActionOutcome {
  state: GameState;
  leveledUp: boolean;
  newlyUnlockedSkills: SkillId[];
  outOfMaterials: boolean;
}

export function applyAction(state: GameState, skillId: SkillId): ApplyActionOutcome {
  const levels = getSkillLevels(state);
  const level = levels[skillId];
  const ageIndex = state.ageIndex;
  const skillState = state.skills[skillId];

  const result = computeActionResult(skillId, level, skillState.upgrades, ageIndex, skillState.selectedRecipeId, state.globalUpgrades);
  if (!result) {
    return { state, leveledUp: false, newlyUnlockedSkills: [], outOfMaterials: false };
  }

  if (!canAffordInputs(state.resources, result.inputs)) {
    return { state, leveledUp: false, newlyUnlockedSkills: [], outOfMaterials: true };
  }

  const resources = { ...state.resources };
  for (const input of result.inputs) {
    resources[input.resource] = (resources[input.resource] ?? 0) - input.amount;
  }
  for (const output of result.outputs) {
    resources[output.resource] = (resources[output.resource] ?? 0) + output.amount;
  }

  const oldXp = skillState.xp;
  const oldLevel = level;
  const newXp = oldXp + XP_PER_ACTION;
  const newLevel = levelForXp(newXp);
  const levelsGained = Math.max(0, newLevel - oldLevel);

  let nextState: GameState = {
    ...state,
    resources,
    skills: { ...state.skills, [skillId]: { ...skillState, xp: newXp } },
    skillPoints: state.skillPoints + levelsGained,
  };

  let newlyUnlockedSkills: SkillId[] = [];
  if (levelsGained > 0) {
    const unlockResult = computeUnlocks(nextState);
    nextState = unlockResult.state;
    newlyUnlockedSkills = unlockResult.newlyUnlocked;
  }

  return { state: nextState, leveledUp: levelsGained > 0, newlyUnlockedSkills, outOfMaterials: false };
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
