// Trait synergies: counting how many party members share a trait unlocks
// army-wide bonuses. Four tiers per trait; traits unlock at star thresholds
// (1st always, 2nd at 6★, 3rd at 8★). Ascendant is always active.
// 10★ ascended units count as 2 for synergy purposes.

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
  critMult: number;
  firstHitCrit: boolean;
  enemyAtkMult: number;
  executeThreshold: number;
  tripleHitChance: number;
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
    critMult: 2,
    firstHitCrit: false,
    enemyAtkMult: 1,
    executeThreshold: 0.5,
    tripleHitChance: 0,
  };
}

export interface TraitSynergy {
  name: string;
  description: string;
  thresholds: number[];
  tiers: string[];
  apply: (mods: ArmyMods, tier: number) => void;
}

export const TRAIT_SYNERGIES: Record<Trait, TraitSynergy> = {
  brawler: {
    name: "Brawler",
    description: "Straightforward melee damage dealer",
    thresholds: [2, 3, 4, 5],
    tiers: ["Army ATK +10%", "Army ATK +20%", "Army ATK +35%", "Army ATK +50%"],
    apply: (m, t) => {
      const v = [0.1, 0.2, 0.35, 0.5][t - 1];
      m.atkMult *= 1 + v;
    },
  },
  ranger: {
    name: "Ranger",
    description: "Attacks effectively from range",
    thresholds: [2, 3, 4, 5],
    tiers: ["Ignore 25% DEF", "Ignore 50% DEF", "Ignore 75% DEF", "Ignore 100% DEF"],
    apply: (m, t) => {
      m.defIgnore = Math.max(m.defIgnore, [0.25, 0.5, 0.75, 1][t - 1]);
    },
  },
  tank: {
    name: "Tank",
    description: "High durability; absorbs attacks",
    thresholds: [2, 3, 4, 5],
    tiers: ["Army HP +15%", "Army HP +30%", "Army HP +50%", "Army HP +70%, DEF +20%"],
    apply: (m, t) => {
      m.hpMult *= 1 + [0.15, 0.3, 0.5, 0.7][t - 1];
      if (t === 4) m.defMult *= 1.2;
    },
  },
  assassin: {
    name: "Assassin",
    description: "High burst, reaches vulnerable targets",
    thresholds: [2, 3, 4, 5],
    tiers: ["15% crit (2× dmg)", "30% crit (2× dmg)", "45% crit (2× dmg)", "60% crit (3× dmg)"],
    apply: (m, t) => {
      m.critChance += [0.15, 0.3, 0.45, 0.6][t - 1];
      if (t === 4) m.critMult = 3;
    },
  },
  support: {
    name: "Support",
    description: "Buffs, heals and helps allies",
    thresholds: [2, 3, 4, 5],
    tiers: ["5% HP heal/turn", "10% HP heal/turn", "15% HP heal/turn", "20% HP heal/turn, +15% lifesteal"],
    apply: (m, t) => {
      m.turnHealPct += [0.05, 0.1, 0.15, 0.2][t - 1];
      if (t === 4) m.lifesteal += 0.15;
    },
  },
  charger: {
    name: "Charger",
    description: "Gains value from rapidly engaging",
    thresholds: [2, 3, 4, 5],
    tiers: ["Army SPD +2", "Army SPD +4", "SPD +4, ATK +30%", "SPD +4, ATK +30%, first hit guaranteed crit"],
    apply: (m, t) => {
      m.spdFlat += [2, 4, 4, 4][t - 1];
      if (t >= 3) m.atkMult *= 1.3;
      if (t === 4) m.firstHitCrit = true;
    },
  },
  controller: {
    name: "Controller",
    description: "Restricts, slows or manipulates enemies",
    thresholds: [2, 3, 4, 5],
    tiers: ["Enemy SPD −2", "Enemy SPD −4", "Enemy SPD −6", "Enemy SPD −8, enemy ATK −20%"],
    apply: (m, t) => {
      m.enemySpdFlat -= [2, 4, 6, 8][t - 1];
      if (t === 4) m.enemyAtkMult *= 0.8;
    },
  },
  artillery: {
    name: "Artillery",
    description: "Heavy ranged attacks",
    thresholds: [2, 3, 4, 5],
    tiers: ["Ultimates +50% dmg", "Ultimates +100% dmg", "Ultimates +150% dmg", "Ultimates +200% dmg"],
    apply: (m, t) => {
      m.ultMult *= 1 + [0.5, 1, 1.5, 2][t - 1];
    },
  },
  skirmisher: {
    name: "Skirmisher",
    description: "Mobile: attacks and repositions",
    thresholds: [2, 3, 4, 5],
    tiers: ["15% dodge", "30% dodge", "45% dodge", "50% dodge, SPD +4"],
    apply: (m, t) => {
      m.dodgeChance += [0.15, 0.3, 0.45, 0.5][t - 1];
      if (t === 4) m.spdFlat += 4;
    },
  },
  bruiser: {
    name: "Bruiser",
    description: "Durability plus strong melee damage",
    thresholds: [2, 3, 4, 5],
    tiers: ["ATK & DEF +8%", "ATK & DEF +15%", "ATK & DEF +25%", "ATK & DEF +40%"],
    apply: (m, t) => {
      const v = [0.08, 0.15, 0.25, 0.4][t - 1];
      m.atkMult *= 1 + v;
      m.defMult *= 1 + v;
    },
  },
  executioner: {
    name: "Executioner",
    description: "Finishes weakened units",
    thresholds: [2, 3, 4, 5],
    tiers: ["+50% vs <50% HP", "+100% vs <50% HP", "+150% vs <50% HP", "+200% vs <30% HP"],
    apply: (m, t) => {
      m.executeBonus += [0.5, 1, 1.5, 2][t - 1];
      if (t === 4) m.executeThreshold = 0.3;
    },
  },
  sustainer: {
    name: "Sustainer",
    description: "Recovers HP during combat",
    thresholds: [2, 3, 4, 5],
    tiers: ["15% lifesteal", "30% lifesteal", "45% lifesteal", "60% lifesteal, 5% heal/turn"],
    apply: (m, t) => {
      m.lifesteal += [0.15, 0.3, 0.45, 0.6][t - 1];
      if (t === 4) m.turnHealPct += 0.05;
    },
  },
  swarm: {
    name: "Swarm",
    description: "Value from numbers and repeated attacks",
    thresholds: [2, 3, 4, 5],
    tiers: ["20% double-hit", "40% double-hit", "60% double-hit", "80% double-hit, 15% triple-hit"],
    apply: (m, t) => {
      m.doubleHitChance += [0.2, 0.4, 0.6, 0.8][t - 1];
      if (t === 4) m.tripleHitChance += 0.15;
    },
  },
  defender: {
    name: "Defender",
    description: "Protects allies, punishes engagers",
    thresholds: [2, 3, 4, 5],
    tiers: ["Army DEF +20%", "Army DEF +40%", "Army DEF +60%", "Army DEF +80%, HP +20%"],
    apply: (m, t) => {
      m.defMult *= 1 + [0.2, 0.4, 0.6, 0.8][t - 1];
      if (t === 4) m.hpMult *= 1.2;
    },
  },
  disruptor: {
    name: "Disruptor",
    description: "Reduces enemy stats and morale",
    thresholds: [2, 3, 4, 5],
    tiers: ["Enemy DEF −15%", "Enemy DEF −30%", "Enemy DEF −45%", "Enemy DEF −60%, ignore 25% DEF"],
    apply: (m, t) => {
      m.enemyDefMult *= 1 - [0.15, 0.3, 0.45, 0.6][t - 1];
      if (t === 4) m.defIgnore = Math.max(m.defIgnore, 0.25);
    },
  },
  striker: {
    name: "Striker",
    description: "High damage without needing to be tanky",
    thresholds: [2, 3, 4, 5],
    tiers: ["Basic attacks +15%", "Basic attacks +30%", "Basic attacks +50%", "Basic attacks +70%, ATK +15%"],
    apply: (m, t) => {
      m.basicMult *= 1 + [0.15, 0.3, 0.5, 0.7][t - 1];
      if (t === 4) m.atkMult *= 1.15;
    },
  },
  ascendant: {
    name: "Ascendant",
    description: "A legend among legends",
    thresholds: [1, 2, 3, 4],
    tiers: [
      "ATK, HP & DEF +20%",
      "ATK, HP & DEF +40%; ult every 2nd turn",
      "ATK, HP & DEF +60%; ult every 2nd turn",
      "ATK, HP & DEF +80%; ult every turn",
    ],
    apply: (m, t) => {
      const b = 1 + [0.2, 0.4, 0.6, 0.8][t - 1];
      m.atkMult *= b;
      m.hpMult *= b;
      m.defMult *= b;
      if (t >= 2) m.ultEvery = Math.min(m.ultEvery, 2);
      if (t === 4) m.ultEvery = 1;
    },
  },
};

