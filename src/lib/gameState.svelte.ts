import { type ResourceId, SKILLS, SKILL_ORDER, type SkillId } from "./gameData";
import {
  type ApplyActionOutcome,
  type GameState,
  advanceAge,
  applyAction,
  computeActionResult,
  computeUnlocks,
  createInitialState,
  getAgeAdvanceStatus,
  getAgeBonus,
  getSkillEligibleAgeIndex,
  getSkillLevels,
  processOfflineProgress,
} from "./gameEngine";
import {
  createInitialGachaState,
  startBattle,
  tickBattle,
} from "./combatEngine";
import type { GachaState } from "./combatEngine";
import {
  rollGacha,
  generateEnemyParty,
  GACHA_COST,
  MAX_ENEMY_LEVEL,
  type Hero,
} from "./combatData";
import { EventQueue, type QueuedEvent } from "./eventQueue.svelte";

const SAVE_KEY = "civdle-save";
const SAVE_INTERVAL_MS = 5000;
const PROGRESS_INTERVAL_MS = 100;

function loadFromStorage(): GameState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameState & { combat?: unknown };
    if (!parsed || !parsed.skills) return createInitialState();
    if (!parsed.globalUpgrades) parsed.globalUpgrades = [];

    if (!parsed.gacha) {
      const fresh = createInitialGachaState();
      const oldCombat = parsed.combat as { loot?: Record<string, number> } | undefined;
      if (oldCombat?.loot?.["warSpoils"]) {
        fresh.gold = oldCombat.loot["warSpoils"];
      }
      parsed.gacha = fresh;
    }
    if (!parsed.gacha.heroes || parsed.gacha.heroes.length === 0) {
      parsed.gacha = createInitialGachaState();
    }
    // A persisted battle can be stuck "playing" (e.g. saved by an older build),
    // which would disable every combat button forever.
    parsed.gacha.battle = null;

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
    // localStorage unavailable — silently skip saving.
  }
}

export class CivdleGame {
  state = $state<GameState>(createInitialState());
  loaded = $state(false);
  message = $state<string | null>(null);
  pendingUnlocks = $state<SkillId[]>([]);
  lastRolledHero = $state<Hero | null>(null);
  #progress = $state(0);

  eventQueue = new EventQueue();
  #actionTimeout: ReturnType<typeof setTimeout> | null = null;
  #progressInterval: ReturnType<typeof setInterval> | null = null;
  #actionStart = 0;
  #actionDuration = 0;
  #saveInterval: ReturnType<typeof setInterval> | null = null;
  #combatInterval: ReturnType<typeof setInterval> | null = null;
  #handleUnload: (() => void) | null = null;

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

