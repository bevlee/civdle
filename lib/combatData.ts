export type UnitId = "swordsman" | "spearman" | "archer";
export type EnemyId = "raider" | "pikeman" | "scout";

export interface UnitDef {
  id: UnitId;
  name: string;
  resource: import("./gameData").ResourceId;
  hp: number;
  atk: number;
  range: "melee" | "ranged";
  strongAgainst: UnitId;
  weakAgainst: UnitId;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  unitType: UnitId;
  baseHp: number;
  baseAtk: number;
  baseSpeed: number;
}

export const UNITS: Record<UnitId, UnitDef> = {
  swordsman: {
    id: "swordsman",
    name: "Swordsman",
    resource: "unitSwordsman",
    hp: 25,
    atk: 10,
    range: "melee",
    strongAgainst: "archer",
    weakAgainst: "spearman",
  },
  spearman: {
    id: "spearman",
    name: "Spearman",
    resource: "unitSpearman",
    hp: 20,
    atk: 8,
    range: "melee",
    strongAgainst: "swordsman",
    weakAgainst: "archer",
  },
  archer: {
    id: "archer",
    name: "Archer",
    resource: "unitArcher",
    hp: 12,
    atk: 6,
    range: "ranged",
    strongAgainst: "spearman",
    weakAgainst: "swordsman",
  },
};

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  raider: { id: "raider", name: "Raider", unitType: "swordsman", baseHp: 20, baseAtk: 8, baseSpeed: 0.3 },
  pikeman: { id: "pikeman", name: "Pikeman", unitType: "spearman", baseHp: 16, baseAtk: 6, baseSpeed: 0.2 },
  scout: { id: "scout", name: "Scout", unitType: "archer", baseHp: 10, baseAtk: 10, baseSpeed: 0.5 },
};

// ---------- Barracks recipes ----------

export interface BarracksRecipe {
  unitId: UnitId;
  name: string;
  inputs: { resource: import("./gameData").ResourceId; amount: number }[];
}

export const BARRACKS_RECIPES: BarracksRecipe[] = [
  {
    unitId: "swordsman",
    name: "Swordsman",
    inputs: [
      { resource: "copperBar", amount: 1 },
      { resource: "preparedHides", amount: 1 },
    ],
  },
  {
    unitId: "spearman",
    name: "Spearman",
    inputs: [
      { resource: "planks", amount: 2 },
      { resource: "cordage", amount: 1 },
    ],
  },
  {
    unitId: "archer",
    name: "Archer",
    inputs: [
      { resource: "bow", amount: 1 },
      { resource: "cordage", amount: 1 },
    ],
  },
];

export const GRID_LANES = 3;
export const GRID_COLUMNS = 5;

export const DAMAGE_STRONG = 1.5;
export const DAMAGE_WEAK = 0.75;

export function getDamageMultiplier(attackerType: UnitId, defenderType: UnitId): number {
  const def = UNITS[attackerType];
  if (def.strongAgainst === defenderType) return DAMAGE_STRONG;
  if (def.weakAgainst === defenderType) return DAMAGE_WEAK;
  return 1;
}

export interface WaveLaneSpawn {
  enemyId: EnemyId;
  hp: number;
  atk: number;
  speed: number;
}

export interface WaveDef {
  waveNumber: number;
  lanes: WaveLaneSpawn[][]; // lanes[laneIndex] = array of enemies in that lane
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const ENEMY_IDS: EnemyId[] = ["raider", "pikeman", "scout"];

export function generateWave(waveNumber: number): WaveDef {
  const rand = seededRandom(waveNumber * 7919);
  const hpScale = 1 + waveNumber * 0.15;
  const atkScale = 1 + waveNumber * 0.1;
  const speedBonus = Math.floor(waveNumber / 10) * 0.05;

  const lanes: WaveLaneSpawn[][] = Array.from({ length: GRID_LANES }, () => []);

  // Available enemy types based on wave progression
  const availableEnemies: EnemyId[] = ["raider"];
  if (waveNumber >= 3) availableEnemies.push("pikeman");
  if (waveNumber >= 5) availableEnemies.push("scout");

  // Total enemies: starts at 2, grows with wave
  const totalEnemies = Math.min(2 + Math.floor(waveNumber / 3), GRID_LANES * 3);

  for (let i = 0; i < totalEnemies; i++) {
    const lane = Math.floor(rand() * GRID_LANES);
    const enemyId = availableEnemies[Math.floor(rand() * availableEnemies.length)];
    const base = ENEMIES[enemyId];
    lanes[lane].push({
      enemyId,
      hp: Math.floor(base.baseHp * hpScale),
      atk: Math.floor(base.baseAtk * atkScale),
      speed: Math.min(base.baseSpeed + speedBonus, 1),
    });
  }

  return { waveNumber, lanes };
}
