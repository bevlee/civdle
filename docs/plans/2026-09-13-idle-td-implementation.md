# Idle TD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a PvZ-style tower defense combat mode that unlocks at Bronze Age, with 3 unit types in a rock-paper-scissors triangle, a 3×5 grid, manual wave triggering, and tick-based auto-resolve combat.

**Architecture:** Combat data lives in `lib/combatData.ts`, the tick engine in `lib/combatEngine.ts`, and state/hooks in `lib/useCombatState.ts`. The UI is a `CombatView` component rendered in a new top-level "Combat" tab in `page.tsx`. Unit items are crafted via existing skill recipes and consumed on grid placement.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4

---

### Task 1: Add unit item resources and crafting recipes

**Files:**
- Modify: `lib/gameData.ts`

**Step 1: Add unit resource IDs to the ResourceId type**

Add to the `ResourceId` union:
```typescript
  | "unitSwordsman"
  | "unitSpearman"
  | "unitArcher"
```

**Step 2: Add unit resource names to RESOURCES**

```typescript
  unitSwordsman: { name: "Swordsman" },
  unitSpearman: { name: "Spearman" },
  unitArcher: { name: "Archer" },
```

**Step 3: Add crafting recipes to existing skills**

Add to `smithing.recipes` array:
```typescript
{
  id: "unitSwordsman",
  name: "Swordsman",
  requiredLevel: 5,
  inputs: [
    { resource: "copperBar", amount: 1 },
    { resource: "preparedHides", amount: 1 },
  ],
  outputs: [{ resource: "unitSwordsman", amount: 1, ageRequired: "bronzeAge" }],
},
```

Add to `crafting.recipes` array:
```typescript
{
  id: "unitSpearman",
  name: "Spearman",
  requiredLevel: 5,
  inputs: [
    { resource: "planks", amount: 2 },
    { resource: "cordage", amount: 1 },
  ],
  outputs: [{ resource: "unitSpearman", amount: 1, ageRequired: "bronzeAge" }],
},
```

Add to `carpentry.recipes` array:
```typescript
{
  id: "unitArcher",
  name: "Archer",
  requiredLevel: 15,
  inputs: [
    { resource: "bow", amount: 1 },
    { resource: "cordage", amount: 1 },
  ],
  outputs: [{ resource: "unitArcher", amount: 1, ageRequired: "bronzeAge" }],
},
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 5: Commit**

```bash
git add lib/gameData.ts
git commit -m "feat(combat): add unit item resources and crafting recipes"
```

---

### Task 2: Create combat data definitions

**Files:**
- Create: `lib/combatData.ts`

**Step 1: Write combat data file**

```typescript
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
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add lib/combatData.ts
git commit -m "feat(combat): add unit and enemy data definitions"
```

---

### Task 3: Build wave generator

**Files:**
- Modify: `lib/combatData.ts`

**Step 1: Add wave generation function**

Append to `lib/combatData.ts`:

```typescript
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
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add lib/combatData.ts
git commit -m "feat(combat): add deterministic wave generator"
```

---

### Task 4: Build combat engine

**Files:**
- Create: `lib/combatEngine.ts`

**Step 1: Define combat state types**

```typescript
import { UnitId, EnemyId, UNITS, ENEMIES, GRID_LANES, GRID_COLUMNS, getDamageMultiplier, WaveLaneSpawn } from "./combatData";

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
```

**Step 2: Add unit placement and removal**

```typescript
export function placeUnit(state: CombatState, lane: number, col: number, unitId: UnitId): CombatState {
  if (state.activeWave?.status === "playing") return state;
  if (lane < 0 || lane >= GRID_LANES || col < 0 || col >= GRID_COLUMNS) return state;
  if (state.grid[lane][col] !== null) return state;
  const def = UNITS[unitId];
  const grid = state.grid.map((r) => [...r]);
  grid[lane][col] = { unitId, hp: def.hp, maxHp: def.hp };
  return { ...state, grid };
}

