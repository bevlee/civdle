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
