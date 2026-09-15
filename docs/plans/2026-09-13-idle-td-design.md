# Idle TD — End-Game Combat Mode

## Overview

A Plants vs Zombies-style tower defense mode that unlocks at Bronze Age. Players craft military units from existing resources, place them on a 3-lane × 5-column grid, and manually trigger waves of enemies. Enemies march right-to-left; if any reaches column 0, the wave is lost. Units are consumed on placement and must be re-crafted between waves.

## Units

Three unit types form a rock-paper-scissors triangle:

| Unit | Beats | Weak To | Skill | Recipe | HP | ATK | Range |
|---|---|---|---|---|---|---|---|
| Swordsman | Archer | Spearman | Smithing | 1 copperBar + 1 preparedHides | 25 | 10 | Melee (adjacent cell) |
| Spearman | Swordsman | Archer | Crafting | 2 planks + 1 cordage | 20 | 8 | Melee (adjacent cell) |
| Archer | Spearman | Swordsman | Carpentry | 1 bow + 1 cordage | 12 | 6 | Ranged (any enemy in lane) |

**Damage multipliers:** 1.5× against the type you beat, 0.75× against the type you're weak to, 1× otherwise.

All unit recipes require Bronze Age to be reached.

## Enemies

Enemy types mirror the player triangle:

| Enemy | Maps To | Base HP | Base ATK | Speed (cells/tick) |
|---|---|---|---|---|
| Raider | Swordsman | 20 | 8 | 0.3 (medium) |
| Pikeman | Spearman | 16 | 6 | 0.2 (slow) |
| Scout | Archer | 10 | 10 | 0.5 (fast) |

**Scaling per wave:**
- HP: `baseHP × (1 + wave × 0.15)`
- ATK: `baseATK × (1 + wave × 0.1)`
- Speed increases slightly every 10 waves

**Wave composition:**
- Waves 1–4: single enemy type, 1 per lane, some lanes empty
- Waves 5–9: mixed types across lanes
- Waves 10+: multiple enemies per lane

Wave composition is deterministic (seeded from wave number). Players can preview the next wave before triggering it.

## Combat Resolution

Tick-based system, one tick every 500ms:

1. **Enemies move** — advance left by their speed value. Enemies occupy fractional positions and enter a cell once they cross the threshold.
2. **Defending units attack** — melee units attack the first enemy in their cell or adjacent right cell. Archers attack the rightmost enemy in their lane. Apply triangle multiplier. Dead enemies removed immediately.
3. **Enemies attack** — enemies sharing a cell with a defending unit attack it. They target the leftmost unit they've reached (stack up behind units like PvZ).
4. **Check win/loss** — all enemies dead = wave won (grant loot); any enemy reaches column 0 = wave lost (surviving placed units persist for retry).

**Between waves:** placed units persist on the grid. Players can rearrange, add more, or remove undamaged units (returned to inventory). Damaged units cannot be recovered.

**Offline:** combat does not run offline. A mid-wave close resumes from the same tick on return.

## Rewards

Waves drop combat-only loot — a separate resource pool from the main idle game. Exact loot types and their uses are TBD; the data model supports an extensible `Record<LootId, number>`.

Loot scales with wave number and wave composition difficulty.

## UI Layout

- **New top-level "Combat" tab** in the header/nav bar (alongside the existing game view), visible once Bronze Age is reached.
- **Wave header:** wave number, "Send Wave" button, preview of next wave (enemy type icons per lane), loot counter.
- **Grid (3×5):** each cell is a placement slot. Empty cells show "+" on hover. Clicking opens a unit picker (grayed out if item not in inventory). Placed units show icon + HP bar. Enemies render as tokens moving left during combat.
- **Battle states:** before wave (grid editable, send button active) → during wave (grid locked, ticks auto-play) → after wave (result + loot summary).
- Skills/inventory/shop remain accessible from the Combat tab.

## Data Model

### New types (gameData.ts)

```typescript
type UnitId = "swordsman" | "spearman" | "archer";
type EnemyId = "raider" | "pikeman" | "scout";
type LootId = string; // TBD

interface UnitDef {
  id: UnitId;
  name: string;
  resource: ResourceId; // the craftable item
  hp: number;
  atk: number;
  range: "melee" | "ranged";
  strongAgainst: UnitId;
  weakAgainst: UnitId;
}

interface EnemyDef {
  id: EnemyId;
  name: string;
  unitType: UnitId; // maps to triangle
  baseHp: number;
  baseAtk: number;
  speed: number; // cells per tick
}
```

### New state (gameEngine.ts / GameState)

```typescript
interface PlacedUnit {
  unitId: UnitId;
  hp: number;
  maxHp: number;
}

interface WaveEnemy {
  enemyId: EnemyId;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  lane: number;
  position: number; // fractional column, starts at 5, walks toward 0
}

interface CombatState {
  unlocked: boolean;
  waveNumber: number;
  grid: (PlacedUnit | null)[][]; // [lane][column], 3×5
  activeWave: {
    enemies: WaveEnemy[];
    tick: number;
    status: "playing" | "won" | "lost";
  } | null;
  loot: Record<string, number>;
}
```

## Implementation Milestones

1. **Data & recipes** — UnitDefs, EnemyDefs, unit item resources, crafting recipes in smithing/crafting/carpentry. Gate recipes behind Bronze Age (`ageRequired`).
2. **Wave generator** — deterministic wave composition from wave number. Enemy scaling formulas. Pure function, testable.
3. **Combat engine** — `tickCombat(state): CombatState` pure function. Move, attack, damage, win/loss. No UI dependency.
4. **Combat tab UI** — new "Combat" tab component. Grid renderer, unit placement picker, wave preview, Send Wave button.
5. **Battle playback** — 500ms tick interval driving the combat engine. HP bars, enemy position animation across cells.
6. **Loot system** — combat-only drops, loot inventory display. Uses TBD.