export function removeUnit(state: CombatState, lane: number, col: number): { state: CombatState; returned: UnitId | null } {
  if (state.activeWave?.status === "playing") return { state, returned: null };
  const unit = state.grid[lane]?.[col];
  if (!unit) return { state, returned: null };
  const undamaged = unit.hp === unit.maxHp;
  const grid = state.grid.map((r) => [...r]);
  grid[lane][col] = null;
  return { state: { ...state, grid }, returned: undamaged ? unit.unitId : null };
}
```

**Step 3: Add wave start**

```typescript
export function startWave(state: CombatState, laneSpawns: WaveLaneSpawn[][]): CombatState {
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
  return { ...state, activeWave: { enemies, tick: 0, status: "playing" } };
}
```

**Step 4: Add tick resolution**

```typescript
export function tickCombat(state: CombatState): CombatState {
  if (!state.activeWave || state.activeWave.status !== "playing") return state;

  let enemies = state.activeWave.enemies.map((e) => ({ ...e }));
  const grid = state.grid.map((r) => r.map((c) => (c ? { ...c } : null)));
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
      const laneEnemies = enemies.filter((e) => e.lane === lane && e.hp > 0);
      if (laneEnemies.length === 0) continue;

      let target: ActiveEnemy | undefined;
      if (unitDef.range === "melee") {
        target = laneEnemies.find((e) => e.position <= col + 1.5 && e.position >= col - 0.5);
      } else {
        target = laneEnemies.reduce((best, e) => (!best || e.position > best.position ? e : best), undefined as ActiveEnemy | undefined);
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
    ...(status === "won" ? { waveNumber: state.waveNumber + 1, loot } : {}),
  };
}
```

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 6: Commit**

```bash
git add lib/combatEngine.ts
git commit -m "feat(combat): add combat engine with tick resolution"
```

---

### Task 5: Extend GameState with combat

**Files:**
- Modify: `lib/gameEngine.ts`
- Modify: `lib/useGameState.ts`

**Step 1: Add combatState to GameState**

In `lib/gameEngine.ts`, import and add to `GameState`:

```typescript
import { CombatState, createInitialCombatState } from "./combatEngine";
```

Add to `GameState` interface:
```typescript
combat: CombatState;
```

Add to `createInitialState()` return:
```typescript
combat: createInitialCombatState(),
```

**Step 2: Handle migration in loadFromStorage**

In `lib/useGameState.ts`, import `createInitialCombatState`:

```typescript
import { createInitialCombatState } from "./combatEngine";
```

Add in `loadFromStorage()` after the `activeConsumables` migration:
```typescript
if (!parsed.combat) parsed.combat = createInitialCombatState();
```

**Step 3: Add combat unlock check**

In `lib/useGameState.ts`, in the hydration `useEffect`, after offline processing, check Bronze Age:

```typescript
if (!finalState.combat.unlocked) {
  const lvls = getSkillLevels(finalState);
  const ageIdx = getCurrentAgeIndex(lvls);
  if (ageIdx >= 1) {
    finalState = { ...finalState, combat: { ...finalState.combat, unlocked: true } };
  }
}
```

Also add this check at the end of `applyAction`'s effect in `useGameState.ts` — when a level-up happens, check if Bronze Age was just reached and unlock combat.

**Step 4: Add combat state mutators to useGameState**

Add functions: `placeUnitOnGrid`, `removeUnitFromGrid`, `sendWave`, `combatTick`. These call the pure functions from `combatEngine.ts` and update `state.combat` + `state.resources`.

`placeUnitOnGrid` should also deduct the unit resource from `state.resources`.
`removeUnitFromGrid` should return the unit resource if undamaged.

Export these from the hook.

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 6: Commit**

```bash
git add lib/gameEngine.ts lib/useGameState.ts
git commit -m "feat(combat): integrate combat state into GameState"
```

---

### Task 6: Build CombatGrid component

**Files:**
- Create: `components/CombatGrid.tsx`

**Step 1: Build the 3×5 grid with placement**

The grid renders as a CSS grid. Each cell shows:
- Empty: faint border, "+" icon on hover, click to open unit picker
- Placed unit: colored icon/letter (S/P/A), HP bar below, click to remove
- During combat: enemies render as red tokens at fractional positions overlaid on the grid

Props:
```typescript
{
  grid: GridCell[][];
  enemies: ActiveEnemy[];
  isPlaying: boolean;
  availableUnits: { unitId: UnitId; count: number }[];
  onPlace: (lane: number, col: number, unitId: UnitId) => void;
  onRemove: (lane: number, col: number) => void;
}
```

Use Tailwind grid: `grid grid-cols-5 grid-rows-3`.

Each cell: `aspect-square border border-border rounded relative`.

Units: centered letter badge with HP bar (thin green bar at bottom of cell).

Enemies: absolute-positioned tokens using `left: ${(position / GRID_COLUMNS) * 100}%` within each lane row.

**Step 2: Add unit picker**

When clicking an empty cell, show a small popover/dropdown with the 3 unit types. Gray out any with 0 available. Clicking one calls `onPlace`. Can be a simple absolutely-positioned div — no need for a full modal.

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add components/CombatGrid.tsx
git commit -m "feat(combat): add CombatGrid component with unit placement"
```

---

### Task 7: Build CombatView component

**Files:**
- Create: `components/CombatView.tsx`

**Step 1: Build the combat view wrapper**

Layout:
```
┌──────────────────────────────────────┐
│ Wave 14        [Send Wave]   Loot: 42│  ← header
├──────────────────────────────────────┤
│ Next wave preview (enemy icons/lane) │  ← wave scout
├──────────────────────────────────────┤
│                                      │
│          CombatGrid (3×5)            │  ← grid
│                                      │
├──────────────────────────────────────┤
│ Wave Won! +14 War Spoils             │  ← result banner
└──────────────────────────────────────┘
```

