// Static combat data: the 48 unit definitions, attack-type triangle, star
// scaling, gacha rates, merging rules, and enemy encounter generation.

export type Faction = "barbarian" | "knight" | "wizard" | "necromancer" | "ranger" | "demon";

export type Trait =
  | "brawler"
  | "ranger"
  | "tank"
  | "assassin"
  | "support"
  | "charger"
  | "controller"
  | "artillery"
  | "skirmisher"
  | "bruiser"
  | "executioner"
  | "sustainer"
  | "swarm"
  | "defender"
  | "disruptor"
  | "striker"
  | "ascendant";

export type AttackType = "melee" | "ranged" | "magic";

export type UnitId =
  | "goblin" | "wolf-rider" | "orc" | "ogre" | "ram-rider" | "cyclops" | "thunderbird" | "behemoth"
  | "peasant" | "archer" | "griffin" | "standard-bearer" | "swordsman" | "monk" | "cavalier" | "champion"
  | "gremlin" | "stone-golem" | "mage" | "bilehorn" | "naga" | "siege-golem" | "giant" | "titan"
  | "skeleton" | "zombie" | "ghost" | "blood-acolyte" | "vampire" | "lich" | "black-knight" | "bone-dragon"
  | "sprite" | "wood-elf" | "outrider" | "dendroid" | "pegasus" | "grand-elf" | "battle-dwarf" | "unicorn"
  | "imp" | "gog" | "hell-hound" | "demon" | "blood-fiend" | "pit-fiend" | "efreet" | "devil";

export interface UnitDef {
  id: UnitId;
  name: string;
  faction: Faction;
  baseStars: number; // 1..5 — the rarity the unit is summoned at
  hp: number;
  atk: number;
  def: number;
  spd: number;
  attackType: AttackType;
  traits: Trait[];
}

function u(
  id: UnitId,
  name: string,
  faction: Faction,
  baseStars: number,
  hp: number,
  atk: number,
  def: number,
  spd: number,
  attackType: AttackType,
  traits: Trait[],
): UnitDef {
  return { id, name, faction, baseStars, hp, atk, def, spd, attackType, traits };
}

