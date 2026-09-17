import { describe, expect, it } from "vitest";
import { GLOBAL_UPGRADES, MAX_LEVEL, SKILLS, SKILL_ORDER, XP_PER_ACTION } from "./gameData";
import {
  applyAction,
  canBuyGlobalUpgrade,
  computeActionResult,
  createInitialState,
  hasMaxedSkill,
  migrateUpgradeIds,
  xpForLevel,
  type GameState,
} from "./gameEngine";

function stateWith(patch: (s: GameState) => void): GameState {
  const s = createInitialState();
  patch(s);
  return s;
}

describe("XP per action", () => {
  it("awards 50 base XP so level 99 takes a tenth of the actions it used to", () => {
    expect(XP_PER_ACTION).toBe(50);
    const r = computeActionResult("foraging", 1, [], 0, "forage");
    expect(r?.baseXp).toBe(50);
    expect(r?.xp).toBe(50);
    expect(r?.xpModifiers).toEqual([]);
  });

  it("applies a skill xpMult upgrade and reports it as a modifier", () => {
    const r = computeActionResult("cooking", 1, ["seasoning"], 0, "cookedFish");
    expect(r?.xp).toBe(75);
    expect(r?.xpModifiers).toEqual([{ source: "Seasoning", effect: "×1.5" }]);
  });

  it("doubles XP with the Wisdom global upgrade", () => {
    const r = computeActionResult("foraging", 1, [], 0, "forage", ["wisdom"]);
    expect(r?.xp).toBe(100);
    expect(r?.xpModifiers).toEqual([{ source: "Wisdom", effect: "×2" }]);
  });

  it("adds the rolled XP to the skill on applyAction", () => {
    const s = createInitialState();
    const out = applyAction(s, "foraging", () => 0.99);
    expect(out.state.skills.foraging.xp).toBe(50);
  });
});

describe("action time", () => {
  it("starts from the 2s base with no modifiers", () => {
    const r = computeActionResult("foraging", 1, [], 0, "forage");
    expect(r?.baseTime).toBe(2);
    expect(r?.time).toBe(2);
    expect(r?.timeModifiers).toEqual([]);
  });

  it("lists flat upgrade reductions, the age bonus, and Haste in order", () => {
    const r = computeActionResult("foraging", 1, ["quickHands"], 2, "forage", ["haste"]);
    expect(r?.timeModifiers).toEqual([
      { source: "Quick Hands", effect: "-0.2s" },
      { source: "Iron Age", effect: "×0.8" },
      { source: "Haste", effect: "×0.5" },
    ]);
    expect(r?.time).toBeCloseTo((2 - 0.2) * 0.8 * 0.5, 5);
  });

  it("applies the debug Hyperdrive after every other buff", () => {
    const r = computeActionResult("foraging", 1, ["quickHands"], 4, "forage", ["haste", "debugSpeed"]);
    expect(r?.time).toBeCloseTo((2 - 0.2) * 0.55 * 0.5 * 0.01, 5);
  });
});

describe("outputs", () => {
  it("is deterministic even when a double-chance upgrade is owned", () => {
    const a = computeActionResult("mining", 1, ["oreSense"], 1, "mineStone");
    const b = computeActionResult("mining", 1, ["oreSense"], 1, "mineStone");
    expect(a).toEqual(b);
    expect(a?.doubleChance).toBeGreaterThan(0);
  });

  it("doubles every output with Bounty", () => {
    const r = computeActionResult("fishing", 1, [], 0, "fish", ["bounty"]);
    expect(r?.outputs).toEqual([{ resource: "rawFish", amount: 2 }]);
  });

  it("lowers a conditional output's level with an outputLevel effect", () => {
    const without = computeActionResult("woodcutting", 5, [], 0, "chopWood");
    const withUpgrade = computeActionResult("woodcutting", 5, ["timberExpert"], 0, "chopWood");
    expect(without?.outputs.map((o) => o.resource)).toEqual(["wood"]);
    expect(withUpgrade?.outputs.map((o) => o.resource)).toContain("logs");
  });

  it("adds a flat primary-output bonus to crafting recipes", () => {
    const r = computeActionResult("cooking", 1, ["bigPot"], 0, "cookedFish");
    expect(r?.outputs).toEqual([{ resource: "cookedFish", amount: 2 }]);
  });

  it("reports chanced byproducts separately from guaranteed outputs", () => {
    const r = computeActionResult("hunting", 1, ["sinewCordage"], 0, "hunt");
    expect(r?.outputs.map((o) => o.resource)).toEqual(["rawHides", "food"]);
    expect(r?.chancedOutputs).toEqual([{ resource: "cordage", amount: 1, chance: 0.5 }]);
  });
});

