import { describe, expect, it } from "vitest";
import {
  applyAction,
  computeActionResult,
  createInitialState,
  rollOutputs,
} from "./gameEngine";

const always = (v: number) => () => v;

describe("computeActionResult", () => {
  it("is deterministic even with Ore Sense owned", () => {
    // ageIndex 1 = Bronze Age: copper ore unlocked, x1.1 output.
    const a = computeActionResult("mining", 1, ["oreSense"], 1, "mineStone");
    const results = Array.from({ length: 50 }, () =>
      computeActionResult("mining", 1, ["oreSense"], 1, "mineStone"),
    );
    for (const r of results) expect(r).toEqual(a);
    expect(a?.oreDoubleChance).toBe(0.25);
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

  it("doubles ore on an Ore Sense roll", () => {
    const r = computeActionResult("mining", 1, ["oreSense"], 0, "mineStone")!;
    // Stone Age: stone only. Bronze: stone + copper ore.
    const bronze = computeActionResult("mining", 1, ["oreSense"], 1, "mineStone")!;
    expect(rollOutputs(r, always(0.1))).toEqual([
      { resource: "stone", amount: 1, expected: 1, bonus: false },
    ]);
    expect(rollOutputs(bronze, always(0.1))).toEqual([
      { resource: "stone", amount: 2, expected: 1.1, bonus: true },
      { resource: "copperOre", amount: 4, expected: 1.1, bonus: true },
    ]);
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