const UNIT_LIST: UnitDef[] = [
  // Barbarian
  u("goblin", "Goblin", "barbarian", 1, 6, 2, 1, 11, "melee", ["swarm", "brawler", "striker"]),
  u("wolf-rider", "Wolf Rider", "barbarian", 2, 25, 5, 3, 13, "melee", ["assassin", "charger", "skirmisher"]),
  u("orc", "Orc", "barbarian", 3, 38, 7, 5, 10, "ranged", ["brawler", "striker", "bruiser"]),
  u("ogre", "Ogre", "barbarian", 4, 69, 10, 7, 9, "melee", ["brawler", "tank", "defender"]),
  u("ram-rider", "Ram Rider", "barbarian", 4, 62, 9, 6, 10, "melee", ["controller", "disruptor", "bruiser"]),
  u("cyclops", "Cyclops", "barbarian", 5, 107, 15, 10, 10, "ranged", ["artillery", "bruiser", "executioner"]),
  u("thunderbird", "Thunderbird", "barbarian", 5, 121, 20, 12, 14, "magic", ["charger", "striker", "skirmisher"]),
  u("behemoth", "Behemoth", "barbarian", 5, 264, 30, 18, 9, "melee", ["tank", "disruptor", "brawler", "ascendant"]),
  // Knight
  u("peasant", "Peasant", "knight", 1, 9, 1, 1, 9, "melee", ["swarm", "defender", "support"]),
  u("archer", "Archer", "knight", 2, 22, 5, 3, 9, "ranged", ["ranger", "artillery", "striker"]),
  u("griffin", "Griffin", "knight", 3, 32, 8, 8, 14, "melee", ["defender", "skirmisher", "charger"]),
  u("standard-bearer", "Standard Bearer", "knight", 3, 33, 6, 8, 9, "magic", ["support", "defender", "tank"]),
  u("swordsman", "Swordsman", "knight", 4, 51, 10, 12, 8, "melee", ["brawler", "defender", "bruiser"]),
  u("monk", "Monk", "knight", 5, 101, 12, 7, 9, "melee", ["support", "sustainer", "controller"]),
  u("cavalier", "Cavalier", "knight", 5, 100, 15, 15, 11, "melee", ["charger", "brawler", "executioner"]),
  u("champion", "Champion", "knight", 5, 190, 20, 20, 12, "melee", ["charger", "executioner", "brawler", "ascendant"]),
  // Wizard
  u("gremlin", "Gremlin", "wizard", 1, 4, 2, 2, 9, "ranged", ["support", "swarm", "ranger"]),
  u("stone-golem", "Stone Golem", "wizard", 2, 32, 5, 10, 6, "magic", ["tank", "defender", "controller"]),
  u("mage", "Mage", "wizard", 3, 27, 10, 4, 9, "magic", ["ranger", "striker", "artillery"]),
  u("bilehorn", "Bilehorn", "wizard", 4, 64, 10, 9, 8, "melee", ["bruiser", "disruptor", "tank"]),
  u("naga", "Naga", "wizard", 5, 104, 15, 12, 11, "melee", ["brawler", "bruiser", "sustainer"]),
  u("siege-golem", "Siege Golem", "wizard", 5, 117, 12, 12, 7, "magic", ["tank", "artillery", "defender"]),
  u("giant", "Giant", "wizard", 5, 135, 22, 18, 8, "melee", ["bruiser", "executioner", "brawler"]),
  u("titan", "Titan", "wizard", 5, 256, 30, 24, 11, "magic", ["artillery", "striker", "controller", "ascendant"]),
  // Necromancer
  u("skeleton", "Skeleton", "necromancer", 1, 2, 3, 3, 8, "melee", ["swarm", "brawler", "disruptor"]),
  u("zombie", "Zombie", "necromancer", 2, 27, 5, 5, 6, "melee", ["tank", "controller", "defender"]),
  u("ghost", "Ghost", "necromancer", 3, 27, 7, 7, 10, "magic", ["skirmisher", "disruptor", "assassin"]),
  u("blood-acolyte", "Blood Acolyte", "necromancer", 3, 33, 7, 6, 9, "magic", ["sustainer", "support", "controller"]),
  u("vampire", "Vampire", "necromancer", 4, 55, 10, 9, 9, "melee", ["assassin", "sustainer", "skirmisher"]),
  u("lich", "Lich", "necromancer", 5, 92, 13, 10, 9, "ranged", ["ranger", "controller", "disruptor"]),
  u("black-knight", "Black Knight", "necromancer", 5, 105, 18, 15, 9, "melee", ["bruiser", "executioner", "striker"]),
  u("bone-dragon", "Bone Dragon", "necromancer", 5, 238, 28, 20, 10, "melee", ["tank", "disruptor", "controller", "ascendant"]),
  // Ranger
  u("sprite", "Sprite", "ranger", 1, 4, 2, 2, 12, "magic", ["skirmisher", "swarm", "support"]),
  u("wood-elf", "Wood Elf", "ranger", 2, 20, 6, 3, 9, "ranged", ["ranger", "skirmisher", "assassin"]),
  u("outrider", "Outrider", "ranger", 2, 22, 5, 4, 12, "ranged", ["ranger", "skirmisher", "striker"]),
  u("dendroid", "Dendroid", "ranger", 3, 38, 7, 13, 6, "melee", ["tank", "controller", "sustainer"]),
  u("pegasus", "Pegasus", "ranger", 4, 49, 9, 9, 12, "melee", ["assassin", "skirmisher", "charger"]),
  u("grand-elf", "Grand Elf", "ranger", 5, 91, 13, 9, 9, "ranged", ["ranger", "striker", "artillery"]),
  u("battle-dwarf", "Battle Dwarf", "ranger", 5, 101, 14, 16, 8, "melee", ["bruiser", "executioner", "defender"]),
  u("unicorn", "Unicorn", "ranger", 5, 216, 22, 18, 11, "melee", ["striker", "controller", "support", "ascendant"]),
  // Demon
  u("imp", "Imp", "demon", 1, 3, 3, 2, 10, "magic", ["swarm", "disruptor", "controller"]),
  u("gog", "Gog", "demon", 2, 22, 6, 4, 9, "ranged", ["ranger", "artillery", "executioner"]),
  u("hell-hound", "Hell Hound", "demon", 3, 29, 9, 6, 12, "melee", ["striker", "charger", "assassin"]),
  u("demon", "Demon", "demon", 4, 57, 11, 8, 9, "melee", ["brawler", "sustainer", "tank"]),
  u("blood-fiend", "Blood Fiend", "demon", 4, 57, 10, 8, 10, "melee", ["sustainer", "bruiser", "striker"]),
  u("pit-fiend", "Pit Fiend", "demon", 5, 91, 16, 12, 9, "magic", ["support", "bruiser", "disruptor"]),
  u("efreet", "Efreet", "demon", 5, 99, 19, 13, 11, "magic", ["skirmisher", "striker", "assassin"]),
  u("devil", "Devil", "demon", 5, 215, 30, 22, 13, "magic", ["assassin", "executioner", "striker", "ascendant"]),
];

