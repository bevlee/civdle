import {
  AGES,
  AgeId,
  BASE_ACTION_TIME,
  CONSUMABLES,
  ConsumableDef,
  ConditionalOutput,
  MAX_LEVEL,
  Recipe,
  ResourceId,
  SkillCategory,
  SKILLS,
  SkillId,
  SKILL_ORDER,
  XP_PER_ACTION,
} from "./gameData";

// ---------- XP / level math ----------

const LEVEL_XP_THRESHOLDS: number[] = (() => {
  const arr = [0];
  let total = 0;
  for (let i = 1; i <= MAX_LEVEL; i++) {
    total += Math.floor((i + 300 * Math.pow(2, i / 7)) / 8);
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
  activeConsumables: ResourceId[];
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
    activeConsumables: [],
  };
}

export function getSkillLevels(state: GameState): Record<SkillId, number> {
  const levels = {} as Record<SkillId, number>;
  for (const id of SKILL_ORDER) {
    levels[id] = levelForXp(state.skills[id].xp);
  }
  return levels;
}

// ---------- Ages ----------

export function getCurrentAgeIndex(skillLevels: Record<SkillId, number>): number {
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
    if (skills[id].unlocked) continue;
    const def = SKILLS[id];
    const met = def.prereqs.every((p) => (levels[p.skill] ?? 0) >= p.level);
    if (met) {
      skills[id] = { ...skills[id], unlocked: true };
      newlyUnlocked.push(id);
    }
  }
  return { state: { ...state, skills }, newlyUnlocked };
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
    // Crafting-style skills share the generic efficiency/betterRecipes/mastery trio.
    case "crafting":
    case "pottery":
    case "leatherworking":
    case "cooking":
    case "smithing":
      if (has("efficiency")) effects.flatTimeReduction += 0.2;
      if (has("mastery")) effects.flatTimeReduction += 0.4;
      break;
  }
  return effects;
}

// ---------- Consumable effects ----------

export interface ConsumableEffects {
  timeReduction: number;
  xpBonus: number;
  xpMultiplier: number;
  outputMultiplier: number;
}

export function getActiveConsumableDefs(
  activeConsumables: ResourceId[],
  resources: Partial<Record<ResourceId, number>>,
  skillCategory: SkillCategory
): ConsumableDef[] {
  return activeConsumables
    .map((id) => CONSUMABLES.find((c) => c.resource === id))
    .filter((c): c is ConsumableDef => {
      if (!c) return false;
      if ((resources[c.resource] ?? 0) < 1) return false;
      if (c.appliesTo && c.appliesTo !== skillCategory) return false;
      return true;
    });
}

export function aggregateConsumableEffects(defs: ConsumableDef[]): ConsumableEffects {
  const effects: ConsumableEffects = { timeReduction: 0, xpBonus: 0, xpMultiplier: 1, outputMultiplier: 1 };
  for (const c of defs) {
    effects.timeReduction += c.effects.timeReduction ?? 0;
    effects.xpBonus += c.effects.xpBonus ?? 0;
    effects.xpMultiplier *= c.effects.xpMultiplier ?? 1;
    effects.outputMultiplier *= c.effects.outputMultiplier ?? 1;
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
  consumableEffects?: ConsumableEffects
): ActionResult | null {
  const def = SKILLS[skillId];
  const recipe = def.recipes.find((r) => r.id === selectedRecipeId) ?? def.recipes[0];
  if (recipe.requiredLevel > level) return null;

  const effects = getActionEffects(skillId, owned);
  const ageBonus = getAgeBonus(ageIndex);
  const ce = consumableEffects ?? { timeReduction: 0, xpBonus: 0, xpMultiplier: 1, outputMultiplier: 1 };

  const speedMult = globalUpgrades.includes("debugSpeed") ? 0.01 : 1;
  const time = Math.max(0.2, (BASE_ACTION_TIME - effects.flatTimeReduction - ce.timeReduction) * ageBonus.timeMult) * speedMult;

  let outputs = resolveOutputs(recipe.outputs, level, ageIndex, effects.clayLevelOverride);
  outputs = outputs.map((o) => {
    let amount = o.amount + (effects.outputBonuses[o.resource] ?? 0);
    const isOre = o.resource === "copperOre" || o.resource === "ironOre" || o.resource === "coal";
    if (isOre && effects.oreDoubleChance > 0 && Math.random() < effects.oreDoubleChance) {
      amount *= 2;
    }
    amount *= ageBonus.outputMult * ce.outputMultiplier;
    return { resource: o.resource, amount };
  });

  // "Better Recipes" adds +1 to the recipe's primary (first) output.
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
  const ageIndex = getCurrentAgeIndex(levels);
  const skillState = state.skills[skillId];
  const skillCategory = SKILLS[skillId].category;

  const activeDefs = getActiveConsumableDefs(state.activeConsumables, state.resources, skillCategory);
  const ce = aggregateConsumableEffects(activeDefs);

  const result = computeActionResult(skillId, level, skillState.upgrades, ageIndex, skillState.selectedRecipeId, state.globalUpgrades, ce);
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
    const whole = Math.floor(output.amount);
    const frac = output.amount - whole;
    const resolved = whole + (frac > 0 && Math.random() < frac ? 1 : 0);
    if (resolved > 0) {
      resources[output.resource] = (resources[output.resource] ?? 0) + resolved;
    }
  }

  // Consume active consumables (probabilistic)
  let activeConsumables = [...state.activeConsumables];
  for (const def of activeDefs) {
    if (Math.random() < def.consumeChance) {
      resources[def.resource] = (resources[def.resource] ?? 0) - 1;
      if ((resources[def.resource] ?? 0) < 1) {
        activeConsumables = activeConsumables.filter((id) => id !== def.resource);
      }
    }
  }

  const oldXp = skillState.xp;
  const oldLevel = level;
  const baseXp = XP_PER_ACTION + ce.xpBonus;
  const newXp = oldXp + Math.floor(baseXp * ce.xpMultiplier);
  const newLevel = levelForXp(newXp);
  const levelsGained = Math.max(0, newLevel - oldLevel);

  let nextState: GameState = {
    ...state,
    resources,
    activeConsumables,
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
    const ageIndex = getCurrentAgeIndex(levels);
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
