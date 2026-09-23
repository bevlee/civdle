import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CivdleGame, ATTACK_STEP_MS, ULT_STEP_MS, DEPTHS_AUTO_PAUSE_MS } from "./gameState.svelte";
import { createCard, GACHA_COST, PACK_SIZE } from "./combatData";
import { xpForLevel } from "./gameEngine";

let game: CivdleGame;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  game = new CivdleGame();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function equipWinner() {
  const card = createCard("titan", 10);
  game.state.gacha.cards = [card];
  game.assignCardToParty(card.id, 0);
}

function finishBattle() {
  for (let i = 0; i < 100 && game.inBattle; i++) {
    vi.advanceTimersToNextTimer();
  }
  expect(game.state.gacha.battle?.status).toBe("won");
}

describe("story Tribute rewards", () => {
  it.each([
    { gold: 1000, expected: 1003 },
    { gold: 200, expected: 203 },
    { gold: 50, expected: 53 },
  ])("awards storyLevel Tribute with no cap ($gold → $expected)", ({ gold, expected }) => {
    game.state.gacha.gold = gold;
    game.state.gacha.storyLevel = 3;
    equipWinner();
    game.startStoryFight();
    finishBattle();
    vi.advanceTimersByTime(10000);
    expect(game.state.gacha.battle?.status).toBe("won");
    expect(game.state.gacha.storyLevel).toBe(3);
    game.dismissBattle();
    game.dismissBattle();
    expect(game.state.gacha.gold).toBe(expected);
    expect(game.state.gacha.storyLevel).toBe(4);
  });
});

describe("Depths Auto", () => {
  it.each(["story", "depths"] as const)("keeps deployed units in their chosen positions in %s battles", (mode) => {
    const tank = createCard("dendroid");
    const mage = createCard("mage");
    game.state.gacha.cards = [tank, mage];
    game.assignCardToParty(tank.id, 3);
    game.assignCardToParty(mage.id, 4);
    if (mode === "story") game.startStoryFight();
    else game.startDepthsFight();
    expect(game.state.gacha.battle?.fighters.filter(f => !f.isEnemy).map(f => ({ id: f.id, position: f.position }))).toEqual([
      { id: tank.id, position: 4 },
      { id: mage.id, position: 5 },
    ]);
    game.assignCardToParty(mage.id, 0);
    expect(game.state.gacha.party[4]).toBe(mage.id);
    expect(game.state.gacha.party[0]).toBeNull();
  });

  it("holds a completed battle after Auto is disabled until Continue", () => {
    equipWinner();
    game.setDepthsAuto(true);
    finishBattle();
    game.setDepthsAuto(false);
    vi.advanceTimersByTime(10000);
    expect(game.state.gacha.battle?.status).toBe("won");
    game.dismissBattle();
    expect(game.state.gacha.battle).toBeNull();
    expect(game.state.gacha.depths.level).toBe(2);
    game.startStoryFight();
    expect(game.state.gacha.battleMode).toBe("story");
  });

  it("holds the result when Auto is disabled mid-battle", () => {
    equipWinner();
    game.setDepthsAuto(true);
    game.setDepthsAuto(false);
    finishBattle();
    vi.advanceTimersByTime(10000);
    expect(game.state.gacha.battle?.status).toBe("won");
    game.dismissBattle();
    expect(game.state.gacha.battle).toBeNull();
    expect(game.state.gacha.depths.level).toBe(2);
  });

  it("continues to the next depth when Auto remains enabled", () => {
    equipWinner();
    game.setDepthsAuto(true);
    finishBattle();
    vi.advanceTimersByTime(DEPTHS_AUTO_PAUSE_MS + (game.state.gacha.battle?.lastAction?.kind === "ultimate" ? ULT_STEP_MS : ATTACK_STEP_MS));
    expect(game.state.gacha.depths.level).toBe(2);
    expect(game.inBattle).toBe(true);
  });
});