export const UNITS: Record<UnitId, UnitDef> = Object.fromEntries(
  UNIT_LIST.map((d) => [d.id, d]),
) as Record<UnitId, UnitDef>;

export const UNIT_IDS: UnitId[] = UNIT_LIST.map((d) => d.id);

export const FACTIONS: Record<Faction, { name: string; color: string }> = {
  barbarian: { name: "Barbarian", color: "oklch(0.65 0.18 40)" },
  knight: { name: "Knight", color: "oklch(0.75 0.12 85)" },
  wizard: { name: "Wizard", color: "oklch(0.65 0.17 270)" },
  necromancer: { name: "Necromancer", color: "oklch(0.6 0.15 320)" },
  ranger: { name: "Ranger", color: "oklch(0.65 0.16 145)" },
  demon: { name: "Demon", color: "oklch(0.55 0.22 25)" },
};

// ---------- Attack-type triangle ----------

export interface AttackTypeDef {
  id: AttackType;
  name: string;
  icon: string;
  beats: AttackType;
  weakTo: AttackType;
  blurb: string;
}

export const ATTACK_TYPES: Record<AttackType, AttackTypeDef> = {
  melee: { id: "melee", name: "Melee", icon: "⚔", beats: "ranged", weakTo: "magic", blurb: "Closes the gap on ranged units." },
  ranged: { id: "ranged", name: "Ranged", icon: "🏹", beats: "magic", weakTo: "melee", blurb: "Picks off spellcasters from afar." },
  magic: { id: "magic", name: "Magic", icon: "✨", beats: "melee", weakTo: "ranged", blurb: "Tears through armoured brutes." },
};

export const DAMAGE_STRONG = 1.5;
export const DAMAGE_WEAK = 0.75;

export function getTypeMultiplier(attacker: AttackType, defender: AttackType): number {
  if (ATTACK_TYPES[attacker].beats === defender) return DAMAGE_STRONG;
  if (ATTACK_TYPES[attacker].weakTo === defender) return DAMAGE_WEAK;
  return 1;
}

// ---------- Sprites ----------

const spriteModules = import.meta.glob("./assets/units/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const UNIT_SPRITES: Record<UnitId, string> = Object.fromEntries(
  UNIT_IDS.map((id) => [id, spriteModules[`./assets/units/${id}.png`] ?? ""]),
) as Record<UnitId, string>;

// ---------- Cards & stars ----------

