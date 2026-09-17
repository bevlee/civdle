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
  u("goblin", "Goblin", "barbarian", 1, 5, 2, 1, 11, "melee", ["swarm", "brawler"]),
  u("wolf-rider", "Wolf Rider", "barbarian", 2, 20, 5, 3, 13, "melee", ["assassin", "charger"]),
  u("orc", "Orc", "barbarian", 3, 35, 7, 5, 10, "melee", ["brawler", "striker"]),
  u("ogre", "Ogre", "barbarian", 4, 75, 10, 7, 9, "melee", ["brawler", "tank"]),
  u("ram-rider", "Ram Rider", "barbarian", 4, 55, 9, 6, 10, "melee", ["controller", "disruptor"]),
  u("cyclops", "Cyclops", "barbarian", 5, 100, 15, 10, 10, "ranged", ["artillery", "bruiser"]),
  u("thunderbird", "Thunderbird", "barbarian", 5, 150, 20, 12, 14, "ranged", ["charger", "striker"]),
  u("behemoth", "Behemoth", "barbarian", 5, 300, 30, 18, 9, "melee", ["tank", "disruptor", "ascendant"]),
  // Knight
  u("peasant", "Peasant", "knight", 1, 5, 1, 1, 9, "melee", ["swarm", "defender"]),
  u("archer", "Archer", "knight", 2, 15, 5, 3, 9, "ranged", ["ranger", "artillery"]),
  u("griffin", "Griffin", "knight", 3, 35, 8, 8, 14, "melee", ["defender", "skirmisher"]),
  u("standard-bearer", "Standard Bearer", "knight", 3, 30, 6, 8, 9, "melee", ["support", "defender"]),
  u("swordsman", "Swordsman", "knight", 4, 55, 10, 12, 8, "melee", ["brawler", "defender"]),
  u("monk", "Monk", "knight", 5, 70, 12, 7, 9, "magic", ["support", "sustainer"]),
  u("cavalier", "Cavalier", "knight", 5, 100, 15, 15, 11, "melee", ["charger", "brawler"]),
  u("champion", "Champion", "knight", 5, 130, 20, 20, 12, "melee", ["charger", "executioner", "ascendant"]),
  // Wizard
  u("gremlin", "Gremlin", "wizard", 1, 4, 2, 2, 9, "ranged", ["support", "swarm"]),
  u("stone-golem", "Stone Golem", "wizard", 2, 50, 5, 10, 6, "melee", ["tank", "defender"]),
  u("mage", "Mage", "wizard", 3, 25, 10, 4, 9, "magic", ["ranger", "striker"]),
  u("bilehorn", "Bilehorn", "wizard", 4, 70, 10, 9, 8, "melee", ["bruiser", "disruptor"]),
  u("naga", "Naga", "wizard", 5, 100, 15, 12, 11, "melee", ["brawler", "bruiser"]),
  u("siege-golem", "Siege Golem", "wizard", 5, 110, 12, 12, 7, "ranged", ["tank", "artillery"]),
  u("giant", "Giant", "wizard", 5, 200, 22, 18, 8, "ranged", ["artillery", "executioner"]),
  u("titan", "Titan", "wizard", 5, 300, 30, 24, 11, "magic", ["artillery", "striker", "ascendant"]),
  // Necromancer
  u("skeleton", "Skeleton", "necromancer", 1, 6, 3, 3, 8, "melee", ["swarm", "brawler"]),
  u("zombie", "Zombie", "necromancer", 2, 30, 5, 5, 6, "melee", ["tank", "controller"]),
  u("ghost", "Ghost", "necromancer", 3, 20, 7, 7, 10, "magic", ["skirmisher", "disruptor"]),
  u("blood-acolyte", "Blood Acolyte", "necromancer", 3, 28, 7, 6, 9, "magic", ["sustainer", "support"]),
  u("vampire", "Vampire", "necromancer", 4, 55, 10, 9, 9, "melee", ["assassin", "sustainer"]),
  u("lich", "Lich", "necromancer", 5, 65, 13, 10, 9, "magic", ["ranger", "controller"]),
  u("black-knight", "Black Knight", "necromancer", 5, 120, 18, 15, 9, "melee", ["bruiser", "executioner"]),
  u("bone-dragon", "Bone Dragon", "necromancer", 5, 250, 28, 20, 10, "magic", ["tank", "disruptor", "ascendant"]),
  // Ranger
  u("sprite", "Sprite", "ranger", 1, 3, 2, 2, 12, "magic", ["skirmisher", "swarm"]),
  u("wood-elf", "Wood Elf", "ranger", 2, 15, 6, 3, 9, "ranged", ["ranger", "skirmisher"]),
  u("outrider", "Outrider", "ranger", 2, 18, 5, 4, 12, "melee", ["charger", "skirmisher"]),
  u("dendroid", "Dendroid", "ranger", 3, 55, 7, 13, 6, "melee", ["tank", "controller"]),
  u("pegasus", "Pegasus", "ranger", 4, 40, 9, 9, 12, "melee", ["assassin", "skirmisher"]),
  u("grand-elf", "Grand Elf", "ranger", 5, 60, 13, 9, 9, "ranged", ["ranger", "striker"]),
  u("battle-dwarf", "Battle Dwarf", "ranger", 5, 100, 14, 16, 8, "melee", ["bruiser", "executioner"]),
  u("unicorn", "Unicorn", "ranger", 5, 180, 22, 18, 11, "magic", ["striker", "controller", "ascendant"]),
  // Demon
  u("imp", "Imp", "demon", 1, 5, 3, 2, 10, "ranged", ["swarm", "disruptor"]),
  u("gog", "Gog", "demon", 2, 22, 6, 4, 9, "ranged", ["ranger", "artillery"]),
  u("hell-hound", "Hell Hound", "demon", 3, 30, 9, 6, 12, "melee", ["striker", "charger"]),
  u("demon", "Demon", "demon", 4, 60, 11, 8, 9, "melee", ["brawler", "sustainer"]),
  u("blood-fiend", "Blood Fiend", "demon", 4, 55, 10, 8, 10, "melee", ["sustainer", "bruiser"]),
  u("pit-fiend", "Pit Fiend", "demon", 5, 80, 16, 12, 9, "magic", ["support", "bruiser"]),
  u("efreet", "Efreet", "demon", 5, 110, 19, 13, 11, "magic", ["skirmisher", "striker"]),
  u("devil", "Devil", "demon", 5, 220, 30, 22, 13, "magic", ["assassin", "executioner", "ascendant"]),
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
}

