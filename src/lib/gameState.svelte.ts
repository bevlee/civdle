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
import { createInitialGachaState, startBattle, stepBattle } from "./combatEngine";
import type { GachaState } from "./combatEngine";
import {
  GACHA_COST,
  MAX_ENEMY_LEVEL,
  PACK_COST,
  PACK_SIZE,
  MAX_STARS,
  PARTY_SIZE,
  STARTING_GOLD,
  canMerge,
  createCard,
  generateEncounter,
  mergeCards,
  rollCard,
  type UnitCard,
  type UnitId,
} from "./combatData";
import { EventQueue, type QueuedEvent } from "./eventQueue.svelte";

const SAVE_KEY = "civdle-save";
const SAVE_INTERVAL_MS = 5000;
const PROGRESS_INTERVAL_MS = 100;
// Pause between battle turns so each attack / ultimate can be animated.
export const ATTACK_STEP_MS = 900;
export const ULT_STEP_MS = 1800;

export interface SummonEventData {
  card: UnitCard;
}

export interface SummonPackEventData {
  cards: UnitCard[];
}

export interface StarUpEventData {
  unitId: UnitId;
  fromStars: number;
  toStars: number;
}

function loadFromStorage(): GameState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameState & { combat?: unknown };
    if (!parsed || !parsed.skills) return createInitialState();
    if (!parsed.globalUpgrades) parsed.globalUpgrades = [];
    if (!parsed.activeConsumables) parsed.activeConsumables = [];

    const oldGacha = parsed.gacha as (Partial<GachaState> & { heroes?: unknown }) | undefined;
    if (!oldGacha || !Array.isArray(oldGacha.cards)) {
      // Saves from the lane-TD era or the warrior/monk prototype: keep any
      // gold they earned, plus the starting stash, and drop the old heroes.
      const fresh = createInitialGachaState();
      const oldCombat = parsed.combat as { loot?: Record<string, number> } | undefined;
      const carried = (oldGacha?.gold ?? 0) + (oldCombat?.loot?.["warSpoils"] ?? 0);
      fresh.gold = STARTING_GOLD + carried;
      parsed.gacha = fresh;
    } else {
      const g = parsed.gacha;
      const party = Array.isArray(g.party) ? g.party.slice(0, PARTY_SIZE) : [];
      while (party.length < PARTY_SIZE) party.push(null);
      g.party = party;
      if (typeof g.tutorialSeen !== "boolean") g.tutorialSeen = false;
      if (g.encounter === undefined) g.encounter = null;
    }
    // A persisted battle can be stuck "playing" — never resume one.
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
  #progress = $state(0);

  eventQueue = new EventQueue();
  #actionTimeout: ReturnType<typeof setTimeout> | null = null;
  #progressInterval: ReturnType<typeof setInterval> | null = null;
  #actionStart = 0;
  #actionDuration = 0;
  #saveInterval: ReturnType<typeof setInterval> | null = null;
  #battleTimeout: ReturnType<typeof setTimeout> | null = null;
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

  get partyCards(): UnitCard[] {
    return this.state.gacha.party
      .filter((id): id is string => id !== null)
      .map((id) => this.state.gacha.cards.find((c) => c.id === id))
      .filter((c): c is UnitCard => c !== undefined);
  }

  init(): () => void {
    const loadedState = loadFromStorage();
    const { state: withUnlocks } = computeUnlocks(loadedState);
    const elapsedSeconds = (Date.now() - withUnlocks.lastSavedAt) / 1000;
    const offline = processOfflineProgress(withUnlocks, elapsedSeconds);
    let finalState: GameState = { ...offline.state, lastSavedAt: Date.now() };
    if (!finalState.gacha.encounter) {
      finalState = {
        ...finalState,
        gacha: { ...finalState.gacha, encounter: generateEncounter(finalState.gacha.enemyLevel) },
      };
    }
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
      this.#clearBattleLoop();

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
    const skillCategory = SKILLS[skillId].category;
    const activeDefs = getActiveConsumableDefs(
      this.state.activeConsumables,
      this.state.resources,
      skillCategory,
    );
    const ce = aggregateConsumableEffects(activeDefs);
    const result = computeActionResult(
      skillId, level, skillState.upgrades, ageIndex,
      skillState.selectedRecipeId, this.state.globalUpgrades, ce,
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

  // ----- Battle loop: one turn per timeout so the UI can animate each turn -----

  #scheduleBattleStep(delayMs: number): void {
    this.#clearBattleLoop();
    this.#battleTimeout = setTimeout(() => {
      this.#battleTimeout = null;
      const battle = this.state.gacha.battle;
      if (!battle || battle.status !== "playing") return;
      const next = stepBattle(battle);
      this.state = { ...this.state, gacha: { ...this.state.gacha, battle: next } };
      if (next.status === "playing") {
        this.#scheduleBattleStep(next.lastAction?.kind === "ultimate" ? ULT_STEP_MS : ATTACK_STEP_MS);
      }
    }, delayMs);
  }

  #clearBattleLoop(): void {
    if (this.#battleTimeout) {
      clearTimeout(this.#battleTimeout);
      this.#battleTimeout = null;
    }
  }

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

  // ----- Gacha / army methods -----

  #setGacha(patch: Partial<GachaState>): void {
    this.state = { ...this.state, gacha: { ...this.state.gacha, ...patch } };
  }

  get inBattle(): boolean {
    return this.state.gacha.battle?.status === "playing";
  }

  rollCard(): void {
    if (this.state.gacha.gold < GACHA_COST) return;
    const card = rollCard();
    this.#setGacha({
      gold: this.state.gacha.gold - GACHA_COST,
      cards: [...this.state.gacha.cards, card],
    });
    this.eventQueue.emit<SummonEventData>("summon", { card });
  }

  rollPack(): void {
    if (this.state.gacha.gold < PACK_COST) return;
    const cards = Array.from({ length: PACK_SIZE }, () => rollCard());
    this.#setGacha({
      gold: this.state.gacha.gold - PACK_COST,
      cards: [...this.state.gacha.cards, ...cards],
    });
    this.eventQueue.emit<SummonPackEventData>("summonPack", { cards });
  }

  /** Cards that could be merged into `cardId` (same unit, same stars). */
  mergePartnersFor(cardId: string): UnitCard[] {
    const card = this.state.gacha.cards.find((c) => c.id === cardId);
    if (!card) return [];
    return this.state.gacha.cards.filter((c) => canMerge(card, c));
  }

  mergeCards(aId: string, bId: string): void {
    if (this.inBattle) return;
    const cards = this.state.gacha.cards;
    const a = cards.find((c) => c.id === aId);
    const b = cards.find((c) => c.id === bId);
    if (!a || !b || !canMerge(a, b)) return;
    const merged = mergeCards(a, b);
    // The merged card takes over whichever party slot either parent held.
    let claimed = false;
    const party = this.state.gacha.party.map((id) => {
      if (id === aId || id === bId) {
        if (claimed) return null;
        claimed = true;
        return merged.id;
      }
      return id;
    });
    this.#setGacha({
      cards: [...cards.filter((c) => c.id !== aId && c.id !== bId), merged],
      party,
    });
    this.eventQueue.emit<StarUpEventData>("starUp", {
      unitId: merged.unitId,
      fromStars: a.stars,
      toStars: merged.stars,
    });
  }

  assignCardToParty(cardId: string, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= PARTY_SIZE || this.inBattle) return;
    if (!this.state.gacha.cards.some((c) => c.id === cardId)) return;
    const party = this.state.gacha.party.map((id) => (id === cardId ? null : id));
    party[slotIndex] = cardId;
    this.#setGacha({ party });
  }

  addCardToFirstEmptySlot(cardId: string): void {
    if (this.state.gacha.party.includes(cardId)) return;
    const emptySlot = this.state.gacha.party.indexOf(null);
    if (emptySlot < 0) return;
    this.assignCardToParty(cardId, emptySlot);
  }

  removeFromParty(slotIndex: number): void {
    if (this.inBattle) return;
    const party = [...this.state.gacha.party];
    party[slotIndex] = null;
    this.#setGacha({ party });
  }

  removeCardFromParty(cardId: string): void {
    const slot = this.state.gacha.party.indexOf(cardId);
    if (slot >= 0) this.removeFromParty(slot);
  }

  discardCard(cardId: string): void {
    if (this.inBattle) return;
    this.#setGacha({
      cards: this.state.gacha.cards.filter((c) => c.id !== cardId),
      party: this.state.gacha.party.map((id) => (id === cardId ? null : id)),
    });
  }

  setEnemyLevel(level: number): void {
    if (this.inBattle) return;
    const clamped = Math.max(1, Math.min(level, this.state.gacha.maxEnemyLevel));
    if (clamped === this.state.gacha.enemyLevel && this.state.gacha.encounter) return;
    this.#setGacha({ enemyLevel: clamped, encounter: generateEncounter(clamped), battle: null });
  }

  startFight(): void {
    if (this.inBattle) return;
    const party = this.partyCards;
    if (party.length === 0) return;
    const encounter = this.state.gacha.encounter ?? generateEncounter(this.state.gacha.enemyLevel);
    const battle = startBattle(party, encounter);
    this.#setGacha({ encounter, battle });
    this.#scheduleBattleStep(ATTACK_STEP_MS);
  }

  /** Closes the result panel. A win pays out, unlocks the next level, and rolls a fresh encounter. */
  dismissBattle(): void {
    const battle = this.state.gacha.battle;
    if (!battle || battle.status === "playing") return;
    const g = this.state.gacha;
    if (battle.status === "won") {
      const maxEnemyLevel =
        g.enemyLevel >= g.maxEnemyLevel ? Math.min(MAX_ENEMY_LEVEL, g.maxEnemyLevel + 1) : g.maxEnemyLevel;
      this.#setGacha({
        gold: g.gold + g.enemyLevel,
        maxEnemyLevel,
        encounter: generateEncounter(g.enemyLevel),
        battle: null,
      });
    } else {
      // Same encounter stays so the player has to adapt their composition.
      this.#setGacha({ battle: null });
    }
  }

  markTutorialSeen(): void {
    this.#setGacha({ tutorialSeen: true });
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
    this.#setGacha({ gold: this.state.gacha.gold + amount });
  }

  debugSetEnemyLevel(level: number): void {
    const clamped = Math.max(1, Math.min(MAX_ENEMY_LEVEL, level));
    this.#setGacha({
      enemyLevel: clamped,
      maxEnemyLevel: Math.max(this.state.gacha.maxEnemyLevel, clamped),
      encounter: generateEncounter(clamped),
      battle: null,
    });
  }

  debugGrantCard(unitId: UnitId, stars: number): void {
    const card = createCard(unitId, Math.max(1, Math.min(MAX_STARS, stars)));
    this.#setGacha({ cards: [...this.state.gacha.cards, card] });
  }

  debugRerollEncounter(): void {
    if (this.inBattle) return;
    this.#setGacha({ encounter: generateEncounter(this.state.gacha.enemyLevel), battle: null });
  }

  debugResetSave(): void {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("civdle-save");
      window.location.reload();
    }
  }
}