export interface UnitCard {
  id: string;
  unitId: UnitId;
  stars: number;
  ascended?: boolean;
}

export const MAX_STARS = 10;
export const STAR_STAT_MULT = 1.4;

export interface CardStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export function computeCardStats(unitId: UnitId, stars: number, ascended?: boolean): CardStats {
  const def = UNITS[unitId];
  let mult = Math.pow(STAR_STAT_MULT, Math.max(0, stars - def.baseStars));
  if (ascended) mult *= 1.2;
  return {
    hp: Math.floor(def.hp * mult),
    atk: Math.floor(def.atk * mult),
    def: Math.floor(def.def * mult),
    spd: def.spd,
  };
}

let cardCounter = 0;
export function newCardId(): string {
  cardCounter += 1;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `card-${Date.now().toString(36)}-${cardCounter}`;
}

export function createCard(unitId: UnitId, stars = UNITS[unitId].baseStars): UnitCard {
  return { id: newCardId(), unitId, stars };
}

// ---------- Gacha ----------

export const GACHA_COST = 1;
export const PACK_SIZE = 10;
export const PACK_COST = GACHA_COST * PACK_SIZE;
export const STARTING_GOLD = 10;

// Ordered rarest-first so cumulative rolling is straightforward.
export const ROLL_RATES: { stars: number; rate: number }[] = [
  { stars: 5, rate: 0.01 },
  { stars: 4, rate: 0.05 },
  { stars: 3, rate: 0.15 },
  { stars: 2, rate: 0.3 },
  { stars: 1, rate: 0.49 },
];

export function rollRarity(
  rand: () => number = Math.random,
  maxStars = 5,
  rates: { stars: number; rate: number }[] = ROLL_RATES,
): number {
  const capped = rates.filter((r) => r.stars <= maxStars);
  const total = capped.reduce((sum, r) => sum + r.rate, 0);
  const r = rand() * total;
  let acc = 0;
  for (const { stars, rate } of capped) {
    acc += rate;
    if (r < acc) return stars;
  }
  return capped.length > 0 ? capped[capped.length - 1].stars : 1;
}

export function unitsOfRarity(stars: number): UnitDef[] {
  return UNIT_LIST.filter((d) => d.baseStars === stars);
}

export function rollCard(
  rand: () => number = Math.random,
  maxStars = 5,
  rates: { stars: number; rate: number }[] = ROLL_RATES,
): UnitCard {
  const stars = rollRarity(rand, maxStars, rates);
  const pool = unitsOfRarity(stars);
  const def = pool[Math.floor(rand() * pool.length)];
  return createCard(def.id, def.baseStars);
}

// ---------- Promotion ----------

import type { ResourceId } from "./gameData";

export interface PromotionCost {
  copies: number;
  resources: { resource: ResourceId; amount: number }[];
}

export const PROMOTION_COSTS: Record<number, PromotionCost> = {
  2: { copies: 1, resources: [] },
  3: { copies: 1, resources: [] },
  4: { copies: 1, resources: [] },
  5: { copies: 1, resources: [] },
  6: { copies: 1, resources: [{ resource: "preparedMeal", amount: 5 }] },
  7: { copies: 2, resources: [{ resource: "cloth", amount: 5 }] },
  8: { copies: 3, resources: [{ resource: "steelTools", amount: 3 }] },
  9: { copies: 4, resources: [{ resource: "enchantedGear", amount: 2 }] },
  10: {
    copies: 5,
    resources: [
      { resource: "preparedMeal", amount: 10 },
      { resource: "cloth", amount: 10 },
      { resource: "steelTools", amount: 5 },
      { resource: "enchantedGear", amount: 3 },
      { resource: "starstone", amount: 1 },
    ],
  },
};

export function getPromotionCost(targetStars: number): PromotionCost | null {
  return PROMOTION_COSTS[targetStars] ?? null;
}

