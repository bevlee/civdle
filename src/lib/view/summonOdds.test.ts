import { describe, expect, it } from "vitest";
import { rollRarity } from "../combatData";
import { BASE_RATES, FEAST_HALL_RATES } from "../settlementData";
import { ageNameForStars, displayOdds } from "./summonOdds";

// Small seeded PRNG so the cross-check is deterministic.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("displayOdds", () => {
  it("locks tiers above the cap and renormalises the rest", () => {
    const rows = displayOdds(BASE_RATES, 3, ageNameForStars);
    expect(rows.map((r) => r.stars)).toEqual([5, 4, 3, 2, 1]);
    expect(rows[0]).toEqual({ stars: 5, pct: 0, lockedUntil: "Medieval" });
    expect(rows[1]).toEqual({ stars: 4, pct: 0, lockedUntil: "Iron Age" });
    expect(rows[2]).toEqual({ stars: 3, pct: Math.round((0.15 / 0.94) * 1000) / 10 });
    expect(rows[3]).toEqual({ stars: 2, pct: Math.round((0.3 / 0.94) * 1000) / 10 });
    expect(rows[4]).toEqual({ stars: 1, pct: Math.round((0.49 / 0.94) * 1000) / 10 });
    const sum = rows.reduce((s, r) => s + r.pct, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it("shows raw rates when nothing is capped", () => {
    const rows = displayOdds(FEAST_HALL_RATES, 5, ageNameForStars);
    expect(rows).toEqual(FEAST_HALL_RATES.map(({ stars, rate }) => ({ stars, pct: Math.round(rate * 1000) / 10 })));
  });

  it("matches what rollRarity actually rolls at cap 3", () => {
    const rand = mulberry32(12345);
    const n = 100_000;
    const counts = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const stars = rollRarity(rand, 3, BASE_RATES);
      counts.set(stars, (counts.get(stars) ?? 0) + 1);
    }
    for (const row of displayOdds(BASE_RATES, 3, ageNameForStars)) {
      const observed = ((counts.get(row.stars) ?? 0) / n) * 100;
      expect(Math.abs(observed - row.pct)).toBeLessThanOrEqual(0.5);
    }
  });
});

describe("ageNameForStars", () => {
  it("names the age that first allows each rarity", () => {
    expect(ageNameForStars(4)).toBe("Iron Age");
    expect(ageNameForStars(5)).toBe("Medieval");
  });

  it("names the starting age for rarities available from the start", () => {
    expect(ageNameForStars(3)).toBe("Stone Age");
  });
});