describe("applyAction dice", () => {
  const crafting = () =>
    stateWith((s) => {
      s.resources = { wood: 10, stone: 10 };
      s.skills.crafting.unlocked = true;
      s.skills.crafting.upgrades = ["scrapSalvage"];
    });

  it("keeps inputs when the refund roll succeeds", () => {
    const out = applyAction(crafting(), "crafting", () => 0);
    expect(out.state.resources.wood).toBe(10);
    expect(out.state.resources.tools).toBe(1);
  });

  it("consumes inputs when the refund roll fails", () => {
    const out = applyAction(crafting(), "crafting", () => 0.99);
    expect(out.state.resources.wood).toBe(9);
    expect(out.state.resources.stone).toBe(9);
  });

  it("doubles outputs when the double roll succeeds", () => {
    const s = stateWith((st) => {
      st.skills.foraging.upgrades = ["bountifulHarvest"];
    });
    const lucky = applyAction(s, "foraging", () => 0);
    const unlucky = applyAction(s, "foraging", () => 0.99);
    expect(lucky.state.resources.food).toBe(2 * (unlucky.state.resources.food ?? 0));
  });

  it("grants a chanced byproduct only when its roll succeeds", () => {
    const s = stateWith((st) => {
      st.skills.hunting.unlocked = true;
      st.skills.hunting.upgrades = ["sinewCordage"];
    });
    expect(applyAction(s, "hunting", () => 0).state.resources.cordage).toBe(1);
    expect(applyAction(s, "hunting", () => 0.99).state.resources.cordage).toBeUndefined();
  });

  it("still requires the inputs to be present even with a refund chance", () => {
    const s = crafting();
    s.resources = {};
    const out = applyAction(s, "crafting", () => 0);
    expect(out.outOfMaterials).toBe(true);
  });
});

describe("mastery (global) upgrades", () => {
  it("unlock only once a skill reaches the max level", () => {
    const s = createInitialState();
    expect(hasMaxedSkill(s)).toBe(false);
    s.skills.foraging.xp = xpForLevel(MAX_LEVEL);
    expect(hasMaxedSkill(s)).toBe(true);
  });

  it("can be bought only when unlocked, affordable, and not owned", () => {
    const haste = GLOBAL_UPGRADES.find((u) => u.id === "haste")!;
    const s = createInitialState();
    s.skillPoints = haste.cost;
    expect(canBuyGlobalUpgrade(s, "haste")).toBe(false);
    s.skills.foraging.xp = xpForLevel(MAX_LEVEL);
    expect(canBuyGlobalUpgrade(s, "haste")).toBe(true);
    s.skillPoints = haste.cost - 1;
    expect(canBuyGlobalUpgrade(s, "haste")).toBe(false);
    s.skillPoints = haste.cost;
    s.globalUpgrades = ["haste"];
    expect(canBuyGlobalUpgrade(s, "haste")).toBe(false);
  });

  it("treats the debug Hyperdrive as always purchasable", () => {
    expect(canBuyGlobalUpgrade(createInitialState(), "debugSpeed")).toBe(true);
  });
});

describe("upgrade data", () => {
  it("gives every skill three upgrades with at least one effect each", () => {
    for (const id of SKILL_ORDER) {
      const ups = SKILLS[id].upgrades;
      expect(ups, id).toHaveLength(3);
      for (const u of ups) expect(u.effects.length, `${id}/${u.id}`).toBeGreaterThan(0);
    }
  });

  it("migrates legacy shared crafting ids by slot and drops unknown ids", () => {
    const smithing = SKILLS.smithing.upgrades.map((u) => u.id);
    expect(migrateUpgradeIds("smithing", ["efficiency", "betterRecipes", "bogus"])).toEqual([
      smithing[0],
      smithing[1],
    ]);
    expect(migrateUpgradeIds("foraging", ["keenEye", "keenEye"])).toEqual(["keenEye"]);
  });
});