it("emits one managed gain toast per training action without orphaned resource events", () => {
  game.startTraining("foraging");
  for (let i = 0; i < 100; i++) {
    while (!game.events.some((event) => event.type === "actionGain")) vi.advanceTimersToNextTimer();
    for (const event of game.events.filter((event) => ["actionGain", "levelUp", "skillPoint", "skillUnlock"].includes(event.type))) {
      game.dismissEvent(event.id);
    }
    expect(game.events).toHaveLength(0);
  }
  game.stopTraining();
  expect(game.state.stats.actions).toBe(100);
});

it("buys a full pack for the price of the same number of single summons", () => {
  game.state.gacha.gold = GACHA_COST * PACK_SIZE;
  game.rollPack();
  expect(game.state.gacha.cards).toHaveLength(PACK_SIZE);
  expect(game.state.gacha.gold).toBe(0);
  expect(game.state.stats.cardsSummoned).toBe(PACK_SIZE);
  expect(game.state.stats.packsOpened).toBe(1);
});

describe("save lifecycle", () => {
  function installWindow() {
    const storage = new Map<string, string>();
    const events = new EventTarget();
    const reload = vi.fn(() => events.dispatchEvent(new Event("beforeunload")));
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      location: { reload },
    });
    return { storage, events, reload };
  }

  it("keeps Reset Save empty through unload, autosave, and component cleanup", () => {
    const { storage, reload } = installWindow();
    cleanup = game.init();
    game.state.gacha.gold = 123;
    vi.advanceTimersByTime(5000);
    expect(storage.has("civdle-save")).toBe(true);
    game.debugResetSave();
    expect(reload).toHaveBeenCalledOnce();
    expect(storage.has("civdle-save")).toBe(false);
    vi.advanceTimersByTime(5000 + ATTACK_STEP_MS);
    expect(storage.has("civdle-save")).toBe(false);
    cleanup();
    cleanup = undefined;
    expect(storage.has("civdle-save")).toBe(false);
  });

  it("still saves normally on unload and cleanup", () => {
    const { storage, events } = installWindow();
    cleanup = game.init();
    game.state.gacha.gold = 123;
    events.dispatchEvent(new Event("beforeunload"));
    expect(JSON.parse(storage.get("civdle-save")!).gacha.gold).toBe(123);
    game.state.gacha.gold = 456;
    cleanup();
    cleanup = undefined;
    expect(JSON.parse(storage.get("civdle-save")!).gacha.gold).toBe(456);
  });
});

describe("battle playback controls", () => {
  it.each(["story", "depths"] as const)("pauses %s combat and resumes without skipping a turn", mode => {
    equipWinner();
    if (mode === "story") game.startStoryFight();
    else game.startDepthsFight();
    vi.advanceTimersByTime(300);
    game.setBattlePaused(true);
    vi.advanceTimersByTime(10000);
    expect(game.state.gacha.battle?.turn).toBe(0);
    game.setBattleSpeed(2);
    game.setBattlePaused(false);
    vi.advanceTimersByTime(299);
    expect(game.state.gacha.battle?.turn).toBe(0);
    vi.advanceTimersByTime(1);
    expect(game.state.gacha.battle?.turn).toBe(1);
  });

  it("holds a completed auto battle while paused and resumes its result timer", () => {
    equipWinner();
    game.setDepthsAuto(true);
    finishBattle();
    const level = game.state.gacha.depths.level;
    game.setBattlePaused(true);
    vi.advanceTimersByTime(10000);
    expect(game.state.gacha.depths.level).toBe(level);
    expect(game.state.gacha.battle?.status).toBe("won");
    game.setBattleSpeed(0.5);
    game.setBattlePaused(false);
    vi.advanceTimersByTime((DEPTHS_AUTO_PAUSE_MS + (game.state.gacha.battle?.lastAction?.kind === "ultimate" ? ULT_STEP_MS : ATTACK_STEP_MS)) * 2);
    expect(game.state.gacha.depths.level).toBe(level + 1);
    expect(game.state.gacha.battle?.turn).toBe(0);
  });
});
