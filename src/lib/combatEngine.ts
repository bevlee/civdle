import type { UnitId, EnemyId, WaveLaneSpawn } from "./combatData";
import {
  UNITS,
  ENEMIES,
  GRID_LANES,
  GRID_COLUMNS,
  getDamageMultiplier,
} from "./combatData";

export interface PlacedUnit {
  unitId: UnitId;
  hp: number;
  maxHp: number;
}

export interface ActiveEnemy {
  id: number; // unique per wave
  enemyId: EnemyId;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  lane: number;
  position: number; // starts at GRID_COLUMNS, walks toward 0
}

export type GridCell = PlacedUnit | null;

export interface CombatState {
  unlocked: boolean;
  waveNumber: number;
  grid: GridCell[][]; // [lane][column]
  activeWave: {
    enemies: ActiveEnemy[];
    tick: number;
    status: "playing" | "won" | "lost";
  } | null;
  loot: Record<string, number>;
}

export function createInitialCombatState(): CombatState {
  return {
    unlocked: false,
    waveNumber: 1,
    grid: Array.from({ length: GRID_LANES }, () =>
      Array.from({ length: GRID_COLUMNS }, () => null)
    ),
    activeWave: null,
    loot: {},
  };
}

export function placeUnit(
  state: CombatState,
  lane: number,
  col: number,
  unitId: UnitId
): CombatState {
  if (state.activeWave?.status === "playing") return state;
  if (lane < 0 || lane >= GRID_LANES || col < 0 || col >= GRID_COLUMNS)
    return state;
  if (state.grid[lane][col] !== null) return state;
  const def = UNITS[unitId];
  const grid = state.grid.map((r) => [...r]);
  grid[lane][col] = { unitId, hp: def.hp, maxHp: def.hp };
  return { ...state, grid };
}

export function removeUnit(
  state: CombatState,
  lane: number,
  col: number
): { state: CombatState; returned: UnitId | null } {
  if (state.activeWave?.status === "playing")
    return { state, returned: null };
  const unit = state.grid[lane]?.[col];
  if (!unit) return { state, returned: null };
  const undamaged = unit.hp === unit.maxHp;
  const grid = state.grid.map((r) => [...r]);
  grid[lane][col] = null;
  return {
    state: { ...state, grid },
    returned: undamaged ? unit.unitId : null,
  };
}

export function startWave(
  state: CombatState,
  laneSpawns: WaveLaneSpawn[][]
): CombatState {
  if (state.activeWave?.status === "playing") return state;
  let nextId = 0;
  const enemies: ActiveEnemy[] = [];
  for (let lane = 0; lane < GRID_LANES; lane++) {
    const spawns = laneSpawns[lane] ?? [];
    for (let i = 0; i < spawns.length; i++) {
      const s = spawns[i];
      enemies.push({
        id: nextId++,
        enemyId: s.enemyId,
        hp: s.hp,
        maxHp: s.hp,
        atk: s.atk,
        speed: s.speed,
        lane,
        position: GRID_COLUMNS + i * 1.5, // stagger spawns
      });
    }
  }
  return {
    ...state,
    activeWave: { enemies, tick: 0, status: "playing" },
  };
}

export function tickCombat(state: CombatState): CombatState {
  if (!state.activeWave || state.activeWave.status !== "playing") return state;

  let enemies = state.activeWave.enemies.map((e) => ({ ...e }));
  const grid = state.grid.map((r) =>
    r.map((c) => (c ? { ...c } : null))
  );
  const tick = state.activeWave.tick + 1;

  // 1. Enemies move
  for (const enemy of enemies) {
    enemy.position -= enemy.speed;
  }

  // 2. Defending units attack
  for (let lane = 0; lane < GRID_LANES; lane++) {
    for (let col = 0; col < GRID_COLUMNS; col++) {
      const unit = grid[lane][col];
      if (!unit) continue;
      const unitDef = UNITS[unit.unitId];
      const laneEnemies = enemies.filter(
        (e) => e.lane === lane && e.hp > 0
      );
      if (laneEnemies.length === 0) continue;

      let target: ActiveEnemy | undefined;
      if (unitDef.range === "melee") {
        target = laneEnemies.find(
          (e) => e.position <= col + 1.5 && e.position >= col - 0.5
        );
      } else {
        target = laneEnemies.reduce(
          (best, e) => (!best || e.position > best.position ? e : best),
          undefined as ActiveEnemy | undefined
        );
      }

      if (target) {
        const enemyDef = ENEMIES[target.enemyId];
        const mult = getDamageMultiplier(unit.unitId, enemyDef.unitType);
        target.hp -= Math.floor(unitDef.atk * mult);
      }
    }
  }

  // Remove dead enemies
  enemies = enemies.filter((e) => e.hp > 0);

  // 3. Enemies attack defending units
  for (const enemy of enemies) {
    const lane = enemy.lane;
    const col = Math.floor(enemy.position);
    if (col < 0 || col >= GRID_COLUMNS) continue;
    const unit = grid[lane][col];
    if (!unit) continue;
    const enemyDef = ENEMIES[enemy.enemyId];
    const mult = getDamageMultiplier(enemyDef.unitType, unit.unitId);
    unit.hp -= Math.floor(enemy.atk * mult);
    if (unit.hp <= 0) grid[lane][col] = null;
  }

  // 4. Check win/loss
  let status: "playing" | "won" | "lost" = "playing";
  if (enemies.length === 0) {
    status = "won";
  } else if (enemies.some((e) => e.position <= 0)) {
    status = "lost";
  }

  // Loot on win
  let loot = state.loot;
  if (status === "won") {
    loot = { ...loot };
    const waveNum = state.waveNumber;
    loot["warSpoils"] = (loot["warSpoils"] ?? 0) + waveNum;
  }

  return {
    ...state,
    grid,
    activeWave: { enemies, tick, status },
    ...(status === "won"
      ? { waveNumber: state.waveNumber + 1, loot }
      : {}),
  };
}