export const MAX_STARS = 10;
export const STAR_STAT_MULT = 1.4;

export interface CardStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export function computeCardStats(unitId: UnitId, stars: number): CardStats {
  const def = UNITS[unitId];
  const mult = Math.pow(STAR_STAT_MULT, Math.max(0, stars - def.baseStars));
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
export const STARTING_GOLD = 10;

// Ordered rarest-first so cumulative rolling is straightforward.
export const ROLL_RATES: { stars: number; rate: number }[] = [
  { stars: 5, rate: 0.01 },
  { stars: 4, rate: 0.05 },
  { stars: 3, rate: 0.15 },
  { stars: 2, rate: 0.3 },
  { stars: 1, rate: 0.49 },
];

export function rollRarity(rand: () => number = Math.random): number {
  const r = rand();
  let acc = 0;
  for (const { stars, rate } of ROLL_RATES) {
    acc += rate;
    if (r < acc) return stars;
  }
  return 1;
}

export function unitsOfRarity(stars: number): UnitDef[] {
  return UNIT_LIST.filter((d) => d.baseStars === stars);
}

export function rollCard(rand: () => number = Math.random): UnitCard {
  const stars = rollRarity(rand);
  const pool = unitsOfRarity(stars);
  const def = pool[Math.floor(rand() * pool.length)];
  return createCard(def.id, def.baseStars);
}

// ---------- Merging ----------

export function canMerge(a: UnitCard, b: UnitCard): boolean {
  return a.id !== b.id && a.unitId === b.unitId && a.stars === b.stars && a.stars < MAX_STARS;
}

export function mergeCards(a: UnitCard, b: UnitCard): UnitCard {
  if (!canMerge(a, b)) throw new Error("Cards cannot be merged");
  return createCard(a.unitId, a.stars + 1);
}

// ---------- Enemy encounters ----------

export type ArchetypeId = "warband" | "volley" | "coven";

export interface ArchetypeDef {
  id: ArchetypeId;
  name: string;
  attackType: AttackType;
  blurb: string;
  strengths: string;
  weakness: string;
  hpMult: number;
  atkMult: number;
  defMult: number;
  spdFlat: number;
  ultEvery: number;
}

export const ENEMY_ARCHETYPES: Record<ArchetypeId, ArchetypeDef> = {
  warband: {
    id: "warband",
    name: "Warband",
    attackType: "melee",
    blurb: "Armoured brutes who hit hard up close.",
    strengths: "+25% HP and DEF",
    weakness: "Slow (−2 SPD). Magic tears through them.",
    hpMult: 1.25,
    atkMult: 1,
    defMult: 1.25,
    spdFlat: -2,
    ultEvery: 3,
  },
  volley: {
    id: "volley",
    name: "Volley",
    attackType: "ranged",
    blurb: "Glass cannons raining arrows and boulders.",
    strengths: "+30% ATK",
    weakness: "Fragile (−25% HP). Melee closes the gap fast.",
    hpMult: 0.75,
    atkMult: 1.3,
    defMult: 1,
    spdFlat: 0,
    ultEvery: 3,
  },
  coven: {
    id: "coven",
    name: "Coven",
    attackType: "magic",
    blurb: "Spellcasters who unleash ultimates twice as often.",
    strengths: "Ultimate every 2nd turn",
    weakness: "Thin robes (−25% DEF). Ranged units pick them off.",
    hpMult: 1,
    atkMult: 1,
    defMult: 0.75,
    spdFlat: 0,
    ultEvery: 2,
  },
};

export const ARCHETYPE_IDS: ArchetypeId[] = ["warband", "volley", "coven"];

export interface Encounter {
  archetype: ArchetypeId;
  cards: UnitCard[];
}

export const PARTY_SIZE = 3;
export const MAX_ENEMY_LEVEL = 30;
export const ULT_EVERY_TURNS = 3;
export const ULT_DAMAGE_MULT = 2;

export function enemyCountForLevel(level: number): number {
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  return 3;
}

export function maxRarityForLevel(level: number): number {
  return Math.min(5, 1 + Math.floor((level - 1) / 3));
}

export function bonusStarsForLevel(level: number): number {
  return Math.floor((level - 1) / 5);
}

export function generateEncounter(level: number, rand: () => number = Math.random): Encounter {
  const archetype = ARCHETYPE_IDS[Math.floor(rand() * ARCHETYPE_IDS.length)];
  const type = ENEMY_ARCHETYPES[archetype].attackType;
  const count = enemyCountForLevel(level);
  const maxRarity = maxRarityForLevel(level);
  const bonus = bonusStarsForLevel(level);

  const eligible = UNIT_LIST.filter((d) => d.baseStars <= maxRarity);
  const typed = eligible.filter((d) => d.attackType === type);
  const typedSlots = Math.min(count, 2);

  const cards: UnitCard[] = [];
  for (let i = 0; i < count; i++) {
    const pool = i < typedSlots ? typed : eligible;
    const def = pool[Math.floor(rand() * pool.length)];
    cards.push({
      id: `enemy-${i}`,
      unitId: def.id,
      stars: Math.min(MAX_STARS, def.baseStars + bonus),
    });
  }
  return { archetype, cards };
}
