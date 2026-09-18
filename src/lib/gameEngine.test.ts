import { describe, expect, it } from "vitest";
import { GLOBAL_UPGRADES, MAX_LEVEL, SKILLS, SKILL_ORDER, XP_PER_ACTION, XP_SCALING_RATE } from "./gameData";
import {
  applyAction,
  canBuyGlobalUpgrade,
  rollOutputs,
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
  it("scales XP with level using exponential growth", () => {
    expect(XP_PER_ACTION).toBe(10);
    expect(XP_SCALING_RATE).toBe(1.10);
    const r = computeActionResult("foraging", 1, [], 0, "forage");
    expect(r?.baseXp).toBe(Math.round(10 * Math.pow(1.10, 1)));
    expect(r?.xp).toBe(r?.baseXp);
    expect(r?.xpModifiers).toEqual([]);
  });

  it("starts at base XP at level 0", () => {
    const r = computeActionResult("foraging", 0, [], 0, "forage");
    expect(r?.baseXp).toBe(10);
    expect(r?.xp).toBe(10);
  });

  it("applies a skill xpMult upgrade on top of level scaling", () => {
    const r = computeActionResult("cooking", 1, ["seasoning"], 0, "cookedFish");
    const scaledBase = Math.round(10 * Math.pow(1.10, 1));
    expect(r?.baseXp).toBe(scaledBase);
    expect(r?.xp).toBe(Math.round(scaledBase * 1.5));
    expect(r?.xpModifiers).toEqual([{ source: "Seasoning", effect: "×1.5" }]);
  });

  it("doubles XP with the Wisdom global upgrade", () => {
    const r = computeActionResult("foraging", 1, [], 0, "forage", ["wisdom"]);
    const scaledBase = Math.round(10 * Math.pow(1.10, 1));
    expect(r?.xp).toBe(Math.round(scaledBase * 2));
    expect(r?.xpModifiers).toEqual([{ source: "Wisdom", effect: "×2" }]);
  });

  it("adds the rolled XP to the skill on applyAction", () => {
    const s = createInitialState();
    const out = applyAction(s, "foraging", () => 0.99);
    expect(out.state.skills.foraging.xp).toBe(Math.round(10 * Math.pow(1.10, 0)));
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

const always = (v: number) => () => v;

describe("computeActionResult", () => {
  it("is deterministic even with Ore Sense owned", () => {
    // ageIndex 1 = Bronze Age: copper ore unlocked, x1.1 output.
    const a = computeActionResult("mining", 1, ["oreSense"], 1, "mineStone");
    const results = Array.from({ length: 50 }, () =>
      computeActionResult("mining", 1, ["oreSense"], 1, "mineStone"),
    );
    for (const r of results) expect(r).toEqual(a);
    expect(a?.doubleChance).toBe(0.3);
  });

  it("reports the expected fractional amounts", () => {
    const r = computeActionResult("woodcutting", 1, [], 1, "chopWood");
    expect(r?.outputs).toEqual([{ resource: "wood", amount: 1.1 }]);
  });
});

describe("rollOutputs", () => {
  it("rounds a fractional expectation up when the roll lands under the fraction", () => {
    const r = computeActionResult("woodcutting", 1, [], 1, "chopWood")!;
    expect(rollOutputs(r, always(0.05))).toEqual([
      { resource: "wood", amount: 2, expected: 1.1, bonus: true },
    ]);
  });

  it("rounds a fractional expectation down otherwise", () => {
    const r = computeActionResult("woodcutting", 1, [], 1, "chopWood")!;
    expect(rollOutputs(r, always(0.5))).toEqual([
      { resource: "wood", amount: 1, expected: 1.1, bonus: false },
    ]);
  });

  it("drops sub-1 outputs that roll nothing", () => {
    // Foraging: 1 food, 0.5 plant fibres, 0.3 clay (clay at level 5).
    const r = computeActionResult("foraging", 5, [], 0, "forage")!;
    expect(rollOutputs(r, always(0.9))).toEqual([
      { resource: "food", amount: 1, expected: 1, bonus: false },
    ]);
  });

  it("yields sub-1 outputs when the roll lands under the chance", () => {
    const r = computeActionResult("foraging", 5, [], 0, "forage")!;
    expect(rollOutputs(r, always(0.2))).toEqual([
      { resource: "food", amount: 1, expected: 1, bonus: false },
      { resource: "plantFibres", amount: 1, expected: 0.5, bonus: true },
      { resource: "clay", amount: 1, expected: 0.3, bonus: true },
    ]);
  });

  it("doubles all mining output on an Ore Sense roll", () => {
    const r = computeActionResult("mining", 1, ["oreSense"], 0, "mineStone")!;
    // Stone Age: stone only. Bronze: stone + copper ore.
    const bronze = computeActionResult("mining", 1, ["oreSense"], 1, "mineStone")!;
    expect(rollOutputs(r, always(0.1))).toEqual([
      { resource: "stone", amount: 2, expected: 1, bonus: true },
    ]);
    expect(rollOutputs(bronze, always(0.1))).toEqual([
      { resource: "stone", amount: 4, expected: 1.1, bonus: true },
      { resource: "copperOre", amount: 4, expected: 1.1, bonus: true },
    ]);
  });

  it("chance-rounds a byproduct that lands", () => {
    // Bronze Age scales Sinew Cordage's 1 Cordage to 1.1.
    const r = computeActionResult("hunting", 1, ["sinewCordage"], 1, "hunt")!;
    const gains = rollOutputs(r, always(0.05));
    expect(gains).toContainEqual({ resource: "cordage", amount: 2, expected: 1.1, bonus: true });
  });
});

describe("applyAction", () => {
  it("adds only whole resources and reports what was gained", () => {
    const state = { ...createInitialState(), ageIndex: 1 };
    const outcome = applyAction(state, "foraging", always(0.4));
    expect(outcome.state.resources).toEqual({ food: 1, plantFibres: 1 });
    expect(outcome.gains).toEqual([
      { resource: "food", amount: 1, expected: 1.1, bonus: false },
      { resource: "plantFibres", amount: 1, expected: 0.55, bonus: true },
    ]);
  });
});