export function canPromote(
  card: UnitCard,
  allCards: UnitCard[],
  resources: Partial<Record<ResourceId, number>>,
): boolean {
  if (card.stars >= MAX_STARS) return false;
  const cost = PROMOTION_COSTS[card.stars + 1];
  if (!cost) return false;
  const copies = allCards.filter((c) => c.id !== card.id && c.unitId === card.unitId);
  if (copies.length < cost.copies) return false;
  for (const { resource, amount } of cost.resources) {
    if ((resources[resource] ?? 0) < amount) return false;
  }
  return true;
}

export function promoteCard(card: UnitCard): UnitCard {
  const newStars = card.stars + 1;
  return {
    id: card.id,
    unitId: card.unitId,
    stars: newStars,
    ...(newStars >= MAX_STARS ? { ascended: true } : {}),
  };
}

// ---------- Story regions ----------

export interface StoryRegion {
  name: string;
  faction: Faction;
  flavor: string;
  bossLine: string;
}

export const STORY_REGIONS: StoryRegion[] = [
  {
    name: "The Overgrowth",
    faction: "ranger",
    flavor: "Ancient forest reclaiming the ruins of a forgotten age.",
    bossLine: "The forest rejects you. A horn of light pierces the canopy.",
  },
  {
    name: "The Steppes",
    faction: "barbarian",
    flavor: "Open plains where warbands roam unchecked.",
    bossLine: "The earth shakes. The warbands scatter. The Behemoth has come.",
  },
  {
    name: "The Underhalls",
    faction: "demon",
    flavor: "Collapsed mines and volcanic vents seething with fiends.",
    bossLine: "Sulphur and ash choke the tunnels. Something ancient stirs below.",
  },
  {
    name: "The Drowned Coast",
    faction: "necromancer",
    flavor: "Flooded ruins where the dead refuse to rest.",
    bossLine: "The tide pulls back. Bones rise from the silt in a shape too vast to name.",
  },
  {
    name: "The Fallen Citadel",
    faction: "wizard",
    flavor: "A ruined tower still crackling with arcane energy.",
    bossLine: "The walls hum. The Titan wakes from its long watch.",
  },
  {
    name: "The Final March",
    faction: "knight",
    flavor: "Your own people's greatest warriors stand as the last test.",
    bossLine: "The Champion raises a banner. Only the worthy may pass.",
  },
];

export const STORY_FLAVOR: string[] = [
  "Scouts report movement in the undergrowth.",
  "The canopy thickens. Shapes flit between the trees.",
  "Roots choke the old road. You push through by force.",
  "A glade opens up — but it's not empty.",
  "Dust devils race across the dry grass.",
  "A warband's camp, still smouldering.",
  "Bone totems line the trail. A warning.",
  "The drums grow louder.",
  "The mine entrance yawns open, heat pouring out.",
  "Claw marks score the tunnel walls.",
  "A forge still burns in the dark. Someone tends it.",
  "The air tastes of iron and brimstone.",
  "Saltwater seeps through crumbling walls.",
  "The tide leaves things behind that should stay buried.",
  "A bell tolls from a sunken tower.",
  "The dead here remember who they were.",
  "Runes flicker on broken stone. The wards are failing.",
  "Books lie open on the floor, pages still turning.",
  "Golems stand in rows, waiting for a command.",
  "The tower hums louder as you climb.",
  "Steel gleams in formation. They were expecting you.",
  "Old banners hang in the hall. These are your people's heroes.",
  "The proving grounds. No quarter given.",
  "The Champion's challenge: defeat the greatest of your own.",
];

export function regionForLevel(level: number): StoryRegion {
  const idx = Math.min(STORY_REGIONS.length - 1, Math.floor((level - 1) / BOSS_EVERY));
  return STORY_REGIONS[idx];
}

export function flavorForLevel(level: number): string {
  return STORY_FLAVOR[Math.min(level - 1, STORY_FLAVOR.length - 1)];
}

// ---------- Enemy encounters ----------

