// Summon odds as players actually get them: capped tiers locked, the rest renormalised like rollRarity.

import { AGES } from "../gameData";
import { getMaxSummonStars } from "../gameEngine";
import type { RollRate } from "../settlementData";

export interface OddsRow {
  stars: number;
  pct: number;
  lockedUntil?: string;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function displayOdds(
  rates: RollRate[],
  maxStars: number,
  ageNameForStars: (stars: number) => string,
): OddsRow[] {
  const total = rates.filter((r) => r.stars <= maxStars).reduce((sum, r) => sum + r.rate, 0);
  return rates.map(({ stars, rate }) =>
    stars > maxStars
      ? { stars, pct: 0, lockedUntil: ageNameForStars(stars) }
      : { stars, pct: total > 0 ? round1((rate / total) * 100) : 0 },
  );
}

// The first age whose summon cap reaches this rarity.
export function ageNameForStars(stars: number): string {
  const index = AGES.findIndex((_, i) => getMaxSummonStars(i) >= stars);
  return index === -1 ? "a later age" : AGES[index].name;
}
