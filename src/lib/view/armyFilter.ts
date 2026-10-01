// Filtering, counting and sorting the army list, shared by the phone dock and the desktop panel.
//
// The star filter matches a hero's rarity (its unit's base stars, 1–5): the colour of its
// card border and the tier it was summoned at. A card's current stars climb to 10 through
// promotion, so they would not fit a 1★–5★ row.

import { MAX_STARS, UNITS, type AttackType, type Trait, type UnitCard } from "../combatData";
import { TRAIT_SYNERGIES } from "../traits";

export type StarFilter = 0 | 1 | 2 | 3 | 4 | 5;
export type TypeFilter = "all" | AttackType;

export interface ArmyFilter {
  /** 0 = any rarity. */
  stars: StarFilter;
  type: TypeFilter;
  trait: Trait | null;
}

export const NO_FILTER: ArmyFilter = { stars: 0, type: "all", trait: null };

const STAR_OPTIONS: StarFilter[] = [0, 1, 2, 3, 4, 5];
const TYPE_OPTIONS: TypeFilter[] = ["all", "melee", "ranged", "magic"];

const TYPE_LABELS: Record<TypeFilter, string> = { all: "All", melee: "Melee", ranged: "Ranged", magic: "Magic" };

export function typeLabel(type: TypeFilter): string {
  return TYPE_LABELS[type];
}

export function starLabel(stars: StarFilter): string {
  return stars === 0 ? "Any" : `${stars}★`;
}

export function traitLabel(trait: Trait): string {
  return TRAIT_SYNERGIES[trait].name;
}

function matchesFilter(card: UnitCard, filter: ArmyFilter): boolean {
  const def = UNITS[card.unitId];
  if (filter.stars !== 0 && def.baseStars !== filter.stars) return false;
  if (filter.type !== "all" && def.attackType !== filter.type) return false;
  if (filter.trait !== null && !def.traits.includes(filter.trait)) return false;
  return true;
}

export function filterArmy(cards: UnitCard[], filter: ArmyFilter): UnitCard[] {
  return cards.filter((card) => matchesFilter(card, filter));
}

export function isFiltered(filter: ArmyFilter): boolean {
  return filter.stars !== 0 || filter.type !== "all" || filter.trait !== null;
}

/** How many cards each star option would show, keeping the type and trait filters. */
export function starCounts(cards: UnitCard[], filter: ArmyFilter): { stars: StarFilter; n: number }[] {
  return STAR_OPTIONS.map((stars) => ({ stars, n: filterArmy(cards, { ...filter, stars }).length }));
}

/** How many cards each attack type option would show, keeping the star and trait filters. */
export function typeCounts(cards: UnitCard[], filter: ArmyFilter): { type: TypeFilter; n: number }[] {
  return TYPE_OPTIONS.map((type) => ({ type, n: filterArmy(cards, { ...filter, type }).length }));
}

/** Traits carried by at least one owned hero, by name. */
export function ownedTraits(cards: UnitCard[]): Trait[] {
  return [...new Set(cards.flatMap((card) => UNITS[card.unitId].traits))].sort((a, b) =>
    traitLabel(a).localeCompare(traitLabel(b)),
  );
}

/** "3★ · Melee · Assassin"; empty when nothing is filtered. */
export function activeFilterLabel(filter: ArmyFilter): string {
  return [
    filter.stars !== 0 ? starLabel(filter.stars) : null,
    filter.type !== "all" ? typeLabel(filter.type) : null,
    filter.trait !== null ? traitLabel(filter.trait) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Cards that have a spare copy to promote with and room to grow. */
export function promotableIds(cards: UnitCard[]): Set<string> {
  const byUnit = new Map<string, number>();
  for (const card of cards) byUnit.set(card.unitId, (byUnit.get(card.unitId) ?? 0) + 1);
  return new Set(cards.filter((c) => c.stars < MAX_STARS && (byUnit.get(c.unitId) ?? 0) > 1).map((c) => c.id));
}

export type SortKey = "stars" | "trait" | "name";

export const SORT_LABELS: Record<SortKey, string> = { stars: "Stars", trait: "Trait", name: "Name" };

/** The sort direction as the toggle shows it: "High–low" for stars, "A–Z" for names. */
export function sortDirectionLabel(key: SortKey, desc: boolean): string {
  if (key === "stars") return desc ? "High–low" : "Low–high";
  return desc ? "Z–A" : "A–Z";
}

export function sortArmy(cards: UnitCard[], key: SortKey, desc: boolean): UnitCard[] {
  const compare = (a: UnitCard, b: UnitCard): number => {
    const da = UNITS[a.unitId];
    const db = UNITS[b.unitId];
    let c = 0;
    if (key === "stars") c = a.stars - b.stars || da.baseStars - db.baseStars;
    else if (key === "trait") c = da.traits[0].localeCompare(db.traits[0]) || a.stars - b.stars;
    else c = da.name.localeCompare(db.name) || a.stars - b.stars;
    if (c === 0) c = da.name.localeCompare(db.name);
    return desc ? -c : c;
  };
  return [...cards].sort(compare);
}
