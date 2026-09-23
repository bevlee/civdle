// Settlement upgrades: one-time resource-costing improvements that bridge
// skill progression to combat power.

import type { ResourceAmount, SkillId } from "./gameData";

export type SettlementUpgradeId =
  | "treasury"
  | "feastHall"
  | "grandFeast"
  | "royalFeast"
  | "emperorsBanquet"
  | "heroicTribute"
  | "divineSummons"
  | "celestialAltar";

export interface SettlementUpgradeDef {
  id: SettlementUpgradeId;
  name: string;
  description: string;
  icon: string;
  cost: ResourceAmount[];
  /** Skill-level prerequisites that must be met before purchasing. */
  prereqs: { skill: SkillId; level: number }[];
  /** Upgrade that must be purchased first (linear chains). */
  requires?: SettlementUpgradeId;
}

export const SETTLEMENT_UPGRADES: Record<SettlementUpgradeId, SettlementUpgradeDef> = {
  treasury: {
    id: "treasury",
    name: "Treasury",
    description: "Doubles Tribute earned from the Depths.",
    icon: "🏛",
    cost: [
      { resource: "stone", amount: 100 },
      { resource: "planks", amount: 50 },
      { resource: "bricks", amount: 30 },
    ],
    prereqs: [],
  },
  feastHall: {
    id: "feastHall",
    name: "Feast Hall",
    description: "Host feasts to attract finer warriors. Improves 4★ and 5★ summon rates.",
    icon: "🍻",
    cost: [
      { resource: "ale", amount: 40 },
      { resource: "preparedMeal", amount: 30 },
      { resource: "furniture", amount: 20 },
    ],
    prereqs: [],
  },
  grandFeast: {
    id: "grandFeast",
    name: "Grand Feast",
    description: "Legendary feasts draw the greatest heroes. Further improves summon rates.",
    icon: "👑",
    cost: [
      { resource: "mead", amount: 40 },
      { resource: "ale", amount: 60 },
      { resource: "fineClothing", amount: 30 },
      { resource: "furniture", amount: 30 },
    ],
    prereqs: [],
  },
  royalFeast: {
    id: "royalFeast",
    name: "Royal Feast",
    description: "A feast fit for kings. 5★ summon rate doubles to 8%.",
    icon: "🏰",
    cost: [
      { resource: "ale", amount: 30 },
      { resource: "cookedFish", amount: 20 },
      { resource: "cloth", amount: 15 },
      { resource: "bricks", amount: 10 },
    ],
    prereqs: [],
  },
  emperorsBanquet: {
    id: "emperorsBanquet",
    name: "Emperor's Banquet",
    description: "An imperial spectacle that commands legendary warriors. 5★ rate rises to 16%.",
    icon: "🎆",
    cost: [
      { resource: "mead", amount: 50 },
      { resource: "preparedMeal", amount: 30 },
      { resource: "wool", amount: 25 },
      { resource: "planks", amount: 20 },
      { resource: "tools", amount: 15 },
    ],
    prereqs: [],
  },
  heroicTribute: {
    id: "heroicTribute",
    name: "Heroic Tribute",
    description: "Offer tribute worthy of heroes. 5★ summon rate soars to 32%.",
    icon: "⚜",
    cost: [
      { resource: "ale", amount: 80 },
      { resource: "grain", amount: 60 },
      { resource: "preparedHides", amount: 40 },
      { resource: "copperBar", amount: 30 },
      { resource: "potteryVessel", amount: 20 },
    ],
    prereqs: [],
  },
  divineSummons: {
    id: "divineSummons",
    name: "Divine Summons",
    description: "Call upon the gods themselves. 5★ rate reaches a staggering 64%.",
    icon: "✦",
    cost: [
      { resource: "mead", amount: 100 },
      { resource: "fineClothing", amount: 80 },
      { resource: "furniture", amount: 60 },
      { resource: "steelBar", amount: 50 },
      { resource: "bricks", amount: 40 },
    ],
    prereqs: [],
  },
  celestialAltar: {
    id: "celestialAltar",
    name: "Celestial Altar",
    description: "A sacred altar that channels divine energy, guaranteeing legendary 5★ heroes. Unlocks Legendary Summons, paid in Glory from the Conquest skill.",
    icon: "🌟",
    cost: [
      { resource: "steelBar", amount: 30 },
      { resource: "bricks", amount: 25 },
      { resource: "mead", amount: 20 },
      { resource: "fineClothing", amount: 15 },
    ],
    prereqs: [],
  },
};

