import { CONSUMABLES, type ResourceId, SKILLS, SKILL_ORDER, type SkillId } from "./gameData";
import {
  type ApplyActionOutcome,
  type GameState,
  advanceAge,
  aggregateConsumableEffects,
  applyAction,
  computeActionResult,
  computeUnlocks,
  createInitialState,
  getActiveConsumableDefs,
  getAgeAdvanceStatus,
  getAgeBonus,
  getSkillEligibleAgeIndex,
  getSkillLevels,
  processOfflineProgress,
} from "./gameEngine";
import {
  createInitialCombatState,
  placeUnit,
  removeUnit,
  startWave,
  tickCombat,
} from "./combatEngine";
import { BARRACKS_RECIPES, generateWave, type UnitId, UNITS } from "./combatData";
import { EventQueue, type QueuedEvent } from "./eventQueue.svelte";

const SAVE_KEY = "civdle-save";
const SAVE_INTERVAL_MS = 5000;
const PROGRESS_INTERVAL_MS = 100;

// ---------- localStorage helpers ----------

function loadFromStorage(): GameState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !parsed.skills) return createInitialState();
    if (!parsed.globalUpgrades) parsed.globalUpgrades = [];
    if (!parsed.activeConsumables) parsed.activeConsumables = [];
    if (!parsed.combat) parsed.combat = createInitialCombatState();
    for (const id of SKILL_ORDER) {
      if (!parsed.skills[id]) {
        const def = SKILLS[id];
        parsed.skills[id] = {
          xp: 0,
          unlocked: def.prereqs.length === 0,
          upgrades: [],
          selectedRecipeId: def.recipes[0].id,
        };
      }
    }
    // Migrate saves from before ages were resource-gated: grandfather the
    // player into the highest age their skill levels already qualified for.
    if (typeof parsed.ageIndex !== "number") {
      parsed.ageIndex = getSkillEligibleAgeIndex(getSkillLevels(parsed));
    }
    return parsed;
  } catch {
    return createInitialState();
  }
}

function saveToStorage(state: GameState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ ...state, lastSavedAt: Date.now() }),
    );
  } catch {
    // localStorage unavailable (private mode, quota) — silently skip saving.
  }
}

// ---------- CivdleGame ----------

/**
 * Svelte 5 rune-based game-state manager. Replaces the React `useGameState`
 * hook. Instantiate once and call `init()` from a component's `onMount`;
 * `init()` returns a cleanup function to call on unmount.
 */
export class CivdleGame {
  // ----- Reactive fields ($state) -----
  state = $state<GameState>(createInitialState());
  loaded = $state(false);
  message = $state<string | null>(null);
  pendingUnlocks = $state<SkillId[]>([]);
  #progress = $state(0);

  // ----- Non-reactive instance fields -----
  eventQueue = new EventQueue();
  #actionTimeout: ReturnType<typeof setTimeout> | null = null;
  #progressInterval: ReturnType<typeof setInterval> | null = null;
  #actionStart = 0;
  #actionDuration = 0;
  #saveInterval: ReturnType<typeof setInterval> | null = null;
  #combatInterval: ReturnType<typeof setInterval> | null = null;
  #handleUnload: (() => void) | null = null;

  // ----- Getters (replaces useMemo) -----

  get levels() {
    return getSkillLevels(this.state);
  }

  get ageIndex() {
    return this.state.ageIndex;
  }

  get ageBonus() {
    return getAgeBonus(this.state.ageIndex);
  }

  get ageAdvanceStatus() {
    return getAgeAdvanceStatus(this.state, this.levels);
  }

  get displayProgress() {
    return this.state.activeSkill ? this.#progress : 0;
  }

  get events(): QueuedEvent[] {
    return this.eventQueue.events;
  }

  // ----- Lifecycle -----

