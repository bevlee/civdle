import {
  DEBUG_GLOBAL_UPGRADES,
  GLOBAL_UPGRADES,
  type ResourceId,
  SKILLS,
  SKILL_ORDER,
  type SkillId,
} from "./gameData";
import {
  type ApplyActionOutcome,
  type GameState,
  type RolledOutput,
  type GameStats,
  advanceAge,
  applyAction,
  canBuyGlobalUpgrade,
  computeActionResult,
  computeUnlocks,
  createInitialState,
  createInitialStats,
  getAgeAdvanceStatus,
  getAgeBonus,
  getSkillEligibleAgeIndex,
  getSkillLevels,
  hasMaxedSkill,
  migrateUpgradeIds,
  processOfflineProgress,
} from "./gameEngine";
import { createInitialDepthsState, createInitialGachaState, startBattle, stepBattle } from "./combatEngine";
import type { GachaState } from "./combatEngine";
import {
  DEPTHS_INCOME_INTERVAL_MS,
  GACHA_COST,
  MAX_ENEMY_LEVEL,
  PACK_COST,
  PACK_SIZE,
  MAX_STARS,
  PARTY_SIZE,
  STARTING_GOLD,
  canMerge,
  createCard,
  depthsIncomePer10s,
  generateDepthsEncounter,
  generateStoryEncounter,
  mergeCards,
  rollCard,
  type UnitCard,
  type UnitId,
} from "./combatData";
import { movePartyCard } from "./party";
import { EventQueue, type QueuedEvent } from "./eventQueue.svelte";
import { checkAchievements } from "./achievements";
import { untrack } from "svelte";

const SAVE_KEY = "civdle-save";
const SAVE_INTERVAL_MS = 5000;
const PROGRESS_INTERVAL_MS = 100;
// Pause between battle turns so each attack / ultimate can be animated.
export const ATTACK_STEP_MS = 900;
export const ULT_STEP_MS = 1800;
// Pause on the result panel before an auto-ground Depths run continues.
export const DEPTHS_AUTO_PAUSE_MS = 1500;

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

export interface SpoilsGainEventData {
  amount: number;
}

export interface ActionGainEventData {
  skillId: SkillId;
  gains: RolledOutput[];
}

export interface AchievementEventData {
  achievementId: string;
}