export interface Encounter {
  faction: Faction;
  cards: UnitCard[];
  /** Card id of the boss in a story boss encounter. */
  bossId?: string;
  /** Flat multiplier on enemy HP/ATK/DEF (The Depths). Defaults to 1. */
  statMult?: number;
}

export const PARTY_SIZE = 5;
export const MAX_ENEMY_LEVEL = 30;
export const ULT_EVERY_TURNS = 3;
export const ULT_DAMAGE_MULT = 2;

/** Per-attack-type ultimate damage multipliers. */
export const ULT_MULT: Record<AttackType, number> = {
  melee: 3,
  ranged: 2,
  magic: 1.25,
};

/** Player-facing names describe existing ultimate mechanics. */
export const ULTIMATES: Record<AttackType, { name: string; short: string; description: string }> = {
  melee: { name: "Crushing Blow", short: `Melee · ${ULT_MULT.melee}× · single target`, description: `Melee deals ${ULT_MULT.melee}× damage to one enemy, targeting the front row first.` },
  ranged: { name: "Volley", short: `Ranged · ${ULT_MULT.ranged}× · back row`, description: `Ranged deals ${ULT_MULT.ranged}× damage to every living back-row enemy, or every living front-row enemy if the back row is empty.` },
  magic: { name: "Arcane Burst", short: `Magic · ${ULT_MULT.magic}× · all enemies`, description: `Magic deals ${ULT_MULT.magic}× damage to every living enemy.` },
};

export function enemyCountForLevel(level: number): number {
  if (level <= 2) return 1;
  if (level <= 5) return 2;
  if (level <= 10) return 3;
  if (level <= 19) return 4;
  return 5;
}

export function maxRarityForLevel(level: number): number {
  return Math.min(5, 1 + Math.floor((level - 1) / 3));
}

export function bonusStarsForLevel(level: number): number {
  return Math.floor((level - 1) / 5);
}

export function generateEncounter(level: number, rand: () => number = Math.random): Encounter {
  const region = regionForLevel(level);
  const faction = region.faction;
  const count = enemyCountForLevel(level);
  const maxRarity = maxRarityForLevel(level);
  const bonus = bonusStarsForLevel(level);

  const factionUnits = UNIT_LIST.filter((d) => d.faction === faction && d.baseStars <= maxRarity);
  const cards: UnitCard[] = [];
  for (let i = 0; i < count; i++) {
    const def = factionUnits[Math.floor(rand() * factionUnits.length)];
    cards.push({
      id: `enemy-${i}`,
      unitId: def.id,
      stars: Math.min(MAX_STARS, def.baseStars + bonus),
    });
  }
  return { faction, cards };
}

// ---------- Main story: bosses every 5 levels ----------

export const BOSS_EVERY = 5;
export const ASCENDANT_BOSS_FROM = 4;
export const BOSS_ARMY_MULT = 1.3;

export function isBossLevel(level: number): boolean {
  return level > 0 && level % BOSS_EVERY === 0;
}

/** Level 5 boss is 5★, level 10 is 6★, … level 30 is 10★. */
export function bossStarsForLevel(level: number): number {
  return Math.min(MAX_STARS, 4 + Math.floor(level / BOSS_EVERY));
}