export const SETTLEMENT_UPGRADE_ORDER: SettlementUpgradeId[] = [
  "treasury",
  "feastHall",
  "grandFeast",
  "royalFeast",
  "emperorsBanquet",
  "heroicTribute",
  "divineSummons",
  "celestialAltar",
];

// --- Treasury: doubles depths income ---

export function treasuryMultiplier(hasTreasury: boolean): number {
  return hasTreasury ? 2 : 1;
}

// --- Gacha: improved rates based on feast upgrades ---
// Base rates (ordered rarest-first for cumulative rolling):
//   5★ 1%, 4★ 5%, 3★ 15%, 2★ 30%, 1★ 49%

export interface RollRate {
  stars: number;
  rate: number;
}

export const BASE_RATES: RollRate[] = [
  { stars: 5, rate: 0.01 },
  { stars: 4, rate: 0.05 },
  { stars: 3, rate: 0.15 },
  { stars: 2, rate: 0.30 },
  { stars: 1, rate: 0.49 },
];

export const FEAST_HALL_RATES: RollRate[] = [
  { stars: 5, rate: 0.02 },
  { stars: 4, rate: 0.08 },
  { stars: 3, rate: 0.20 },
  { stars: 2, rate: 0.30 },
  { stars: 1, rate: 0.40 },
];

export const GRAND_FEAST_RATES: RollRate[] = [
  { stars: 5, rate: 0.04 },
  { stars: 4, rate: 0.12 },
  { stars: 3, rate: 0.24 },
  { stars: 2, rate: 0.30 },
  { stars: 1, rate: 0.30 },
];

export const ROYAL_FEAST_RATES: RollRate[] = [
  { stars: 5, rate: 0.08 },
  { stars: 4, rate: 0.14 },
  { stars: 3, rate: 0.25 },
  { stars: 2, rate: 0.28 },
  { stars: 1, rate: 0.25 },
];

export const EMPERORS_BANQUET_RATES: RollRate[] = [
  { stars: 5, rate: 0.16 },
  { stars: 4, rate: 0.16 },
  { stars: 3, rate: 0.24 },
  { stars: 2, rate: 0.24 },
  { stars: 1, rate: 0.20 },
];

export const HEROIC_TRIBUTE_RATES: RollRate[] = [
  { stars: 5, rate: 0.32 },
  { stars: 4, rate: 0.18 },
  { stars: 3, rate: 0.20 },
  { stars: 2, rate: 0.18 },
  { stars: 1, rate: 0.12 },
];

export const DIVINE_SUMMONS_RATES: RollRate[] = [
  { stars: 5, rate: 0.64 },
  { stars: 4, rate: 0.16 },
  { stars: 3, rate: 0.12 },
  { stars: 2, rate: 0.06 },
  { stars: 1, rate: 0.02 },
];

export function getEffectiveRollRates(upgrades: Set<SettlementUpgradeId>): RollRate[] {
  if (upgrades.has("divineSummons")) return DIVINE_SUMMONS_RATES;
  if (upgrades.has("heroicTribute")) return HEROIC_TRIBUTE_RATES;
  if (upgrades.has("emperorsBanquet")) return EMPERORS_BANQUET_RATES;
  if (upgrades.has("royalFeast")) return ROYAL_FEAST_RATES;
  if (upgrades.has("grandFeast")) return GRAND_FEAST_RATES;
  if (upgrades.has("feastHall")) return FEAST_HALL_RATES;
  return BASE_RATES;
}

export function hasCelestialAltar(upgrades: Set<SettlementUpgradeId>): boolean {
  return upgrades.has("celestialAltar");
}
