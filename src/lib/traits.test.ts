import { describe, expect, it } from "vitest";
import { createCard, type UnitCard } from "./combatData";
import { activeTraitsForCard, activeSynergies, computeArmyMods, countTraits, neutralMods } from "./traits";

describe("trait unlock gates", () => {
  it("only first trait active below 6★", () => {
    const card = createCard("goblin", 1);
    expect(activeTraitsForCard(card)).toEqual(["swarm"]);
  });

  it("second trait unlocks at 6★", () => {
    const card: UnitCard = { id: "t", unitId: "goblin", stars: 6 };
    expect(activeTraitsForCard(card)).toEqual(["swarm", "brawler"]);
  });

  it("third trait unlocks at 8★", () => {
    const card: UnitCard = { id: "t", unitId: "goblin", stars: 8 };
    expect(activeTraitsForCard(card)).toEqual(["swarm", "brawler", "striker"]);
  });

  it("ascendant trait is always active regardless of stars", () => {
    const card = createCard("devil", 5);
    const traits = activeTraitsForCard(card);
    expect(traits).toContain("ascendant");
    expect(traits).toContain("assassin");
    expect(traits).not.toContain("executioner");
  });

  it("ascendant unit at 8★ has all regular traits + ascendant", () => {
    const card: UnitCard = { id: "t", unitId: "devil", stars: 8 };
    const traits = activeTraitsForCard(card);
    expect(traits).toEqual(["assassin", "executioner", "striker", "ascendant"]);
  });
});

describe("10★ trait amplifier", () => {
  it("ascended units count as 2 for synergy purposes", () => {
    const ascended: UnitCard = { id: "a", unitId: "devil", stars: 10, ascended: true };
    const counts = countTraits([ascended]);
    expect(counts.get("assassin")).toBe(2);
    expect(counts.get("ascendant")).toBe(2);
  });

  it("non-ascended units count as 1", () => {
    const normal: UnitCard = { id: "a", unitId: "devil", stars: 8 };
    const counts = countTraits([normal]);
    expect(counts.get("assassin")).toBe(1);
  });
});

describe("synergies", () => {
  it("is neutral with no shared traits", () => {
    const a: UnitCard = { id: "a", unitId: "goblin", stars: 6 };
    const b: UnitCard = { id: "b", unitId: "archer", stars: 6 };
    expect(computeArmyMods([a, b])).toEqual(neutralMods());
  });

  it("brawler tiers at 2, 3, 4, 5", () => {
    const make = (uid: string, stars = 6): UnitCard => ({ id: uid, unitId: uid as any, stars });
    const orc: UnitCard = { id: "orc", unitId: "orc", stars: 6 };
    const ogre: UnitCard = { id: "ogre", unitId: "ogre", stars: 6 };
    const two = computeArmyMods([orc, ogre]);
    expect(two.atkMult).toBeCloseTo(1.1);
    const swordsman: UnitCard = { id: "sw", unitId: "swordsman", stars: 6 };
    const three = computeArmyMods([orc, ogre, swordsman]);
    expect(three.atkMult).toBeCloseTo(1.2);
  });

  it("ascendant tiers at 1 and 2 and speeds up ultimates", () => {
    const devil: UnitCard = { id: "d", unitId: "devil", stars: 5 };
    const one = computeArmyMods([devil]);
    expect(one.atkMult).toBeCloseTo(1.2);
    expect(one.ultEvery).toBe(3);
    const titan: UnitCard = { id: "t", unitId: "titan", stars: 5 };
    const two = computeArmyMods([devil, titan]);
    expect(two.hpMult).toBeCloseTo(1.4);
    expect(two.ultEvery).toBe(2);
  });

  it("lists synergies active-first with next thresholds", () => {
    const orc: UnitCard = { id: "orc", unitId: "orc", stars: 8 };
    const ogre: UnitCard = { id: "ogre", unitId: "ogre", stars: 8 };
    const goblin: UnitCard = { id: "gob", unitId: "goblin", stars: 8 };
    const list = activeSynergies([orc, ogre, goblin]);
    const brawler = list.find((s) => s.trait === "brawler")!;
    expect(brawler.count).toBe(3);
    expect(brawler.tier).toBe(2);
    expect(brawler.nextThreshold).toBe(4);
    const tank = list.find((s) => s.trait === "tank");
    expect(tank).toMatchObject({ count: 1, tier: 0, nextThreshold: 2 });
  });

  it("new T4 fields work correctly", () => {
    const n = neutralMods();
    expect(n.critMult).toBe(2);
    expect(n.firstHitCrit).toBe(false);
    expect(n.enemyAtkMult).toBe(1);
    expect(n.executeThreshold).toBe(0.5);
    expect(n.tripleHitChance).toBe(0);
  });
});
