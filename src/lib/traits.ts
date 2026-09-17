// Trait synergies: counting how many party members share a trait unlocks
// army-wide bonuses. Two tiers per trait (Ascendant: 1 and 2 copies).

import type { Trait, UnitCard } from "./combatData";
import { UNITS, ULT_EVERY_TURNS } from "./combatData";

export interface ArmyMods {
  atkMult: number;
  hpMult: number;
  defMult: number;
  spdFlat: number;
  critChance: number;
  dodgeChance: number;
  lifesteal: number;
  ultMult: number;
  executeBonus: number;
  basicMult: number;
  defIgnore: number;
  doubleHitChance: number;
  turnHealPct: number;
  enemyDefMult: number;
  enemySpdFlat: number;
  ultEvery: number;
}

export function neutralMods(): ArmyMods {
  return {
    atkMult: 1,
    hpMult: 1,
    defMult: 1,
    spdFlat: 0,
    critChance: 0,
    dodgeChance: 0,
    lifesteal: 0,
    ultMult: 1,
    executeBonus: 0,
    basicMult: 1,
    defIgnore: 0,
    doubleHitChance: 0,
    turnHealPct: 0,
    enemyDefMult: 1,
    enemySpdFlat: 0,
    ultEvery: ULT_EVERY_TURNS,
  };
}

export interface TraitSynergy {
  name: string;
  description: string;
  thresholds: [number, number];
  tiers: [string, string];
  apply: (mods: ArmyMods, tier: 1 | 2) => void;
}

const T = (a: number, b: number, tier: 1 | 2) => (tier === 1 ? a : b);

export const TRAIT_SYNERGIES: Record<Trait, TraitSynergy> = {
  brawler: {
    name: "Brawler",
    description: "Straightforward melee damage dealer",
    thresholds: [2, 3],
    tiers: ["Army ATK +10%", "Army ATK +20%"],
    apply: (m, t) => { m.atkMult *= 1 + T(0.1, 0.2, t); },
  },
  ranger: {
    name: "Ranger",
    description: "Attacks effectively from range",
    thresholds: [2, 3],
    tiers: ["Attacks ignore 25% of DEF", "Attacks ignore 50% of DEF"],
    apply: (m, t) => { m.defIgnore = Math.max(m.defIgnore, T(0.25, 0.5, t)); },
  },
  tank: {
    name: "Tank",
    description: "High durability; absorbs attacks",
    thresholds: [2, 3],
    tiers: ["Army HP +15%", "Army HP +30%"],
    apply: (m, t) => { m.hpMult *= 1 + T(0.15, 0.3, t); },
  },
  assassin: {
    name: "Assassin",
    description: "High burst, reaches vulnerable targets",
    thresholds: [2, 3],
    tiers: ["15% crit chance (2× dmg)", "30% crit chance (2× dmg)"],
    apply: (m, t) => { m.critChance += T(0.15, 0.3, t); },
  },
  support: {
    name: "Support",
    description: "Buffs, heals and helps allies",
    thresholds: [2, 3],
    tiers: ["Units heal 5% HP at turn start", "Units heal 10% HP at turn start"],
    apply: (m, t) => { m.turnHealPct += T(0.05, 0.1, t); },
  },
  charger: {
    name: "Charger",
    description: "Gains value from rapidly engaging",
    thresholds: [2, 3],
    tiers: ["Army SPD +2", "Army SPD +4"],
    apply: (m, t) => { m.spdFlat += T(2, 4, t); },
  },
  controller: {
    name: "Controller",
    description: "Restricts, slows or manipulates enemies",
    thresholds: [2, 3],
    tiers: ["Enemy SPD −2", "Enemy SPD −4"],
    apply: (m, t) => { m.enemySpdFlat -= T(2, 4, t); },
  },
  artillery: {
    name: "Artillery",
    description: "Heavy ranged attacks",
    thresholds: [2, 3],
    tiers: ["Ultimates +50% damage", "Ultimates +100% damage"],
    apply: (m, t) => { m.ultMult *= 1 + T(0.5, 1, t); },
  },
  skirmisher: {
    name: "Skirmisher",
    description: "Mobile: attacks and repositions",
    thresholds: [2, 3],
    tiers: ["15% dodge chance", "30% dodge chance"],
    apply: (m, t) => { m.dodgeChance += T(0.15, 0.3, t); },
  },
  bruiser: {
    name: "Bruiser",
    description: "Durability plus strong melee damage",
    thresholds: [2, 3],
    tiers: ["Army ATK & DEF +8%", "Army ATK & DEF +15%"],
    apply: (m, t) => { m.atkMult *= 1 + T(0.08, 0.15, t); m.defMult *= 1 + T(0.08, 0.15, t); },
  },
  executioner: {
    name: "Executioner",
    description: "Finishes weakened units",
    thresholds: [2, 3],
    tiers: ["+50% dmg vs targets under 50% HP", "+100% dmg vs targets under 50% HP"],
    apply: (m, t) => { m.executeBonus += T(0.5, 1, t); },
  },
  sustainer: {
    name: "Sustainer",
    description: "Recovers HP during combat",
    thresholds: [2, 3],
    tiers: ["15% lifesteal", "30% lifesteal"],
    apply: (m, t) => { m.lifesteal += T(0.15, 0.3, t); },
  },
  swarm: {
    name: "Swarm",
    description: "Value from numbers and repeated attacks",
    thresholds: [2, 3],
    tiers: ["20% chance basic attacks hit twice", "40% chance basic attacks hit twice"],
    apply: (m, t) => { m.doubleHitChance += T(0.2, 0.4, t); },
  },
  defender: {
    name: "Defender",
    description: "Protects allies, punishes engagers",
    thresholds: [2, 3],
    tiers: ["Army DEF +20%", "Army DEF +40%"],
    apply: (m, t) => { m.defMult *= 1 + T(0.2, 0.4, t); },
  },
  disruptor: {
    name: "Disruptor",
    description: "Reduces enemy stats and morale",
    thresholds: [2, 3],
    tiers: ["Enemy DEF −15%", "Enemy DEF −30%"],
    apply: (m, t) => { m.enemyDefMult *= 1 - T(0.15, 0.3, t); },
  },
  striker: {
    name: "Striker",
    description: "High damage without needing to be tanky",
    thresholds: [2, 3],
    tiers: ["Basic attacks +15% damage", "Basic attacks +30% damage"],
    apply: (m, t) => { m.basicMult *= 1 + T(0.15, 0.3, t); },
  },
  ascendant: {
    name: "Ascendant",
    description: "A legend among legends",
    thresholds: [1, 2],
    tiers: ["Army ATK, HP & DEF +20%", "Army ATK, HP & DEF +40%; ultimate every 2nd turn"],
    apply: (m, t) => {
      const b = 1 + T(0.2, 0.4, t);
      m.atkMult *= b;
      m.hpMult *= b;
      m.defMult *= b;
      if (t === 2) m.ultEvery = Math.min(m.ultEvery, 2);
    },
  },
};