export function generateBossEncounter(level: number, rand: () => number = Math.random): Encounter {
  const k = Math.floor(level / BOSS_EVERY);
  const region = regionForLevel(level);
  const faction = region.faction;
  const stars = bossStarsForLevel(level);
  const ascendant = k >= ASCENDANT_BOSS_FROM;
  const pool = UNIT_LIST.filter(
    (d) => d.faction === faction && d.baseStars === 5 && d.traits.includes("ascendant") === ascendant,
  );
  const bossDef = pool[Math.floor(rand() * pool.length)];
  const boss: UnitCard = { id: "boss", unitId: bossDef.id, stars };
  const minionCount = Math.min(4, 1 + k);
  const minionLevel = Math.max(1, level - 4);
  const minionMaxRarity = maxRarityForLevel(minionLevel);
  const minionBonus = bonusStarsForLevel(minionLevel);
  const minionPool = UNIT_LIST.filter((d) => d.faction === faction && d.baseStars <= minionMaxRarity);
  const minions: UnitCard[] = [];
  for (let i = 0; i < minionCount; i++) {
    const def = minionPool[Math.floor(rand() * minionPool.length)];
    minions.push({
      id: `minion-${i}`,
      unitId: def.id,
      stars: Math.min(MAX_STARS, def.baseStars + minionBonus),
    });
  }
  return {
    faction,
    cards: [boss, ...minions],
    bossId: boss.id,
    statMult: BOSS_ARMY_MULT,
  };
}

export function generateStoryEncounter(level: number, rand: () => number = Math.random): Encounter {
  return isBossLevel(level) ? generateBossEncounter(level, rand) : generateEncounter(level, rand);
}

// ---------- The Depths: endless, gently scaling, auto-grindable ----------

/**
 * Per-depth growth of enemy strength. One star merge (×1.4) is worth about four
 * to five depths, so an upgrade typically clears a burst of levels before the next stall.
 */
export const DEPTHS_SCALE = 1.08;
/** Strength of one enemy at depth 1 — a single 1-star unit. */
export const DEPTHS_BASE_STRENGTH = 21;

/** A linear "how much unit is this" score: scaling stats by k scales this by k. */
export function unitStrength(def: UnitDef): number {
  return def.hp + 5 * def.atk + 3 * def.def;
}

export function depthsTargetStrength(depth: number): number {
  return DEPTHS_BASE_STRENGTH * Math.pow(DEPTHS_SCALE, depth - 1);
}

export function depthsEnemyCount(depth: number): number {
  if (depth <= 2) return 1;
  if (depth <= 5) return 2;
  if (depth <= 12) return 3;
  if (depth <= 24) return 4;
  return 5;
}

/** Rarer units appear deeper for variety; their stats are normalised so this is flavour, not difficulty. */
export function depthsMaxRarity(depth: number): number {
  return Math.min(5, 1 + Math.floor((depth - 1) / 8));
}

/** Total strength of an encounter's army after its stat multiplier. */
export function encounterStrength(encounter: Encounter): number {
  const mult = encounter.statMult ?? 1;
  return encounter.cards.reduce((sum, c) => {
    const def = UNITS[c.unitId];
    const starMult = Math.pow(STAR_STAT_MULT, Math.max(0, c.stars - def.baseStars));
    return sum + unitStrength(def) * starMult * mult;
  }, 0);
}

export function generateDepthsEncounter(depth: number, rand: () => number = Math.random): Encounter {
  const count = depthsEnemyCount(depth);
  const maxRarity = depthsMaxRarity(depth);
  const eligible = UNIT_LIST.filter((d) => d.baseStars <= maxRarity);
  const cards: UnitCard[] = [];
  let strength = 0;
  for (let i = 0; i < count; i++) {
    const def = eligible[Math.floor(rand() * eligible.length)];
    cards.push({ id: `depth-${i}`, unitId: def.id, stars: def.baseStars });
    strength += unitStrength(def);
  }
  const statMult = (depthsTargetStrength(depth) * count) / strength;
  const faction = UNITS[cards[0].unitId].faction;
  return { faction, cards, statMult };
}

export const DEPTHS_STARSTONE_INTERVAL = 25;
export const DEPTHS_TIER_SIZE = 5;
export const DEPTHS_SPOILS_PER_TIER = 30;
export const DEPTHS_INCOME_INTERVAL_MS = 60_000;

/** Passive War Spoils per minute for the number of depths cleared. */
export function depthsIncomePerMinute(cleared: number): number {
  return DEPTHS_SPOILS_PER_TIER * Math.floor(Math.max(0, cleared) / DEPTHS_TIER_SIZE);
}