  /**
   * Call from `onMount` in the page component. Returns a cleanup function
   * that clears timers, removes listeners, and persists a final save.
   */
  init(): () => void {
    // 1. Load from localStorage + offline catch-up
    const loadedState = loadFromStorage();
    const { state: withUnlocks } = computeUnlocks(loadedState);
    const elapsedSeconds = (Date.now() - withUnlocks.lastSavedAt) / 1000;
    const offline = processOfflineProgress(withUnlocks, elapsedSeconds);
    let finalState: GameState = { ...offline.state, lastSavedAt: Date.now() };
    if (!finalState.combat.unlocked && finalState.ageIndex >= 1) {
      finalState = { ...finalState, combat: { ...finalState.combat, unlocked: true } };
    }
    this.state = finalState;
    this.loaded = true;

    if (offline.actionsProcessed > 0) {
      this.message =
        `Welcome back! ${offline.actionsProcessed} action${offline.actionsProcessed === 1 ? "" : "s"} completed while away.`;
    }

    // If a skill was actively training before the save, restart its loop
    if (this.state.activeSkill) {
      this.#startActionLoop();
      this.#startProgressLoop();
    }

    // If a combat wave was playing, restart the combat tick
    if (this.state.combat.activeWave?.status === "playing") {
      this.#startCombatLoop();
    }

    // 2. Periodic save + beforeunload
    this.#saveInterval = setInterval(() => saveToStorage(this.state), SAVE_INTERVAL_MS);
    this.#handleUnload = () => saveToStorage(this.state);
    window.addEventListener("beforeunload", this.#handleUnload);

    // 3. Return cleanup
    return () => {
      this.#clearActionLoop();
      this.#clearProgressLoop();
      this.#clearCombatLoop();

      if (this.#saveInterval) {
        clearInterval(this.#saveInterval);
        this.#saveInterval = null;
      }
      if (this.#handleUnload) {
        window.removeEventListener("beforeunload", this.#handleUnload);
        this.#handleUnload = null;
      }
      saveToStorage(this.state);
    };
  }

  // ----- Action loop (recursive setTimeout) -----

  #startActionLoop(): void {
    this.#clearActionLoop();

    const skillId = this.state.activeSkill;
    if (!skillId) return;

    const levels = getSkillLevels(this.state);
    const level = levels[skillId];
    const ageIndex = this.state.ageIndex;
    const skillState = this.state.skills[skillId];
    const skillCategory = SKILLS[skillId].category;
    const activeDefs = getActiveConsumableDefs(
      this.state.activeConsumables,
      this.state.resources,
      skillCategory,
    );
    const ce = aggregateConsumableEffects(activeDefs);
    const result = computeActionResult(
      skillId,
      level,
      skillState.upgrades,
      ageIndex,
      skillState.selectedRecipeId,
      this.state.globalUpgrades,
      ce,
    );

    if (!result) {
      // Defensive: a persisted save could reference a recipe that's no longer valid.
      if (this.state.activeSkill === skillId) {
        this.state = { ...this.state, activeSkill: null };
      }
      return;
    }

    this.#actionStart = Date.now();
    this.#actionDuration = result.time * 1000;

    this.#actionTimeout = setTimeout(() => {
      if (this.state.activeSkill !== skillId) return;

      const prev = this.state;
      const prevLevel = getSkillLevels(prev)[skillId];
      const outcome = applyAction(prev, skillId);

      this.#handleOutcome(outcome);

      let nextState = outcome.state;
      if (!prev.combat.unlocked && nextState.ageIndex >= 1) {
        nextState = { ...nextState, combat: { ...nextState.combat, unlocked: true } };
      }

      // Punchy feedback events — only for live ticks (never offline catch-up)
      if (outcome.leveledUp) {
        const newLevel = getSkillLevels(nextState)[skillId];
        this.eventQueue.emit("levelUp", { skillId, newLevel });
        this.eventQueue.emit("skillPoint", { amount: Math.max(1, newLevel - prevLevel) });
      }
      for (const unlockedSkillId of outcome.newlyUnlockedSkills) {
        this.eventQueue.emit("skillUnlock", { skillId: unlockedSkillId });
      }

      const changedResources = new Set<ResourceId>([
        ...(Object.keys(prev.resources) as ResourceId[]),
        ...(Object.keys(nextState.resources) as ResourceId[]),
      ]);
      for (const resource of changedResources) {
        const delta = (nextState.resources[resource] ?? 0) - (prev.resources[resource] ?? 0);
        if (delta > 0.0001) {
          this.eventQueue.emit("resourceGain", { resource, amount: delta });
        }
      }

      if (outcome.outOfMaterials) {
        nextState = { ...nextState, activeSkill: null };
      }

      this.state = nextState;

      // Recursively schedule next action (unless stopped by out-of-materials)
      if (!outcome.outOfMaterials) {
        this.#startActionLoop();
      } else {
        this.#clearProgressLoop();
      }
    }, result.time * 1000);
  }

