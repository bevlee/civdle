import { describe, expect, it } from "vitest";
import {
  ARCHETYPE_IDS,
  ENEMY_ARCHETYPES,
  MAX_STARS,
  ROLL_RATES,
  UNITS,
  UNIT_IDS,
  UNIT_SPRITES,
  canMerge,
  computeCardStats,
  createCard,
  generateEncounter,
  getTypeMultiplier,
  mergeCards,
  rollCard,
  rollRarity,
} from "./combatData";

// mulberry32: small, well-distributed seeded PRNG for tests.
function lcg(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("unit table", () => {
  it("has 48 units, each with 2 traits (3 for ascendants) and a sprite", () => {
    expect(UNIT_IDS).toHaveLength(48);
    for (const id of UNIT_IDS) {
      const def = UNITS[id];
      const expected = def.traits.includes("ascendant") ? 3 : 2;
      expect(def.traits, id).toHaveLength(expected);
      expect(UNIT_SPRITES[id], id).toMatch(/\.png/);
    }
  });

  it("ascendant is exactly the six named units", () => {
    const asc = UNIT_IDS.filter((id) => UNITS[id].traits.includes("ascendant")).sort();
    expect(asc).toEqual(["behemoth", "bone-dragon", "champion", "devil", "titan", "unicorn"]);
  });

  it("rates sum to 1", () => {
    expect(ROLL_RATES.reduce((a, r) => a + r.rate, 0)).toBeCloseTo(1, 10);
  });
});

describe("rollRarity", () => {
  it("matches the configured rates within 0.5%", () => {
    const rand = lcg(42);
    const n = 100_000;
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (let i = 0; i < n; i++) counts[rollRarity(rand)]++;
    for (const { stars, rate } of ROLL_RATES) {
      expect(Math.abs(counts[stars] / n - rate), `${stars}★`).toBeLessThan(0.005);
    }
  });

  it("rolls cards at their base rarity", () => {
    const rand = lcg(7);
    for (let i = 0; i < 500; i++) {
      const card = rollCard(rand);
      expect(card.stars).toBe(UNITS[card.unitId].baseStars);
    }
  });
});

describe("stars", () => {
  it("scales stats by 1.4 per star above base", () => {
    const s = computeCardStats("devil", 7);
    expect(s.hp).toBe(Math.floor(220 * 1.4 * 1.4));
    expect(s.atk).toBe(Math.floor(30 * 1.96));
    expect(s.spd).toBe(13);
    expect(computeCardStats("devil", 5)).toEqual({ hp: 220, atk: 30, def: 22, spd: 13 });
  });

  it("merges only identical same-star cards below 10★", () => {
    const a = createCard("devil", 5);
    const b = createCard("devil", 5);
    expect(canMerge(a, b)).toBe(true);
    expect(canMerge(a, a)).toBe(false);
    expect(canMerge(a, createCard("devil", 6))).toBe(false);
    expect(canMerge(a, createCard("titan", 5))).toBe(false);
    expect(canMerge(createCard("goblin", MAX_STARS), createCard("goblin", MAX_STARS))).toBe(false);
    const merged = mergeCards(a, b);
    expect(merged.stars).toBe(6);
    expect(merged.unitId).toBe("devil");
    expect(merged.id).not.toBe(a.id);
  });
});

describe("attack triangle", () => {
  it("melee > ranged > magic > melee", () => {
    expect(getTypeMultiplier("melee", "ranged")).toBe(1.5);
    expect(getTypeMultiplier("ranged", "magic")).toBe(1.5);
    expect(getTypeMultiplier("magic", "melee")).toBe(1.5);
    expect(getTypeMultiplier("ranged", "melee")).toBe(0.75);
    expect(getTypeMultiplier("melee", "melee")).toBe(1);
  });
});

describe("generateEncounter", () => {
  it("fields at most 3 enemies, mostly of the archetype's type", () => {
    const rand = lcg(3);
    for (let level = 1; level <= 30; level++) {
      const enc = generateEncounter(level, rand);
      expect(ARCHETYPE_IDS).toContain(enc.archetype);
      expect(enc.cards.length).toBeLessThanOrEqual(3);
      const type = ENEMY_ARCHETYPES[enc.archetype].attackType;
      const typed = enc.cards.filter((c) => UNITS[c.unitId].attackType === type).length;
      expect(typed).toBeGreaterThanOrEqual(Math.min(2, enc.cards.length));
      for (const c of enc.cards) expect(c.stars).toBeLessThanOrEqual(MAX_STARS);
    }
  });

  it("only uses 1★ units at level 1", () => {
    const enc = generateEncounter(1, lcg(9));
    for (const c of enc.cards) expect(UNITS[c.unitId].baseStars).toBe(1);
  });
});