export const TRAIT_ORDER = Object.keys(TRAIT_SYNERGIES) as Trait[];

export interface ActiveSynergy {
  trait: Trait;
  count: number;
  tier: number;
  nextThreshold: number | null;
}

/** Returns the active (non-gated) traits for a card based on its star level. */
export function activeTraitsForCard(card: UnitCard): Trait[] {
  const unit = UNITS[card.unitId];
  const nonAsc = unit.traits.filter((t) => t !== "ascendant");
  const active: Trait[] = [];
  if (nonAsc.length >= 1) active.push(nonAsc[0]);
  if (nonAsc.length >= 2 && card.stars >= 6) active.push(nonAsc[1]);
  if (nonAsc.length >= 3 && card.stars >= 8) active.push(nonAsc[2]);
  if (unit.traits.includes("ascendant")) active.push("ascendant");
  return active;
}

export function countTraits(cards: UnitCard[]): Map<Trait, number> {
  const counts = new Map<Trait, number>();
  for (const card of cards) {
    const traits = activeTraitsForCard(card);
    for (const trait of traits) {
      const add = card.ascended ? 2 : 1;
      counts.set(trait, (counts.get(trait) ?? 0) + add);
    }
  }
  return counts;
}

export function tierFor(trait: Trait, count: number): number {
  const thresholds = TRAIT_SYNERGIES[trait].thresholds;
  let tier = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (count >= thresholds[i]) tier = i + 1;
  }
  return tier;
}

export function activeSynergies(cards: UnitCard[]): ActiveSynergy[] {
  const counts = countTraits(cards);
  const out: ActiveSynergy[] = [];
  for (const [trait, count] of counts) {
    const tier = tierFor(trait, count);
    const thresholds = TRAIT_SYNERGIES[trait].thresholds;
    let nextThreshold: number | null = null;
    for (const t of thresholds) {
      if (count < t) { nextThreshold = t; break; }
    }
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