  #clearActionLoop(): void {
    if (this.#actionTimeout) {
      clearTimeout(this.#actionTimeout);
      this.#actionTimeout = null;
    }
  }

  // ----- Progress bar loop (setInterval) -----

  #startProgressLoop(): void {
    this.#clearProgressLoop();
    this.#progressInterval = setInterval(() => {
      const duration = this.#actionDuration || 1;
      const elapsed = Date.now() - this.#actionStart;
      this.#progress = Math.min(1, Math.max(0, elapsed / duration));
    }, PROGRESS_INTERVAL_MS);
  }

  #clearProgressLoop(): void {
    if (this.#progressInterval) {
      clearInterval(this.#progressInterval);
      this.#progressInterval = null;
    }
    this.#progress = 0;
  }

  // ----- Combat tick loop (setInterval) -----

  #startCombatLoop(): void {
    this.#clearCombatLoop();
    this.#combatInterval = setInterval(() => {
      if (this.state.combat.activeWave?.status !== "playing") {
        this.#clearCombatLoop();
        return;
      }
      const newCombat = tickCombat(this.state.combat);
      this.state = { ...this.state, combat: newCombat };
      // Stop the loop if the wave ended
      if (newCombat.activeWave?.status !== "playing") {
        this.#clearCombatLoop();
      }
    }, 500);
  }

  #clearCombatLoop(): void {
    if (this.#combatInterval) {
      clearInterval(this.#combatInterval);
      this.#combatInterval = null;
    }
  }

  // ----- Outcome handling -----

  #handleOutcome(outcome: ApplyActionOutcome): void {
    if (outcome.newlyUnlockedSkills.length > 0) {
      const existing = new Set(this.pendingUnlocks);
      const fresh = outcome.newlyUnlockedSkills.filter((id) => !existing.has(id));
      if (fresh.length > 0) {
        this.pendingUnlocks = [...this.pendingUnlocks, ...fresh];
      }
    }
    if (outcome.outOfMaterials) {
      this.message = "Out of materials — training stopped.";
    }
  }

  // ----- Action methods -----

  startTraining(skillId: SkillId): void {
    this.state = { ...this.state, activeSkill: skillId };
    this.#startActionLoop();
    this.#startProgressLoop();
  }

  stopTraining(): void {
    this.state = { ...this.state, activeSkill: null };
    this.#clearActionLoop();
    this.#clearProgressLoop();
  }

  selectRecipe(skillId: SkillId, recipeId: string): void {
    this.state = {
      ...this.state,
      skills: {
        ...this.state.skills,
        [skillId]: { ...this.state.skills[skillId], selectedRecipeId: recipeId },
      },
    };
  }

  buyUpgrade(skillId: SkillId, upgradeId: string): void {
    const def = SKILLS[skillId];
    const upgrade = def.upgrades.find((u) => u.id === upgradeId);
    const skillState = this.state.skills[skillId];
    if (!upgrade || skillState.upgrades.includes(upgradeId) || this.state.skillPoints < upgrade.cost) {
      return;
    }
    this.state = {
      ...this.state,
      skillPoints: this.state.skillPoints - upgrade.cost,
      skills: {
        ...this.state.skills,
        [skillId]: { ...skillState, upgrades: [...skillState.upgrades, upgradeId] },
      },
    };
  }

  buyGlobalUpgrade(upgradeId: string): void {
    if (this.state.globalUpgrades.includes(upgradeId)) return;
    this.state = {
      ...this.state,
      globalUpgrades: [...this.state.globalUpgrades, upgradeId],
    };
  }

  toggleConsumable(resourceId: ResourceId): void {
    const isActive = this.state.activeConsumables.includes(resourceId);
    if (isActive) {
      this.state = {
        ...this.state,
        activeConsumables: this.state.activeConsumables.filter((id) => id !== resourceId),
      };
      return;
    }
    const def = CONSUMABLES.find((c) => c.resource === resourceId);
    if (!def || (this.state.resources[resourceId] ?? 0) < 1) return;
    const withoutGroup = this.state.activeConsumables.filter((id) => {
      const other = CONSUMABLES.find((c) => c.resource === id);
      return !other || other.group !== def.group;
    });
    this.state = {
      ...this.state,
      activeConsumables: [...withoutGroup, resourceId],
    };
  }

  dismissMessage(): void {
    this.message = null;
  }

  dismissUnlock(): void {
    this.pendingUnlocks = this.pendingUnlocks.slice(1);
  }

  placeUnitOnGrid(lane: number, col: number, unitId: UnitId): void {
    const unitDef = UNITS[unitId];
    if ((this.state.resources[unitDef.resource] ?? 0) < 1) return;
    const newCombat = placeUnit(this.state.combat, lane, col, unitId);
    if (newCombat === this.state.combat) return;
    const resources = { ...this.state.resources };
    resources[unitDef.resource] = (resources[unitDef.resource] ?? 0) - 1;
    this.state = { ...this.state, combat: newCombat, resources };
  }

  removeUnitFromGrid(lane: number, col: number): void {
    const result = removeUnit(this.state.combat, lane, col);
    if (result.state === this.state.combat) return;
    const resources = { ...this.state.resources };
    if (result.returned) {
      const unitDef = UNITS[result.returned];
      resources[unitDef.resource] = (resources[unitDef.resource] ?? 0) + 1;
    }
    this.state = { ...this.state, combat: result.state, resources };
  }

  craftBarracksUnit(unitId: string): void {
    const recipe = BARRACKS_RECIPES.find((r) => r.unitId === unitId);
    if (!recipe) return;
    const canAfford = recipe.inputs.every(
      (inp) => (this.state.resources[inp.resource] ?? 0) >= inp.amount,
    );
    if (!canAfford) return;
    const resources = { ...this.state.resources };
    for (const inp of recipe.inputs) {
      resources[inp.resource] = (resources[inp.resource] ?? 0) - inp.amount;
    }
    const outputResource = UNITS[recipe.unitId].resource;
    resources[outputResource] = (resources[outputResource] ?? 0) + 1;
    this.state = { ...this.state, resources };
  }

  sendWave(): void {
    const wave = generateWave(this.state.combat.waveNumber);
    const newCombat = startWave(this.state.combat, wave.lanes);
    this.state = { ...this.state, combat: newCombat };
    this.#startCombatLoop();
  }

  advanceAgeAction(): void {
    const prev = this.state;
    const prevLevels = getSkillLevels(prev);
    const status = getAgeAdvanceStatus(prev, prevLevels);
    if (!status.canAdvance || !status.nextAge) return;
    const nextState = advanceAge(prev, prevLevels);
    if (nextState.ageIndex === prev.ageIndex) return;
    const speedPct = Math.round((1 - status.nextAge.bonus.timeMult) * 100);
    const outputPct = Math.round((status.nextAge.bonus.outputMult - 1) * 100);
    this.state = nextState;
    this.eventQueue.emit("ageAdvance", {
      ageId: status.nextAge.id,
      ageName: status.nextAge.name,
      speedPct,
      outputPct,
    });
  }

  dismissEvent(id: string): void {
    this.eventQueue.dismiss(id);
  }

  // ----- Debug methods -----

  debugSetSkillXp(skillId: SkillId, xp: number): void {
    const skills = {
      ...this.state.skills,
      [skillId]: { ...this.state.skills[skillId], xp, unlocked: true },
    };
    this.state = { ...this.state, skills };
  }

  debugGrantResource(resourceId: ResourceId, amount: number): void {
    const resources = { ...this.state.resources };
    resources[resourceId] = (resources[resourceId] ?? 0) + amount;
    this.state = { ...this.state, resources };
  }

  debugGrantSkillPoints(amount: number): void {
    this.state = {
      ...this.state,
      skillPoints: this.state.skillPoints + amount,
    };
  }

  debugSetAge(ageIndex: number): void {
    this.state = { ...this.state, ageIndex };
  }

  debugUnlockAllSkills(): void {
    const skills = { ...this.state.skills };
    for (const id of SKILL_ORDER) {
      skills[id] = { ...skills[id], unlocked: true };
    }
    this.state = { ...this.state, skills };
  }

  debugResetSave(): void {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("civdle-save");
      window.location.reload();
    }
  }
}
