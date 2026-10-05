import { ULTIMATES } from "./combatData";
import { ATTACK_ORDER } from "./position";

export interface GlossaryEntry {
  title: string;
  body: string;
  /** Matched case-insensitively on word boundaries; the longest match wins. */
  terms: string[];
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  ultimate: {
    title: "Ultimate",
    body: `A hero’s special attack, normally every third action in place of a basic attack. Melee uses ${ULTIMATES.melee.name}, Ranged uses ${ULTIMATES.ranged.name}, Magic uses ${ULTIMATES.magic.name}. Ultimates can crit, but can’t be dodged or hit twice.`,
    terms: ["ultimate", "ultimates"],
  },
  basicAttack: {
    title: "Basic attack",
    body: `A hero’s normal action. It hits one enemy in target order ${ATTACK_ORDER.join(" → ")}, can be dodged, and some traits let it strike twice.`,
    terms: ["basic attack", "basic attacks"],
  },
  chargeMarkers: {
    title: "Charge markers",
    body: "The markers under each hero in battle. They fill as the hero acts and show when the next action will be an ultimate.",
    terms: ["charge markers", "ultimate charge"],
  },
  frontRow: {
    title: "Front row · 2 and 4",
    body: "Basic attacks hit these positions first. Put durable heroes here.",
    terms: ["front row", "front-row"],
  },
  backRow: {
    title: "Back row · 1, 3 and 5",
    body: `Safe from basic attacks until the front row falls, but ${ULTIMATES.ranged.name} and ${ULTIMATES.magic.name} reach it straight away.`,
    terms: ["back row", "back-row"],
  },
  crit: {
    title: "Crit",
    body: "A critical hit deals 2× damage (3× with Assassin’s top tier). Heroes only crit through traits such as Assassin and Charger.",
    terms: ["crit", "crits"],
  },
  dodge: {
    title: "Dodge",
    body: "A dodged basic attack deals no damage. Dodge chance comes from traits such as Skirmisher. Ultimates can’t be dodged.",
    terms: ["dodge", "dodged", "dodges"],
  },
  extraHits: {
    title: "Extra hits",
    body: "Traits such as Swarm give basic attacks a chance to strike twice in one action. Ultimates never do.",
    terms: ["extra hits"],
  },
  trait: {
    title: "Trait",
    body: "A synergy tag on each hero, such as Brawler. Deployed heroes add contributions to their unlocked traits; enough shared contributions activate an army-wide bonus.",
    terms: ["trait", "traits"],
  },
  contribution: {
    title: "Contribution",
    body: "Each deployed hero adds +1 to each of their unlocked traits, or +2 once ascended. Trait tiers activate at contribution thresholds.",
    terms: ["contribution", "contributions"],
  },
  ascendant: {
    title: "Ascendant",
    body: "A trait only some 5-star heroes have, always active. Each tier adds 20% ATK, HP and DEF, and ultimates come every second action at 2 contributions, every action at 4.",
    terms: ["ascendant"],
  },
  ascended: {
    title: "Ascended ✦",
    body: "A hero promoted to 10 stars, the maximum rank, shown as one gold star. Ascended heroes gain +20% HP, ATK and DEF and count twice toward each unlocked trait.",
    terms: ["ascended", "ascension"],
  },
  copy: {
    title: "Copy",
    body: "A duplicate of a hero you already own, usually from a summon. Promotion consumes copies, starting with the lowest-star ones, including copies in your formation.",
    terms: ["copy", "copies", "duplicates"],
  },
  promote: {
    title: "Promote",
    body: "Raise a hero’s star rank by one by consuming copies, plus crafted resources from rank 6. Find it in the hero’s details.",
    terms: ["promote", "promotes", "promotion", "promotions", "promoting", "star up"],
  },
  rarity: {
    title: "Rarity",
    body: "The star rank a hero is summoned at, from 1 to 5. Promoting raises a hero’s rank but never changes their rarity.",
    terms: ["rarity", "base rarity"],
  },
  tribute: {
    title: "Tribute ⚔",
    body: "Earned by winning battles and passively from The Abyss. Spend it on summons and card packs.",
    terms: ["tribute"],
  },
  glory: {
    title: "Glory",
    body: "Earned from the Conquest skill. With the Celestial Altar, it pays for guaranteed 5-star summons.",
    terms: ["glory"],
  },
  summon: {
    title: "Summon",
    body: "Spend Tribute to recruit a random hero, or buy a 10-card pack. Higher-star summons unlock in later ages.",
    terms: ["summon", "summons", "recruit"],
  },
  abyss: {
    title: "The Abyss",
    body: "An endless challenge mode with optional Auto. Every five depths cleared raises your passive Tribute income.",
    terms: ["the abyss"],
  },
  campaign: {
    title: "Campaign",
    body: "Story battles through regions and their bosses. Wins advance the story and award Tribute.",
    terms: ["campaign"],
  },
};

export type GuideSegment = { text: string; key?: string };

const termToKey = new Map(Object.entries(GLOSSARY).flatMap(([key, entry]) => entry.terms.map(term => [term, key] as const)));
const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Longest first, so "basic attacks" wins over "basic attack" and "ultimate charge" over "ultimate".
const pattern = new RegExp(`\\b(${[...termToKey.keys()].sort((a, b) => b.length - a.length).map(escape).join("|")})\\b`, "gi");

/**
 * Splits guide text into plain runs and glossary keywords. Only the first mention of each entry is
 * marked: pass the same `seen` set across a page's blocks so a keyword is underlined once per page.
 */
export function splitGuideText(text: string, seen = new Set<string>()): GuideSegment[] {
  const segments: GuideSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const key = termToKey.get(match[0].toLowerCase())!;
    if (seen.has(key)) continue;
    seen.add(key);
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });
    segments.push({ text: match[0], key });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}