  init(): () => void {
    const loadedState = loadFromStorage();
    const { state: withUnlocks } = computeUnlocks(loadedState);
    const elapsedSeconds = (Date.now() - withUnlocks.lastSavedAt) / 1000;
    const offline = processOfflineProgress(withUnlocks, elapsedSeconds);
    const finalState: GameState = { ...offline.state, lastSavedAt: Date.now() };
    this.state = finalState;
    this.loaded = true;

    if (offline.actionsProcessed > 0) {
      this.message =
        `Welcome back! ${offline.actionsProcessed} action${offline.actionsProcessed === 1 ? "" : "s"} completed while away.`;
    }

    if (this.state.activeSkill) {
      this.#startActionLoop();
      this.#startProgressLoop();
    }

    this.#saveInterval = setInterval(() => saveToStorage(this.state), SAVE_INTERVAL_MS);
    this.#handleUnload = () => saveToStorage(this.state);
    window.addEventListener("beforeunload", this.#handleUnload);

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

  // ----- Action loop -----

  #startActionLoop(): void {
    this.#clearActionLoop();
    const skillId = this.state.activeSkill;
    if (!skillId) return;

    const levels = getSkillLevels(this.state);
    const level = levels[skillId];
    const ageIndex = this.state.ageIndex;
    const skillState = this.state.skills[skillId];
    const result = computeActionResult(
      skillId, level, skillState.upgrades, ageIndex,
      skillState.selectedRecipeId, this.state.globalUpgrades,
    );

    if (!result) {
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

  // ----- Combat loop -----

  #startCombatLoop(): void {
    this.#clearCombatLoop();
    this.#combatInterval = setInterval(() => {
      const battle = this.state.gacha.battle;
      if (!battle || battle.status !== "playing") {
        this.#clearCombatLoop();
        return;
      }
      const newBattle = tickBattle(battle);
      let gacha = { ...this.state.gacha, battle: newBattle };

      if (newBattle.status === "won") {
        gacha.gold += gacha.enemyLevel;
        if (gacha.enemyLevel >= gacha.maxEnemyLevel && gacha.maxEnemyLevel < MAX_ENEMY_LEVEL) {
          gacha.maxEnemyLevel = Math.min(MAX_ENEMY_LEVEL, gacha.maxEnemyLevel + 1);
        }
      }

      this.state = { ...this.state, gacha };

      if (newBattle.status !== "playing") {
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

  // ----- Training methods -----

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

  dismissMessage(): void {
    this.message = null;
  }

  dismissUnlock(): void {
    this.pendingUnlocks = this.pendingUnlocks.slice(1);
  }

  // ----- Gacha / Combat methods -----

  rollGachaHero(): void {
    if (this.state.gacha.gold < GACHA_COST) return;
    const hero = rollGacha();
    this.lastRolledHero = hero;
    this.state = {
      ...this.state,
      gacha: {
        ...this.state.gacha,
        gold: this.state.gacha.gold - GACHA_COST,
        heroes: [...this.state.gacha.heroes, hero],
      },
    };
  }

  assignHeroToParty(heroId: string, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= 3) return;
    if (this.state.gacha.battle?.status === "playing") return;
    const hero = this.state.gacha.heroes.find((h) => h.id === heroId);
    if (!hero) return;
    const party = [...this.state.gacha.party];
    const existingSlot = party.indexOf(heroId);
    if (existingSlot >= 0) return;
    party[slotIndex] = heroId;
    this.state = { ...this.state, gacha: { ...this.state.gacha, party } };
  }

  removeHeroFromParty(slotIndex: number): void {
    if (this.state.gacha.battle?.status === "playing") return;
    const party = [...this.state.gacha.party];
    party[slotIndex] = null;
    this.state = { ...this.state, gacha: { ...this.state.gacha, party } };
  }

  addHeroToFirstEmptySlot(heroId: string): void {
    const emptySlot = this.state.gacha.party.indexOf(null);
    if (emptySlot < 0) return;
    this.assignHeroToParty(heroId, emptySlot);
  }

  setEnemyLevel(level: number): void {
    const clamped = Math.max(1, Math.min(level, this.state.gacha.maxEnemyLevel));
    this.state = { ...this.state, gacha: { ...this.state.gacha, enemyLevel: clamped } };
  }

  startFight(): void {
    if (this.state.gacha.battle?.status === "playing") return;
    const partyHeroes = this.state.gacha.party
      .filter((id): id is string => id !== null)
      .map((id) => this.state.gacha.heroes.find((h) => h.id === id))
      .filter((h): h is Hero => h !== undefined);
    if (partyHeroes.length === 0) return;

    const enemies = generateEnemyParty(this.state.gacha.enemyLevel);
    const battle = startBattle(partyHeroes, enemies);
    this.state = { ...this.state, gacha: { ...this.state.gacha, battle } };
    this.#startCombatLoop();
  }

  dismissBattle(): void {
    this.state = { ...this.state, gacha: { ...this.state.gacha, battle: null } };
  }

  dismissLastRolledHero(): void {
    this.lastRolledHero = null;
  }

  discardHero(heroId: string): void {
    if (this.state.gacha.battle?.status === "playing") return;
    const party = this.state.gacha.party.map((id) => (id === heroId ? null : id));
    const heroes = this.state.gacha.heroes.filter((h) => h.id !== heroId);
    this.state = { ...this.state, gacha: { ...this.state.gacha, heroes, party } };
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

  debugGrantGold(amount: number): void {
    this.state = {
      ...this.state,
      gacha: { ...this.state.gacha, gold: this.state.gacha.gold + amount },
    };
  }

  debugSetEnemyLevel(level: number): void {
    this.state = {
      ...this.state,
      gacha: {
        ...this.state.gacha,
        enemyLevel: level,
        maxEnemyLevel: Math.max(this.state.gacha.maxEnemyLevel, level),
      },
    };
  }

  debugResetSave(): void {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("civdle-save");
      window.location.reload();
    }
  }
}