Props:
```typescript
{
  combat: CombatState;
  resources: Partial<Record<ResourceId, number>>;
  ageIndex: number;
  onPlace: (lane: number, col: number, unitId: UnitId) => void;
  onRemove: (lane: number, col: number) => void;
  onSendWave: () => void;
}
```

**Wave preview**: call `generateWave(combat.waveNumber)` and render small enemy type icons per lane.

**Send Wave button**: disabled during active combat. Enabled between waves.

**Result banner**: shown when `activeWave.status` is "won" or "lost". "Wave Won!" in green, "Wave Lost — reinforce and retry" in red.

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add components/CombatView.tsx
git commit -m "feat(combat): add CombatView wrapper component"
```

---

### Task 8: Add Combat tab to page.tsx

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add top-level tab navigation**

Replace the current layout with a top-level tab system. Two tabs:
- **Skills** (default): shows the current skill panel + training view + inventory/shop sidebar
- **Combat**: shows the CombatView component + inventory sidebar (no skill panel)

The Combat tab only appears when `state.combat.unlocked` is true.

Use the existing `Tabs` component from `components/ui/tabs.tsx`.

Add a `[activeTab, setActiveTab]` state: `"skills" | "combat"`.

**Step 2: Wire up combat actions from useGameState**

Import and use the combat mutators added in Task 5 (`placeUnitOnGrid`, `removeUnitFromGrid`, `sendWave`).

**Step 3: Type-check and visually verify**

Run: `npx tsc --noEmit`
Start dev server and verify:
- Combat tab does NOT appear on a fresh game (Stone Age)
- Combat tab appears when Bronze Age is reached
- Grid renders correctly as 3×5
- Unit placement works (craft a swordsman in smithing, switch to combat, place it)

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(combat): add Combat tab to main page"
```

---

### Task 9: Wire up battle playback

**Files:**
- Modify: `lib/useGameState.ts`

**Step 1: Add combat tick interval**

Similar to the action scheduling effect, add a `useEffect` that runs a 500ms `setInterval` when `state.combat.activeWave?.status === "playing"`. Each tick calls the `combatTick` function which calls `tickCombat` from the engine and updates state.

```typescript
useEffect(() => {
  if (state.combat.activeWave?.status !== "playing") return;
  const interval = setInterval(() => {
    setState((prev) => {
      const newCombat = tickCombat(prev.combat);
      return { ...prev, combat: newCombat };
    });
  }, 500);
  return () => clearInterval(interval);
}, [state.combat.activeWave?.status]);
```

**Step 2: Verify in browser**

- Place units on the grid
- Click "Send Wave"
- Watch enemies march left, units attack, HP bars update
- Verify win/loss detection works
- Verify wave number increments on win

**Step 3: Commit**

```bash
git add lib/useGameState.ts
git commit -m "feat(combat): add 500ms tick interval for battle playback"
```

---

### Task 10: Combat unlock trigger on Bronze Age

**Files:**
- Modify: `lib/useGameState.ts`

**Step 1: Auto-unlock combat when Bronze Age is reached during gameplay**

In the `handleOutcome` callback (or in the action scheduling effect), after checking for unlocked skills, also check if the age changed and combat should be unlocked:

```typescript
if (!prev.combat.unlocked) {
  const lvls = getSkillLevels(outcome.state);
  const ageIdx = getCurrentAgeIndex(lvls);
  if (ageIdx >= 1) {
    outcome.state = {
      ...outcome.state,
      combat: { ...outcome.state.combat, unlocked: true },
    };
  }
}
```

**Step 2: Verify**

- Start fresh game
- Train mining to level 10 (triggers Bronze Age)
- Verify Combat tab appears

**Step 3: Commit**

```bash
git add lib/useGameState.ts
git commit -m "feat(combat): auto-unlock combat on Bronze Age"
```

---

### Task 11: Final integration test and polish

**Files:**
- All combat files

**Step 1: Full playthrough test**

1. Fresh game → train foraging → unlock woodcutting → train to level 20 → unlock mining
2. Train mining to 10 → Bronze Age reached → Combat tab appears
3. Unlock crafting (woodcutting 10 + mining 10) → craft spearmen
4. Unlock carpentry (woodcutting 20 + crafting 10) → craft bows → craft archers
5. Craft swordsmen in smithing
6. Switch to Combat tab → place units → send wave → watch battle
7. Win wave → loot awarded → wave number increments
8. Lose wave → retry with same wave number
9. Verify save/load preserves combat state

**Step 2: Visual polish**

- Enemy tokens: use colored circles or emoji (⚔️ 🛡️ 🏹) for unit types
- HP bars: red for enemies, green for friendly
- Wave result: add slide-in animation similar to SkillUnlockModal
- Grid cells: subtle background color for occupied cells

**Step 3: Final commit**

```bash
git add .
git commit -m "feat(combat): polish and integration testing"
```
