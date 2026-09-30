import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UnitCard, UnitId } from "../combatData";
import { AGES } from "../gameData";
import { CivdleGame } from "../gameState.svelte";
import type { SettlementUpgradeId } from "../settlementData";
import { getEffectiveRollRates, BASE_RATES, GRAND_FEAST_RATES, rollRateUpgrade } from "../settlementData";
import { bestPull, oddsSource, pulledCards, summonBanners, theAge, type BannerInput } from "./summonBanners";

const ironAge: BannerInput = {
  tribute: 95,
  glory: 0,
  maxStars: 4,
  ageIndex: AGES.findIndex((a) => a.name === "Iron Age"),
  hasCelestialAltar: false,
  hasHallOfLegends: false,
};

describe("summonBanners", () => {
  it("offers the standard banner at the summon cap with a discounted ten-pull", () => {
    const [standard] = summonBanners(ironAge);
    expect(standard).toMatchObject({ id: "standard", stars: 4, locked: false, status: "10 Tribute", balance: 95 });
    expect(standard.options).toEqual([
      { count: 1, cost: 10, save: 0 },
      { count: 10, cost: 90, save: 10 },
    ]);
  });

  it("locks the legendary banners until their buildings (and the final age) are in", () => {
    const [, legendary, pack] = summonBanners(ironAge);
    expect(legendary.locked).toBe(true);
    expect(legendary.status).toBe("🔒 Locked");
    expect(legendary.requirements).toEqual([
      { label: "Build the Celestial Altar", done: false, sub: "Settlement building", settlement: true },
      { label: "Reach the Renaissance", done: false, sub: "Currently in the Iron Age", settlement: false },
    ]);
    expect(pack.locked).toBe(true);
    expect(pack.requirements).toEqual([
      { label: "Build the Hall of Legends", done: false, sub: "Settlement building", settlement: true },
      { label: "Reach the Medieval era", done: false, sub: "Currently in the Iron Age", settlement: false },
    ]);

    // The Hall alone isn't enough before 5★ summons.
    expect(summonBanners({ ...ironAge, hasHallOfLegends: true })[2].locked).toBe(true);

    // The altar alone isn't enough before the final age.
    const altarOnly = summonBanners({ ...ironAge, hasCelestialAltar: true })[1];
    expect(altarOnly.locked).toBe(true);
    expect(altarOnly.requirements[0]).toMatchObject({ done: true, sub: "Built" });
  });

  it("unlocks them with Glory and Tribute prices", () => {
    const [, legendary, pack] = summonBanners({
      ...ironAge,
      ageIndex: AGES.length - 1,
      maxStars: 5,
      hasCelestialAltar: true,
      hasHallOfLegends: true,
      glory: 40,
      tribute: 1200,
    });
    expect(legendary).toMatchObject({ locked: false, status: "10 Glory", currency: "Glory", balance: 40 });
    expect(legendary.options).toEqual([
      { count: 1, cost: 10, save: 0 },
      { count: 10, cost: 100, save: 0 },
    ]);
    expect(pack).toMatchObject({ locked: false, status: "1,000 Tribute", balance: 1200 });
    expect(pack.options).toEqual([{ count: 10, cost: 1000, save: 0 }]);
  });
});

describe("theAge", () => {
  it("reads naturally after 'in'", () => {
    expect(theAge("Iron Age")).toBe("the Iron Age");
    expect(theAge("Medieval")).toBe("the Medieval era");
    expect(theAge("Renaissance")).toBe("the Renaissance");
  });
});

describe("oddsSource", () => {
  it("names the best rate building built", () => {
    expect(oddsSource(new Set())).toBe("Base rates");
    expect(oddsSource(new Set(["treasury"]))).toBe("Base rates");
    expect(oddsSource(new Set(["feastHall", "grandFeast"]))).toBe("via Grand Feast");
    expect(rollRateUpgrade(new Set(["feastHall", "grandFeast"]))).toBe("grandFeast");
    expect(getEffectiveRollRates(new Set(["feastHall", "grandFeast"]))).toBe(GRAND_FEAST_RATES);
    expect(getEffectiveRollRates(new Set())).toBe(BASE_RATES);
  });
});

describe("pulledCards", () => {
  const card = (id: string, unitId: UnitId): UnitCard => ({ id, unitId, stars: 1 });
  const before = [card("a", "goblin")];

  it("returns the added cards, new only for units not owned before (first copy)", () => {
    const after = [...before, card("b", "goblin"), card("c", "orc"), card("d", "orc"), card("e", "cyclops")];
    const pulls = pulledCards(before, after);
    expect(pulls.map((p) => [p.card.id, p.isNew])).toEqual([
      ["b", false],
      ["c", true],
      ["d", false],
      ["e", true],
    ]);
    expect(bestPull(pulls)?.card.id).toBe("e");
  });

  it("is empty when nothing was added", () => {
    expect(pulledCards(before, before)).toEqual([]);
    expect(bestPull([])).toBeNull();
  });
});

describe("summonBanners against the game", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const finalAge = AGES.length - 1;
  const states: { ageIndex: number; built: SettlementUpgradeId[] }[] = [
    { ageIndex: 0, built: [] },
    { ageIndex: finalAge, built: [] },
    { ageIndex: finalAge - 1, built: ["celestialAltar"] },
    { ageIndex: finalAge, built: ["celestialAltar"] },
    { ageIndex: 2, built: ["hallOfLegends"] },
    { ageIndex: AGES.findIndex((a) => a.id === "medieval"), built: ["hallOfLegends"] },
    { ageIndex: finalAge, built: ["celestialAltar", "hallOfLegends"] },
  ];

  it.each(states)("locks the banners exactly when the game refuses them (age $ageIndex, built $built)", ({ ageIndex, built }) => {
    const game = new CivdleGame();
    game.state.ageIndex = ageIndex;
    game.state.settlementUpgrades = built;
    const [standard, legendary, pack] = summonBanners({
      tribute: 0,
      glory: 0,
      maxStars: game.maxSummonStars,
      ageIndex: game.state.ageIndex,
      hasCelestialAltar: game.hasCelestialAltar,
      hasHallOfLegends: game.hasHallOfLegends,
    });
    expect(standard.locked).toBe(false);
    expect(legendary.locked).toBe(!game.legendarySummonsUnlocked);
    expect(pack.locked).toBe(!game.tributeLegendaryPackUnlocked);
  });
});
