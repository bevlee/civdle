// Settlement upgrades: one-time resource-costing improvements that bridge
// skill progression to combat power.

import type { ResourceAmount, SkillId } from "./gameData";

export type SettlementUpgradeId =
  | "treasury"
  | "warForge"
  | "masterForge"
  | "feastHall"
  | "grandFeast";

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
    description: "Build a treasury to store Tribute. Construction level raises the cap.",
    icon: "🏛",
    cost: [
      { resource: "stone", amount: 100 },
      { resource: "planks", amount: 50 },
      { resource: "bricks", amount: 30 },
    ],
    prereqs: [{ skill: "construction", level: 10 }],
  },
  warForge: {
    id: "warForge",
    name: "War Forge",
    description: "Forge weapons worthy of 4★ warriors. Unlocks 4★ summons.",
    icon: "⚒",
    cost: [
      { resource: "copperBar", amount: 50 },
      { resource: "ironBar", amount: 30 },
      { resource: "coal", amount: 40 },
    ],
    prereqs: [{ skill: "smithing", level: 20 }],
  },
  masterForge: {
    id: "masterForge",
    name: "Master Forge",
    description: "A master forge attracts legendary 5★ heroes to your cause.",
    icon: "🔥",
    cost: [
      { resource: "steelBar", amount: 40 },
      { resource: "steelTools", amount: 20 },
      { resource: "ironBar", amount: 50 },
    ],
    prereqs: [{ skill: "smithing", level: 45 }],
    requires: "warForge",
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
    prereqs: [
      { skill: "brewing", level: 10 },
      { skill: "cooking", level: 10 },
    ],
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
    prereqs: [
      { skill: "brewing", level: 25 },
      { skill: "weaving", level: 25 },
    ],
    requires: "feastHall",
  },
};

export const SETTLEMENT_UPGRADE_ORDER: SettlementUpgradeId[] = [
  "treasury",
  "warForge",
  "masterForge",
  "feastHall",
  "grandFeast",
];

// --- Treasury: tribute cap based on construction level ---

const BASE_TRIBUTE_CAP = 100;
const TRIBUTE_PER_LEVEL = 10;
const TRIBUTE_CAP_AT_99 = 1500;

export function tributeCap(constructionLevel: number, hasTreasury: boolean): number {
  if (!hasTreasury) return Infinity;
  if (constructionLevel >= 99) return TRIBUTE_CAP_AT_99;
  return BASE_TRIBUTE_CAP + TRIBUTE_PER_LEVEL * constructionLevel;
}

// --- Gacha: star-tier gating based on forge upgrades ---

export function maxSummonStars(upgrades: Set<SettlementUpgradeId>): number {
  if (upgrades.has("masterForge")) return 5;
  if (upgrades.has("warForge")) return 4;
  return 3;
}

// --- Gacha: improved rates based on feast upgrades ---
// Base rates (ordered rarest-first for cumulative rolling):
//   5★ 1%, 4★ 5%, 3★ 15%, 2★ 30%, 1★ 49%

export interface RollRate {
  stars: number;
  rate: number;
}

const BASE_RATES: RollRate[] = [
  { stars: 5, rate: 0.01 },
  { stars: 4, rate: 0.05 },
  { stars: 3, rate: 0.15 },
  { stars: 2, rate: 0.30 },
  { stars: 1, rate: 0.49 },
];

const FEAST_HALL_RATES: RollRate[] = [
  { stars: 5, rate: 0.02 },
  { stars: 4, rate: 0.08 },
  { stars: 3, rate: 0.20 },
  { stars: 2, rate: 0.30 },
  { stars: 1, rate: 0.40 },
];

const GRAND_FEAST_RATES: RollRate[] = [
  { stars: 5, rate: 0.04 },
  { stars: 4, rate: 0.12 },
  { stars: 3, rate: 0.24 },
  { stars: 2, rate: 0.30 },
  { stars: 1, rate: 0.30 },
];

export function getEffectiveRollRates(upgrades: Set<SettlementUpgradeId>): RollRate[] {
  if (upgrades.has("grandFeast")) return GRAND_FEAST_RATES;
  if (upgrades.has("feastHall")) return FEAST_HALL_RATES;
  return BASE_RATES;
}
