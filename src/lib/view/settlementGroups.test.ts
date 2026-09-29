import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResourceId } from "../gameData";
import { createInitialState, getSkillLevels, settlementPurchaseBlock, type GameState } from "../gameEngine";
import { CivdleGame } from "../gameState.svelte";
import {
  SETTLEMENT_UPGRADES,
  SETTLEMENT_UPGRADE_ORDER,
  type SettlementUpgradeDef,
  type SettlementUpgradeId,
} from "../settlementData";
import { settlementGroups } from "./settlementGroups";

// Enough of every resource any building asks for.
function richState(): GameState {
  const state = createInitialState();
  for (const id of SETTLEMENT_UPGRADE_ORDER) {
    for (const { resource, amount } of SETTLEMENT_UPGRADES[id].cost) {
      state.resources[resource] = Math.max(state.resources[resource] ?? 0, amount);
    }
  }
  return state;
}

function giveCost(state: GameState, id: SettlementUpgradeId, fraction = 1): void {
  for (const { resource, amount } of SETTLEMENT_UPGRADES[id].cost) {
    state.resources[resource] = amount * fraction;
  }
}

const ids = (views: { id: SettlementUpgradeId }[]) => views.map((v) => v.id);

// No shipped building uses `requires` or skill prereqs yet, so tests add them temporarily.
const saved = new Map<SettlementUpgradeId, Pick<SettlementUpgradeDef, "requires" | "prereqs">>();
function patch(id: SettlementUpgradeId, change: Partial<SettlementUpgradeDef>): void {
  const def = SETTLEMENT_UPGRADES[id];
  if (!saved.has(id)) saved.set(id, { requires: def.requires, prereqs: def.prereqs });
  Object.assign(def, change);
}
afterEach(() => {
  for (const [id, orig] of saved) {
    const def = SETTLEMENT_UPGRADES[id];
    def.prereqs = orig.prereqs;
    if (orig.requires === undefined) delete def.requires;
    else def.requires = orig.requires;
  }
  saved.clear();
  vi.restoreAllMocks();
});

describe("settlementGroups", () => {
  it("puts built buildings in built", () => {
    const state = createInitialState();
    state.settlementUpgrades = ["feastHall", "treasury"];
    const groups = settlementGroups(state, getSkillLevels(state));
    expect(ids(groups.built)).toEqual(["treasury", "feastHall"]);
    expect(groups.built.every((b) => b.built && !b.ready)).toBe(true);
    expect([...groups.ready, ...groups.gathering, ...groups.locked].some((b) => b.built)).toBe(false);
  });

  it("marks affordable buildings with met prereqs as ready", () => {
    const state = createInitialState();
    giveCost(state, "treasury");
    const groups = settlementGroups(state, getSkillLevels(state));
    const treasury = groups.ready.find((b) => b.id === "treasury");
    expect(ids(groups.ready)).toEqual(["treasury"]);
    expect(treasury).toMatchObject({ built: false, ready: true, met: 1 });
    expect(treasury?.lockedReason).toBeUndefined();
    expect(treasury?.cost).toEqual([
      { resource: "stone", have: 100, need: 100, short: false },
      { resource: "planks", have: 50, need: 50, short: false },
      { resource: "bricks", have: 30, need: 30, short: false },
    ]);
  });

  it("locks an affordable building whose required building is unbuilt", () => {
    patch("grandFeast", { requires: "feastHall" });
    const state = richState();
    const groups = settlementGroups(state, getSkillLevels(state));
    expect(ids(groups.ready)).not.toContain("grandFeast");
    const grand = groups.locked.find((b) => b.id === "grandFeast");
    expect(grand).toMatchObject({ ready: false, lockedReason: "Build Feast Hall first", met: 1 });
  });

  it("locks a building whose skill prereq is unmet", () => {
    patch("treasury", { prereqs: [{ skill: "cooking", level: 20 }] });
    const state = richState();
    const groups = settlementGroups(state, getSkillLevels(state));
    expect(groups.locked.find((b) => b.id === "treasury")?.lockedReason).toBe("Needs Cooking Lv 20");
  });

  it("sorts gathering by progress, keeping settlement order on ties", () => {
    const state = createInitialState();
    giveCost(state, "celestialAltar", 0.8);
    const { gathering } = settlementGroups(state, getSkillLevels(state));
    expect(gathering[0]).toMatchObject({ id: "celestialAltar", met: expect.closeTo(0.8, 5) });
    for (let i = 1; i < gathering.length; i++) {
      const [prev, cur] = [gathering[i - 1], gathering[i]];
      expect(prev.met).toBeGreaterThanOrEqual(cur.met);
      if (prev.met === cur.met) {
        expect(SETTLEMENT_UPGRADE_ORDER.indexOf(prev.id)).toBeLessThan(SETTLEMENT_UPGRADE_ORDER.indexOf(cur.id));
      }
    }
    expect(gathering.filter((b) => b.met === 0).length).toBeGreaterThan(1);
  });

  it("floors fractional amounts and flags shortfalls", () => {
    const state = createInitialState();
    state.resources.stone = 99.9;
    const groups = settlementGroups(state, getSkillLevels(state));
    const stone = groups.gathering.find((b) => b.id === "treasury")?.cost[0];
    expect(stone).toEqual({ resource: "stone" as ResourceId, have: 99, need: 100, short: true });
  });
});

describe("settlementPurchaseBlock", () => {
  it("reports why a purchase is blocked", () => {
    const state = createInitialState();
    state.settlementUpgrades = ["treasury"];
    const levels = getSkillLevels(state);
    expect(settlementPurchaseBlock(state, levels, "treasury")).toEqual({ kind: "built", reason: "Already built" });
    expect(settlementPurchaseBlock(state, levels, "feastHall")?.kind).toBe("short");
  });

  it("agrees with the buy action for every building", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    patch("grandFeast", { requires: "feastHall" });
    patch("royalFeast", { prereqs: [{ skill: "cooking", level: 5 }] });
    const scenarios: GameState[] = [createInitialState(), richState()];
    const partly = richState();
    partly.settlementUpgrades = ["feastHall"];
    partly.resources.bricks = 0;
    scenarios.push(partly);

    for (const scenario of scenarios) {
      for (const id of SETTLEMENT_UPGRADE_ORDER) {
        const game = new CivdleGame();
        game.state = structuredClone(scenario);
        const block = settlementPurchaseBlock(game.state, getSkillLevels(game.state), id);
        const before = game.state;
        game.buySettlementUpgradeAction(id);
        expect(game.state !== before, `${id} with block ${block?.reason}`).toBe(block === null);
      }
    }
  });
});
