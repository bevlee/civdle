import { describe, expect, it } from "vitest";
import {
  BOSS_EVERY,
  BOSS_ARMY_MULT,
  DEPTHS_SCALE,
  DEPTHS_STARSTONE_INTERVAL,
  DEPTHS_TIER_SIZE,
  DEPTHS_SPOILS_PER_TIER,
  FACTIONS,
  MAX_STARS,
  ROLL_RATES,
  STORY_REGIONS,
  UNITS,
  UNIT_IDS,
  UNIT_SPRITES,
  bossStarsForLevel,
  PROMOTION_COSTS,
  canPromote,
  computeCardStats,
  createCard,
  depthsEnemyCount,
  depthsIncomePerMinute,
  depthsTargetStrength,
  encounterStrength,
  enemyCountForLevel,
  generateDepthsEncounter,
  generateEncounter,
  generateStoryEncounter,
  getTypeMultiplier,
  getPromotionCost,
  isBossLevel,
  promoteCard,
  regionForLevel,
  rollCard,
  rollRarity,
  recruitCard,
  storyTribute,
  strongestEnemy,
  unitStrength,
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
  it("has 48 units, each with 3 traits (4 for ascendants) and a sprite", () => {
    expect(UNIT_IDS).toHaveLength(48);
    for (const id of UNIT_IDS) {
      const def = UNITS[id];
      const expected = def.traits.includes("ascendant") ? 4 : 3;
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
    expect(s.hp).toBe(Math.floor(215 * 1.4 * 1.4));
    expect(s.atk).toBe(Math.floor(30 * 1.96));
    expect(s.spd).toBe(13);
    expect(computeCardStats("devil", 5)).toEqual({ hp: 215, atk: 30, def: 22, spd: 13 });
  });

  it("ascended bonus applies 1.2x to HP/ATK/DEF", () => {
    const normal = computeCardStats("devil", 10);
    const ascended = computeCardStats("devil", 10, true);
    expect(ascended.hp).toBe(Math.floor(normal.hp * 1.2));
    expect(ascended.atk).toBe(Math.floor(normal.atk * 1.2));
    expect(ascended.def).toBe(Math.floor(normal.def * 1.2));
    expect(ascended.spd).toBe(normal.spd);
  });
});