function loadFromStorage(): GameState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameState & { combat?: unknown };
    if (!parsed || !parsed.skills) return createInitialState();
    if (!parsed.globalUpgrades) parsed.globalUpgrades = [];
    if (!parsed.achievements || typeof parsed.achievements !== "object") parsed.achievements = {};
    parsed.stats = { ...createInitialStats(), ...(parsed.stats ?? {}) };

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
      const g = parsed.gacha as GachaState & { enemyLevel?: number; maxEnemyLevel?: number };
      const party = Array.isArray(g.party) ? g.party.slice(0, PARTY_SIZE) : [];
      while (party.length < PARTY_SIZE) party.push(null);
      g.party = party;
      if (typeof g.tutorialSeen !== "boolean") g.tutorialSeen = false;
      if (typeof g.storyLevel !== "number") {
        // Saves from the free-level-select era: continue from the highest
        // level reached and roll a fresh encounter for it.
        g.storyLevel = Math.max(1, g.maxEnemyLevel ?? g.enemyLevel ?? 1);
        g.encounter = null;
      }
      delete g.enemyLevel;
      delete g.maxEnemyLevel;
      if (g.encounter === undefined) g.encounter = null;
      if (!g.depths || typeof g.depths.level !== "number") g.depths = createInitialDepthsState();
      if (typeof g.depths.auto !== "boolean") g.depths.auto = false;
      if (g.depths.encounter === undefined) g.depths.encounter = null;
    }
    // A persisted battle can be stuck "playing" — never resume one.
    parsed.gacha.battle = null;
    parsed.gacha.battleMode = null;

    for (const id of SKILL_ORDER) {
      if (!parsed.skills[id]) {
        const def = SKILLS[id];
        parsed.skills[id] = {
          xp: 0,
          unlocked: def.prereqs.length === 0,
          upgrades: [],
          selectedRecipeId: def.recipes[0].id,
        };
      } else {
        parsed.skills[id].upgrades = migrateUpgradeIds(id, parsed.skills[id].upgrades ?? []);
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
  #autoTimeout: ReturnType<typeof setTimeout> | null = null;
  #incomeInterval: ReturnType<typeof setInterval> | null = null;
  #handleUnload: (() => void) | null = null;
  #achievementRoot: (() => void) | null = null;

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
    if (offline.actionsProcessed > finalState.stats.bestOfflineHaul) {
      finalState = {
        ...finalState,
        stats: { ...finalState.stats, bestOfflineHaul: offline.actionsProcessed },
      };
    }
    let gacha = finalState.gacha;
    if (!gacha.encounter && gacha.storyLevel <= MAX_ENEMY_LEVEL) {
      gacha = { ...gacha, encounter: generateStoryEncounter(gacha.storyLevel) };
    }
    if (!gacha.depths.encounter) {
      gacha = { ...gacha, depths: { ...gacha.depths, encounter: generateDepthsEncounter(gacha.depths.level) } };
    }
    // Passive Depths income keeps flowing while away.
    const offlineTicks = Math.floor(Math.max(0, elapsedSeconds * 1000) / DEPTHS_INCOME_INTERVAL_MS);
    const offlineSpoils = offlineTicks * depthsIncomePer10s(gacha.depths.level - 1);
    if (offlineSpoils > 0) gacha = { ...gacha, gold: gacha.gold + offlineSpoils };
    finalState = { ...finalState, gacha };
    this.state = finalState;
    this.loaded = true;

    const welcome: string[] = [];
    if (offline.actionsProcessed > 0) {
      welcome.push(`${offline.actionsProcessed} action${offline.actionsProcessed === 1 ? "" : "s"} completed`);
    }
    if (offlineSpoils > 0) welcome.push(`${offlineSpoils} War Spoils earned from The Depths`);
    if (welcome.length > 0) this.message = `Welcome back! ${welcome.join(" and ")} while away.`;

    if (this.state.activeSkill) {
      this.#startActionLoop();
      this.#startProgressLoop();
    }
    if (this.state.gacha.depths.auto) this.startDepthsFight();

    this.#incomeInterval = setInterval(() => this.#tickDepthsIncome(), DEPTHS_INCOME_INTERVAL_MS);
    this.#saveInterval = setInterval(() => saveToStorage(this.state), SAVE_INTERVAL_MS);
    this.#handleUnload = () => saveToStorage(this.state);
    window.addEventListener("beforeunload", this.#handleUnload);
    this.#startAchievementWatcher();

    return () => {
      this.#clearActionLoop();
      this.#clearProgressLoop();
      this.#clearBattleLoop();
      this.#clearAutoTimeout();
      if (this.#incomeInterval) {
        clearInterval(this.#incomeInterval);
        this.#incomeInterval = null;
      }
      if (this.#achievementRoot) {
        this.#achievementRoot();
        this.#achievementRoot = null;
      }

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

  // ----- Achievements -----

  /**
   * Re-evaluates achievements whenever any part of the state changes. The
   * check is pure and returns the same state object when nothing unlocked,
   * so the (untracked) write below only happens on a real unlock.
   */
  #startAchievementWatcher(): void {
    this.#achievementRoot = $effect.root(() => {
      $effect(() => {
        const result = checkAchievements(this.state);
        if (result.newlyUnlocked.length === 0) return;
        untrack(() => {
          this.state = result.state;
          for (const achievementId of result.newlyUnlocked) {
            this.eventQueue.emit<AchievementEventData>("achievement", { achievementId });
          }
        });
      });
    });
  }

  #bumpStats(patch: Partial<GameStats>): void {
    this.state = { ...this.state, stats: { ...this.state.stats, ...patch } };
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

      for (const gain of outcome.gains) {
        this.eventQueue.emit("resourceGain", { resource: gain.resource, amount: gain.amount });
      }
      if (outcome.gains.length > 0) {
        this.eventQueue.emit("actionGain", { skillId, gains: outcome.gains } satisfies ActionGainEventData);
      }

      if (outcome.outOfMaterials) {
        nextState = {
          ...nextState,
          activeSkill: null,
          stats: { ...nextState.stats, outOfMaterials: nextState.stats.outOfMaterials + 1 },
        };
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
      } else {
        const g = this.state.gacha;
        if (next.status === "won") {
          const stats = this.state.stats;
          this.#bumpStats({
            battlesWon: stats.battlesWon + 1,
            bestWinLevel: g.battleMode === "story" ? Math.max(stats.bestWinLevel, g.storyLevel) : stats.bestWinLevel,
          });
        } else {
          this.#bumpStats({ battlesLost: this.state.stats.battlesLost + 1 });
        }
        if (g.battleMode === "depths" && g.depths.auto) this.#scheduleAutoContinue();
      }
    }, delayMs);
  }

  #clearBattleLoop(): void {
    if (this.#battleTimeout) {
      clearTimeout(this.#battleTimeout);
      this.#battleTimeout = null;
    }
  }

  /** After an auto-ground Depths battle ends, pause on the result then fight on. */
  #scheduleAutoContinue(): void {
    this.#clearAutoTimeout();
    this.#autoTimeout = setTimeout(() => {
      this.#autoTimeout = null;
      if (!this.state.gacha.depths.auto || this.inBattle) return;
      this.dismissBattle();
      this.startDepthsFight();
    }, DEPTHS_AUTO_PAUSE_MS);
  }

  #clearAutoTimeout(): void {
    if (this.#autoTimeout) {
      clearTimeout(this.#autoTimeout);
      this.#autoTimeout = null;
    }
  }

  #tickDepthsIncome(): void {
    const amount = this.depthsIncome;
    if (amount <= 0) return;
    this.#setGacha({ gold: this.state.gacha.gold + amount });
    this.eventQueue.emit<SpoilsGainEventData>("spoilsGain", { amount });
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

  get masteryUnlocked(): boolean {
    return hasMaxedSkill(this.state);
  }

  buyGlobalUpgrade(upgradeId: string): void {
    if (!canBuyGlobalUpgrade(this.state, upgradeId)) return;
    const upgrade =
      GLOBAL_UPGRADES.find((u) => u.id === upgradeId) ?? DEBUG_GLOBAL_UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return;
    this.state = {
      ...this.state,
      skillPoints: this.state.skillPoints - upgrade.cost,
      globalUpgrades: [...this.state.globalUpgrades, upgradeId],
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

  get storyComplete(): boolean {
    return this.state.gacha.storyLevel > MAX_ENEMY_LEVEL;
  }

  get depthsCleared(): number {
    return this.state.gacha.depths.level - 1;
  }

  /** Passive War Spoils per income tick from The Depths. */
  get depthsIncome(): number {
    return depthsIncomePer10s(this.depthsCleared);
  }

  rollCard(): void {
    if (this.state.gacha.gold < GACHA_COST) return;
    const card = rollCard();
    this.#setGacha({
      gold: this.state.gacha.gold - GACHA_COST,
      cards: [...this.state.gacha.cards, card],
    });
    this.#bumpStats({
      cardsSummoned: this.state.stats.cardsSummoned + 1,
      bestSummonStars: Math.max(this.state.stats.bestSummonStars, card.stars),
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
    this.#bumpStats({
      cardsSummoned: this.state.stats.cardsSummoned + cards.length,
      packsOpened: this.state.stats.packsOpened + 1,
      bestSummonStars: cards.reduce((best, c) => Math.max(best, c.stars), this.state.stats.bestSummonStars),
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
    this.#bumpStats({ merges: this.state.stats.merges + 1 });
    this.eventQueue.emit<StarUpEventData>("starUp", {
      unitId: merged.unitId,
      fromStars: a.stars,
      toStars: merged.stars,
    });
  }

  assignCardToParty(cardId: string, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= PARTY_SIZE || this.inBattle) return;
    if (!this.state.gacha.cards.some((c) => c.id === cardId)) return;
    this.#setGacha({ party: movePartyCard(this.state.gacha.party, cardId, slotIndex) });
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
    this.#bumpStats({ cardsDiscarded: this.state.stats.cardsDiscarded + 1 });
  }

  /** Fights the current Main Story level. The story is linear: no replaying, no auto. */
  startStoryFight(): void {
    if (this.inBattle || this.state.gacha.battle || this.storyComplete) return;
    const party = this.partyCards;
    if (party.length === 0) return;
    const g = this.state.gacha;
    const encounter = g.encounter ?? generateStoryEncounter(g.storyLevel);
    this.#clearAutoTimeout();
    this.#setGacha({
      encounter,
      battle: startBattle(party, encounter),
      battleMode: "story",
      depths: { ...g.depths, auto: false },
    });
    this.#scheduleBattleStep(ATTACK_STEP_MS);
  }

  startDepthsFight(): void {
    if (this.inBattle || this.state.gacha.battle) return;
    const party = this.partyCards;
    if (party.length === 0) return;
    const g = this.state.gacha;
    const encounter = g.depths.encounter ?? generateDepthsEncounter(g.depths.level);
    this.#setGacha({
      depths: { ...g.depths, encounter },
      battle: startBattle(party, encounter),
      battleMode: "depths",
    });
    this.#scheduleBattleStep(ATTACK_STEP_MS);
  }

  setDepthsAuto(auto: boolean): void {
    const g = this.state.gacha;
    if (g.depths.auto === auto) return;
    this.#setGacha({ depths: { ...g.depths, auto } });
    if (!auto) {
      this.#clearAutoTimeout();
      return;
    }
    if (g.battle && g.battle.status !== "playing" && g.battleMode === "depths") {
      this.#scheduleAutoContinue();
    } else if (!g.battle) {
      this.startDepthsFight();
    }
  }

  /**
   * Closes the result panel. A story win pays the level in spoils and advances
   * the story; a Depths win advances the depth. A loss keeps the same encounter
   * so the player has to adapt their composition.
   */
  dismissBattle(): void {
    const battle = this.state.gacha.battle;
    if (!battle || battle.status === "playing") return;
    const g = this.state.gacha;
    const mode = g.battleMode;
    if (battle.status !== "won") {
      this.#setGacha({ battle: null, battleMode: null });
      return;
    }
    if (mode === "depths") {
      const level = g.depths.level + 1;
      this.#setGacha({
        depths: { ...g.depths, level, encounter: generateDepthsEncounter(level) },
        battle: null,
        battleMode: null,
      });
      return;
    }
    const storyLevel = g.storyLevel + 1;
    this.#setGacha({
      gold: g.gold + g.storyLevel,
      storyLevel,
      encounter: storyLevel <= MAX_ENEMY_LEVEL ? generateStoryEncounter(storyLevel) : null,
      battle: null,
      battleMode: null,
    });
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

  debugSetStoryLevel(level: number): void {
    const clamped = Math.max(1, Math.min(MAX_ENEMY_LEVEL, level));
    this.#clearBattleLoop();
    this.#setGacha({
      storyLevel: clamped,
      encounter: generateStoryEncounter(clamped),
      battle: null,
      battleMode: null,
    });
  }

  debugSetDepthsLevel(level: number): void {
    const clamped = Math.max(1, Math.floor(level));
    this.#clearBattleLoop();
    this.#clearAutoTimeout();
    this.#setGacha({
      depths: { ...this.state.gacha.depths, level: clamped, auto: false, encounter: generateDepthsEncounter(clamped) },
      battle: null,
      battleMode: null,
    });
  }

  debugGrantCard(unitId: UnitId, stars: number): void {
    const card = createCard(unitId, Math.max(1, Math.min(MAX_STARS, stars)));
    this.#setGacha({ cards: [...this.state.gacha.cards, card] });
  }

  debugRerollEncounter(): void {
    if (this.inBattle || this.storyComplete) return;
    this.#setGacha({ encounter: generateStoryEncounter(this.state.gacha.storyLevel), battle: null, battleMode: null });
  }

  debugResetSave(): void {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("civdle-save");
      window.location.reload();
    }
  }
}