export const TRAIT_ORDER = Object.keys(TRAIT_SYNERGIES) as Trait[];

export interface ActiveSynergy {
  trait: Trait;
  count: number;
  tier: 0 | 1 | 2;
  nextThreshold: number | null;
}

export function countTraits(cards: UnitCard[]): Map<Trait, number> {
  const counts = new Map<Trait, number>();
  for (const card of cards) {
    for (const trait of UNITS[card.unitId].traits) {
      counts.set(trait, (counts.get(trait) ?? 0) + 1);
    }
  }
  return counts;
}

export function tierFor(trait: Trait, count: number): 0 | 1 | 2 {
  const [t1, t2] = TRAIT_SYNERGIES[trait].thresholds;
  if (count >= t2) return 2;
  if (count >= t1) return 1;
  return 0;
}

// Every trait present in the party, active or not, sorted active-first then by count.
export function activeSynergies(cards: UnitCard[]): ActiveSynergy[] {
  const counts = countTraits(cards);
  const out: ActiveSynergy[] = [];
  for (const [trait, count] of counts) {
    const tier = tierFor(trait, count);
    const [t1, t2] = TRAIT_SYNERGIES[trait].thresholds;
    const nextThreshold = tier === 0 ? t1 : tier === 1 ? t2 : null;
    out.push({ trait, count, tier, nextThreshold });
  }
  return out.sort((a, b) => b.tier - a.tier || b.count - a.count || a.trait.localeCompare(b.trait));
}

export function computeArmyMods(cards: UnitCard[]): ArmyMods {
  const mods = neutralMods();
  for (const { trait, tier } of activeSynergies(cards)) {
    if (tier !== 0) TRAIT_SYNERGIES[trait].apply(mods, tier);
  }
  return mods;
}
