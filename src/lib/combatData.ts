export type HeroClass = "warrior" | "monk";

export interface HeroClassDef {
  id: HeroClass;
  name: string;
  emoji: string;
  abilityName: string;
  abilityDescription: string;
  baseHp: number;
  hpPerLevel: number;
  baseAtk: number;
  atkPerLevel: number;
  baseSpd: number;
  spdPerLevel: number;
}

export const HERO_CLASSES: Record<HeroClass, HeroClassDef> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    emoji: "⚔️",
    abilityName: "Power Strike",
    abilityDescription: "Deals 3x damage to one enemy",
    baseHp: 50,
    hpPerLevel: 5,
    baseAtk: 8,
    atkPerLevel: 2,
    baseSpd: 10,
    spdPerLevel: 0.3,
  },
  monk: {
    id: "monk",
    name: "Monk",
    emoji: "🥋",
    abilityName: "Inner Peace",
    abilityDescription: "Heals the most wounded ally",
    baseHp: 35,
    hpPerLevel: 3.5,
    baseAtk: 5,
    atkPerLevel: 1.5,
    baseSpd: 15,
    spdPerLevel: 0.5,
  },
};

export interface Hero {
  id: string;
  name: string;
  heroClass: HeroClass;
  level: number;
  maxHp: number;
  atk: number;
  spd: number;
}

export function computeHeroStats(heroClass: HeroClass, level: number): { maxHp: number; atk: number; spd: number } {
  const def = HERO_CLASSES[heroClass];
  return {
    maxHp: Math.floor(def.baseHp + level * def.hpPerLevel),
    atk: Math.floor(def.baseAtk + level * def.atkPerLevel),
    spd: Math.round((def.baseSpd + level * def.spdPerLevel) * 10) / 10,
  };
}

export function createHero(name: string, heroClass: HeroClass, level: number): Hero {
  const stats = computeHeroStats(heroClass, level);
  return { id: crypto.randomUUID(), name, heroClass, level, ...stats };
}

const HERO_NAMES = [
  "Ada", "Bjorn", "Cael", "Dara", "Elric", "Fynn", "Greta", "Holt",
  "Iris", "Jade", "Kai", "Luna", "Mira", "Nyx", "Otto", "Pax",
  "Quinn", "Ren", "Sol", "Tao", "Uma", "Val", "Wren", "Xia",
  "Yara", "Zeke", "Ash", "Bo", "Cleo", "Dex", "Eve", "Gus",
  "Hal", "Ivy", "Juno", "Kit", "Leo", "Mae", "Ned", "Ora",
];

export function rollGacha(): Hero {
  const heroClass: HeroClass = Math.random() < 0.5 ? "warrior" : "monk";
  const level = Math.max(1, Math.ceil(Math.pow(Math.random(), 4) * 100));
  const name = HERO_NAMES[Math.floor(Math.random() * HERO_NAMES.length)];
  return createHero(name, heroClass, level);
}

export type EnemyType = "goblin";

export interface EnemyTypeDef {
  id: EnemyType;
  name: string;
  emoji: string;
  baseHp: number;
  hpPerLevel: number;
  baseAtk: number;
  atkPerLevel: number;
  baseSpd: number;
  spdPerLevel: number;
}

export const ENEMY_TYPES: Record<EnemyType, EnemyTypeDef> = {
  goblin: {
    id: "goblin",
    name: "Goblin",
    emoji: "👺",
    baseHp: 10,
    hpPerLevel: 3,
    baseAtk: 1,
    atkPerLevel: 1,
    baseSpd: 4,
    spdPerLevel: 0.5,
  },
};

export interface EnemyHero {
  id: string;
  name: string;
  enemyType: EnemyType;
  level: number;
  maxHp: number;
  atk: number;
  spd: number;
}

export function generateEnemyParty(enemyLevel: number): EnemyHero[] {
  const count = enemyLevel <= 4 ? 1 : enemyLevel <= 7 ? 2 : 3;
  const def = ENEMY_TYPES.goblin;
  return Array.from({ length: count }, (_, i) => ({
    id: `enemy-${i}`,
    name: count > 1 ? `${def.name} ${i + 1}` : def.name,
    enemyType: "goblin" as EnemyType,
    level: enemyLevel,
    maxHp: Math.floor(def.baseHp + enemyLevel * def.hpPerLevel),
    atk: Math.floor(def.baseAtk + enemyLevel * def.atkPerLevel),
    spd: Math.round((def.baseSpd + enemyLevel * def.spdPerLevel) * 10) / 10,
  }));
}

export const MAX_ENEMY_LEVEL = 10;
export const GACHA_COST = 1;
export const PARTY_SIZE = 3;
export const AP_SCALE = 10;
export const MAX_MANA = 100;
export const MANA_PER_TURN = 20;
