// What the summon panel shows: the three banners, their unlock checklists and costs,
// where the odds come from, and what a pull brought in.

import { GACHA_COST, PACK_COST, PACK_SIZE, UNITS, type UnitCard } from "../combatData";
import { AGES } from "../gameData";
import { theAge } from "../gameEngine";
import {
  LEGENDARY_PACK_COST,
  LEGENDARY_PACK_SIZE,
  LEGENDARY_SINGLE_COST,
  TRIBUTE_LEGENDARY_PACK_COST,
} from "../gameState.svelte";
import { SETTLEMENT_UPGRADES, rollRateUpgrade, type SettlementUpgradeId } from "../settlementData";
import { ageNameForStars } from "./summonOdds";

export type BannerId = "standard" | "legendary" | "pack";
export type Currency = "Tribute" | "Glory";

export interface SummonOption {
  count: number;
  cost: number;
  /** Currency saved against buying the same number one at a time. */
  save: number;
}

export interface Requirement {
  label: string;
  done: boolean;
  sub: string;
  /** Met by building something in the Settlement. */
  settlement: boolean;
}

export interface Banner {
  id: BannerId;
  name: string;
  title: string;
  description: string;
  /** Stars shown on the banner: the summon cap, or 5 for the guaranteed banners. */
  stars: number;
  currency: Currency;
  balance: number;
  locked: boolean;
  requirements: Requirement[];
  options: SummonOption[];
  /** "10 Tribute", or "🔒 Locked". */
  status: string;
}

export interface BannerInput {
  tribute: number;
  glory: number;
  maxStars: number;
  ageIndex: number;
  hasCelestialAltar: boolean;
  hasHallOfLegends: boolean;
}

export { theAge };

export const formatAmount = (n: number): string => n.toLocaleString("en-US");

function settlementRequirement(id: SettlementUpgradeId, built: boolean): Requirement {
  return {
    label: `Build the ${SETTLEMENT_UPGRADES[id].name}`,
    done: built,
    sub: built ? "Built" : "Settlement building",
    settlement: true,
  };
}

export function summonBanners(input: BannerInput): Banner[] {
  const finalAge = AGES.length - 1;
  const reachedFinalAge = input.ageIndex >= finalAge;
  const fiveStars = input.maxStars >= 5;
  const current = AGES[Math.min(input.ageIndex, finalAge)].name;
  const banners: Omit<Banner, "status">[] = [
    {
      id: "standard",
      name: "Standard",
      title: "Standard Summon",
      description: "Draw heroes from the full pool. Higher stars unlock as your civilisation advances.",
      stars: input.maxStars,
      currency: "Tribute",
      balance: input.tribute,
      locked: false,
      requirements: [],
      options: [
        { count: 1, cost: GACHA_COST, save: 0 },
        { count: PACK_SIZE, cost: PACK_COST, save: GACHA_COST * PACK_SIZE - PACK_COST },
      ],
    },
    {
      id: "legendary",
      name: "Legendary",
      title: "Legendary Summon",
      description: "Every hero is a guaranteed 5★. Paid in Glory, earned from the Conquest skill.",
      stars: 5,
      currency: "Glory",
      balance: input.glory,
      locked: !(input.hasCelestialAltar && reachedFinalAge),
      requirements: [
        settlementRequirement("celestialAltar", input.hasCelestialAltar),
        {
          label: `Reach ${theAge(AGES[finalAge].name)}`,
          done: reachedFinalAge,
          sub: reachedFinalAge ? "Done" : `Currently in ${theAge(current)}`,
          settlement: false,
        },
      ],
      options: [
        { count: 1, cost: LEGENDARY_SINGLE_COST, save: 0 },
        {
          count: LEGENDARY_PACK_SIZE,
          cost: LEGENDARY_PACK_COST,
          save: LEGENDARY_SINGLE_COST * LEGENDARY_PACK_SIZE - LEGENDARY_PACK_COST,
        },
      ],
    },
    {
      id: "pack",
      name: "Legend Pack",
      title: "Legendary Pack",
      description: "Ten guaranteed 5★ heroes in one pack, bought with Tribute.",
      stars: 5,
      currency: "Tribute",
      balance: input.tribute,
      locked: !(input.hasHallOfLegends && fiveStars),
      requirements: [
        settlementRequirement("hallOfLegends", input.hasHallOfLegends),
        {
          label: `Reach ${theAge(ageNameForStars(5))}`,
          done: fiveStars,
          sub: fiveStars ? "Done" : `Currently in ${theAge(current)}`,
          settlement: false,
        },
      ],
      options: [{ count: LEGENDARY_PACK_SIZE, cost: TRIBUTE_LEGENDARY_PACK_COST, save: 0 }],
    },
  ];
  return banners.map((b) => ({
    ...b,
    status: b.locked ? "🔒 Locked" : `${formatAmount(b.options[0].cost)} ${b.currency}`,
  }));
}

/** Where the standard odds come from: "via Feast Hall", or "Base rates". */
export function oddsSource(upgrades: Set<SettlementUpgradeId>): string {
  const id = rollRateUpgrade(upgrades);
  return id ? `via ${SETTLEMENT_UPGRADES[id].name}` : "Base rates";
}

export interface PulledCard {
  card: UnitCard;
  /** The first of its unit in the army. */
  isNew: boolean;
}

/** The cards a summon added, in order; a unit not owned before the pull is new (its first copy only). */
export function pulledCards(before: UnitCard[], after: UnitCard[]): PulledCard[] {
  const beforeIds = new Set(before.map((c) => c.id));
  const owned = new Set<string>(before.map((c) => c.unitId));
  return after
    .filter((c) => !beforeIds.has(c.id))
    .map((card) => {
      const isNew = !owned.has(card.unitId);
      owned.add(card.unitId);
      return { card, isNew };
    });
}

/** The rarest pull (first one wins a tie). */
export function bestPull(pulls: PulledCard[]): PulledCard | null {
  return pulls.reduce<PulledCard | null>(
    (best, p) => (!best || UNITS[p.card.unitId].baseStars > UNITS[best.card.unitId].baseStars ? p : best),
    null,
  );
}