describe("promotion", () => {
  it("defines costs for stars 2-10", () => {
    for (let s = 2; s <= 10; s++) {
      expect(getPromotionCost(s)).toBeTruthy();
    }
    expect(getPromotionCost(1)).toBeNull();
    expect(getPromotionCost(11)).toBeNull();
  });

  it("requires increasing copies for higher stars", () => {
    expect(PROMOTION_COSTS[6].copies).toBe(1);
    expect(PROMOTION_COSTS[7].copies).toBe(2);
    expect(PROMOTION_COSTS[8].copies).toBe(3);
    expect(PROMOTION_COSTS[9].copies).toBe(4);
    expect(PROMOTION_COSTS[10].copies).toBe(5);
  });

  it("canPromote checks copies and resources", () => {
    // 1★→2★ needs only 1 copy, no resources
    const card1 = createCard("goblin", 1);
    const copy1 = createCard("goblin", 1);
    expect(canPromote(card1, [card1], {})).toBe(false);
    expect(canPromote(card1, [card1, copy1], {})).toBe(true);
    // 5★→6★ requires 1 copy + preparedMeal
    const card5 = createCard("devil", 5);
    const copy5 = createCard("devil", 1);
    expect(canPromote(card5, [card5, copy5], {})).toBe(false);
    expect(canPromote(card5, [card5, copy5], { preparedMeal: 5 })).toBe(true);
    const promoted5 = promoteCard(card5);
    expect(promoted5.stars).toBe(6);
    // 10★ requires starstone + many resources
    const card9 = { ...card5, stars: 9 };
    const copies9 = Array.from({ length: 5 }, () => createCard("devil", 1));
    expect(canPromote(card9, [card9, ...copies9], {})).toBe(false);
    expect(canPromote(card9, [card9, ...copies9], {
      preparedMeal: 10, cloth: 10, steelTools: 5, enchantedGear: 3, starstone: 1,
    })).toBe(true);
  });

  it("promoteCard keeps id, increments stars, sets ascended at 10", () => {
    const card = createCard("goblin", 5);
    const p = promoteCard(card);
    expect(p.id).toBe(card.id);
    expect(p.stars).toBe(6);
    expect(p.ascended).toBeUndefined();
    const card9 = { ...card, stars: 9 };
    const p10 = promoteCard(card9);
    expect(p10.stars).toBe(10);
    expect(p10.ascended).toBe(true);
  });

  it("max star cards cannot be promoted", () => {
    const card = createCard("devil", MAX_STARS);
    expect(canPromote(card, [card, createCard("devil")], {})).toBe(false);
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

describe("story regions", () => {
  it("has 6 regions covering 30 levels", () => {
    expect(STORY_REGIONS).toHaveLength(6);
    for (const region of STORY_REGIONS) {
      expect(FACTIONS[region.faction]).toBeDefined();
    }
  });

  it("maps levels to regions in groups of 5", () => {
    expect(regionForLevel(1).faction).toBe("ranger");
    expect(regionForLevel(5).faction).toBe("ranger");
    expect(regionForLevel(6).faction).toBe("barbarian");
    expect(regionForLevel(10).faction).toBe("barbarian");
    expect(regionForLevel(11).faction).toBe("demon");
    expect(regionForLevel(15).faction).toBe("demon");
    expect(regionForLevel(16).faction).toBe("necromancer");
    expect(regionForLevel(20).faction).toBe("necromancer");
    expect(regionForLevel(21).faction).toBe("wizard");
    expect(regionForLevel(25).faction).toBe("wizard");
    expect(regionForLevel(26).faction).toBe("knight");
    expect(regionForLevel(30).faction).toBe("knight");
  });

  it("each faction has at least one unit per rarity tier needed", () => {
    for (const region of STORY_REGIONS) {
      const factionUnits = UNIT_IDS.filter((id) => UNITS[id].faction === region.faction);
      expect(factionUnits.length).toBeGreaterThanOrEqual(6);
      expect(factionUnits.some((id) => UNITS[id].baseStars === 1)).toBe(true);
    }
  });

  it("each faction has exactly one ascendant for boss fights", () => {
    for (const region of STORY_REGIONS) {
      const ascendants = UNIT_IDS.filter(
        (id) => UNITS[id].faction === region.faction && UNITS[id].traits.includes("ascendant"),
      );
      expect(ascendants, region.faction).toHaveLength(1);
    }
  });
});

describe("generateEncounter", () => {
  it("fields enemies from the region's faction", () => {
    const rand = lcg(3);
    for (let level = 1; level <= 30; level++) {
      const enc = generateEncounter(level, rand);
      const region = regionForLevel(level);
      expect(enc.faction).toBe(region.faction);
      expect(enc.cards.length).toBeLessThanOrEqual(5);
      for (const c of enc.cards) {
        expect(UNITS[c.unitId].faction, `L${level}`).toBe(region.faction);
        expect(c.stars).toBeLessThanOrEqual(MAX_STARS);
      }
    }
    // Verify scaling tiers
    expect(enemyCountForLevel(2)).toBe(1);
    expect(enemyCountForLevel(5)).toBe(2);
    expect(enemyCountForLevel(10)).toBe(3);
    expect(enemyCountForLevel(19)).toBe(4);
    expect(enemyCountForLevel(20)).toBe(5);
  });

  it("only uses 1★ units at level 1", () => {
    const enc = generateEncounter(1, lcg(9));
    for (const c of enc.cards) expect(UNITS[c.unitId].baseStars).toBe(1);
  });
});

describe("campaign rewards", () => {
  it("pays 10 Tribute per campaign level", () => {
    expect([1, 5, 30].map(storyTribute)).toEqual([10, 50, 300]);
  });

  it("recruits the boss from a boss encounter, at 5★ rather than its boss stars", () => {
    const enc = generateStoryEncounter(30, lcg(3));
    expect(strongestEnemy(enc).id).toBe(enc.bossId);
    const boss = enc.cards.find((c) => c.id === enc.bossId)!;
    expect(boss.stars).toBe(10);
    expect(recruitCard(enc)).toMatchObject({ unitId: boss.unitId, stars: 5 });
  });

  it("otherwise recruits the highest-star enemy, then the strongest unit", () => {
    const enc = {
      faction: UNITS.mage.faction,
      cards: [
        { id: "a", unitId: "mage" as const, stars: 2 },
        { id: "b", unitId: "dendroid" as const, stars: 3 },
        { id: "c", unitId: "mage" as const, stars: 3 },
      ],
    };
    const strongerAt3 = unitStrength(UNITS.dendroid) >= unitStrength(UNITS.mage) ? "b" : "c";
    expect(strongestEnemy(enc).id).toBe(strongerAt3);
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

  it("boss encounters use the region's faction with scaling minions", () => {
    const rand = lcg(11);
    for (let k = 1; k <= 6; k++) {
      const level = k * BOSS_EVERY;
      const expectedMinions = Math.min(4, 1 + k);
      const region = regionForLevel(level);
      const enc = generateStoryEncounter(level, rand);
      expect(enc.bossId, `L${level}`).toBeTruthy();
      expect(enc.statMult).toBe(BOSS_ARMY_MULT);
      expect(enc.cards).toHaveLength(1 + expectedMinions);
      expect(enc.faction).toBe(region.faction);
      const boss = enc.cards.find((c) => c.id === enc.bossId)!;
      expect(boss.stars).toBe(bossStarsForLevel(level));
      expect(UNITS[boss.unitId].baseStars).toBe(5);
      expect(UNITS[boss.unitId].faction).toBe(region.faction);
      expect(UNITS[boss.unitId].traits.includes("ascendant"), `L${level}`).toBe(k >= 4);
      const minions = enc.cards.filter((c) => c.id !== enc.bossId);
      expect(minions).toHaveLength(expectedMinions);
      for (const m of minions) {
        expect(UNITS[m.unitId].faction, `L${level} minion`).toBe(region.faction);
      }
    }
  });

  it("non-boss story levels are ordinary faction encounters", () => {
    const enc = generateStoryEncounter(7, lcg(2));
    expect(enc.bossId).toBeUndefined();
    expect(enc.faction).toBe("barbarian");
    expect(enc.cards.length).toBeLessThanOrEqual(5);
    for (const c of enc.cards) {
      expect(UNITS[c.unitId].faction).toBe("barbarian");
    }
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

  it("grows the roster slowly and up to 5 enemies at deep depths", () => {
    const rand = lcg(6);
    expect(generateDepthsEncounter(1, rand).cards).toHaveLength(1);
    for (let d = 1; d <= 200; d += 7) {
      const enc = generateDepthsEncounter(d, rand);
      expect(enc.cards.length).toBeLessThanOrEqual(5);
      expect(enc.faction).toBeDefined();
      for (const c of enc.cards) expect(c.stars).toBeLessThanOrEqual(MAX_STARS);
    }
    // Verify scaling tiers
    expect(depthsEnemyCount(2)).toBe(1);
    expect(depthsEnemyCount(5)).toBe(2);
    expect(depthsEnemyCount(12)).toBe(3);
    expect(depthsEnemyCount(24)).toBe(4);
    expect(depthsEnemyCount(25)).toBe(5);
    expect(generateDepthsEncounter(50, rand).cards).toHaveLength(5);
  });

  it("pays 30 base spoils per minute for every 5 depths cleared", () => {
    expect(DEPTHS_TIER_SIZE).toBe(5);
    expect(DEPTHS_SPOILS_PER_TIER).toBe(30);
    expect(depthsIncomePerMinute(0)).toBe(0);
    expect(depthsIncomePerMinute(4)).toBe(0);
    expect(depthsIncomePerMinute(5)).toBe(30);
    expect(depthsIncomePerMinute(9)).toBe(30);
    expect(depthsIncomePerMinute(23)).toBe(120);
  });

  it("grants starstone every 25 depths", () => {
    expect(DEPTHS_STARSTONE_INTERVAL).toBe(25);
  });
});
