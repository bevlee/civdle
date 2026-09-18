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
  generateStoryEncounter,
  generateDepthsEncounter,
  isBossLevel,
  bossStarsForLevel,
  depthsIncomePer10s,
  depthsTargetStrength,
  encounterStrength,
  BOSS_ARMY_MULT,
  BOSS_EVERY,
  DEPTHS_SCALE,
  DEPTHS_TIER_SIZE,
  DEPTHS_SPOILS_PER_TIER,
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
    expect(s.hp).toBe(Math.floor(216 * 1.4 * 1.4));
    expect(s.atk).toBe(Math.floor(29 * 1.96));
    expect(s.spd).toBe(13);
    expect(computeCardStats("devil", 5)).toEqual({ hp: 216, atk: 29, def: 21, spd: 13 });
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

describe("story bosses", () => {
  it("marks every 5th level as a boss level", () => {
    expect(BOSS_EVERY).toBe(5);
    for (let level = 1; level <= 30; level++) {
      expect(isBossLevel(level), `L${level}`).toBe(level % 5 === 0);
    }
  });

  it("boss stars go 5★, 6★ … 10★ across levels 5 to 30", () => {
    expect([5, 10, 15, 20, 25, 30].map(bossStarsForLevel)).toEqual([5, 6, 7, 8, 9, 10]);
  });

  it("boss encounters have one boss plus two minions from 4 levels lower", () => {
    const rand = lcg(11);
    for (let k = 1; k <= 6; k++) {
      const level = k * BOSS_EVERY;
      const enc = generateStoryEncounter(level, rand);
      expect(enc.bossId, `L${level}`).toBeTruthy();
      expect(enc.statMult).toBe(BOSS_ARMY_MULT);
      expect(enc.cards).toHaveLength(3);
      const boss = enc.cards.find((c) => c.id === enc.bossId)!;
      expect(boss.stars).toBe(bossStarsForLevel(level));
      expect(UNITS[boss.unitId].baseStars).toBe(5);
      expect(UNITS[boss.unitId].traits.includes("ascendant"), `L${level}`).toBe(k >= 4);
      // The archetype follows the boss so the matchup readout stays honest.
      expect(ENEMY_ARCHETYPES[enc.archetype].attackType).toBe(UNITS[boss.unitId].attackType);
      const minions = enc.cards.filter((c) => c.id !== enc.bossId);
      expect(minions).toHaveLength(2);
      // Minions are regular enemies of level - 4: their bonus stars step up by one per boss.
      const expectedBonus = Math.floor((level - 4 - 1) / 5);
      for (const m of minions) {
        expect(m.stars - UNITS[m.unitId].baseStars, `L${level} minion`).toBe(expectedBonus);
      }
    }
  });

  it("non-boss story levels are ordinary encounters", () => {
    const enc = generateStoryEncounter(7, lcg(2));
    expect(enc.bossId).toBeUndefined();
    expect(enc.cards.length).toBeLessThanOrEqual(3);
  });
});

describe("the depths", () => {
  it("normalises every army onto a smooth per-depth strength curve", () => {
    expect(DEPTHS_SCALE).toBeGreaterThan(1);
    expect(DEPTHS_SCALE).toBeLessThan(1.1);
    const rand = lcg(5);
    for (const depth of [1, 2, 7, 20, 33, 80]) {
      for (let i = 0; i < 5; i++) {
        const enc = generateDepthsEncounter(depth, rand);
        const perEnemy = encounterStrength(enc) / enc.cards.length;
        expect(perEnemy, `depth ${depth}`).toBeCloseTo(depthsTargetStrength(depth), 6);
      }
    }
    expect(depthsTargetStrength(2) / depthsTargetStrength(1)).toBeCloseTo(DEPTHS_SCALE, 10);
  });

  it("grows the roster slowly and never above 3 enemies", () => {
    const rand = lcg(6);
    expect(generateDepthsEncounter(1, rand).cards).toHaveLength(1);
    for (let d = 1; d <= 200; d += 7) {
      const enc = generateDepthsEncounter(d, rand);
      expect(enc.cards.length).toBeLessThanOrEqual(3);
      expect(ARCHETYPE_IDS).toContain(enc.archetype);
      for (const c of enc.cards) expect(c.stars).toBeLessThanOrEqual(MAX_STARS);
    }
    expect(generateDepthsEncounter(50, rand).cards).toHaveLength(3);
  });

  it("pays 10 spoils per 10s for every 5 depths cleared", () => {
    expect(DEPTHS_TIER_SIZE).toBe(5);
    expect(DEPTHS_SPOILS_PER_TIER).toBe(10);
    expect(depthsIncomePer10s(0)).toBe(0);
    expect(depthsIncomePer10s(4)).toBe(0);
    expect(depthsIncomePer10s(5)).toBe(10);
    expect(depthsIncomePer10s(9)).toBe(10);
    expect(depthsIncomePer10s(23)).toBe(40);
  });
});
