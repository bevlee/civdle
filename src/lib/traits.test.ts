import { describe, expect, it } from "vitest";
import { createCard } from "./combatData";
import { activeSynergies, computeArmyMods, neutralMods } from "./traits";

describe("synergies", () => {
  it("is neutral with no shared traits", () => {
    expect(computeArmyMods([createCard("goblin"), createCard("archer")])).toEqual(neutralMods());
  });

  it("brawler tiers at 2 and 3", () => {
    const two = computeArmyMods([createCard("orc"), createCard("ogre")]);
    expect(two.atkMult).toBeCloseTo(1.1);
    const three = computeArmyMods([createCard("orc"), createCard("ogre"), createCard("swordsman")]);
    expect(three.atkMult).toBeCloseTo(1.2);
  });

  it("ascendant tiers at 1 and 2 and speeds up ultimates", () => {
    const one = computeArmyMods([createCard("devil")]);
    expect(one.atkMult).toBeCloseTo(1.2);
    expect(one.ultEvery).toBe(3);
    const two = computeArmyMods([createCard("devil"), createCard("titan")]);
    expect(two.hpMult).toBeCloseTo(1.4);
    expect(two.ultEvery).toBe(2);
  });

  it("lists synergies active-first with next thresholds", () => {
    const list = activeSynergies([createCard("orc"), createCard("ogre"), createCard("goblin")]);
    expect(list[0]).toMatchObject({ trait: "brawler", count: 3, tier: 2, nextThreshold: null });
    const tank = list.find((s) => s.trait === "tank");
    expect(tank).toMatchObject({ count: 1, tier: 0, nextThreshold: 2 });
  });
});
