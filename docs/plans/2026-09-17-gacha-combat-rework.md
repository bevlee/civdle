# Gacha Combat Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the grid-based combat system with a gacha hero collection + auto-battle system where players roll for heroes, build a 3-hero party, and fight progressively harder goblin enemies for gold.

**Architecture:** Complete rewrite of `combatData.ts` and `combatEngine.ts` with new hero/gacha/battle types. `GachaState` replaces `CombatState` in `GameState`. New `CombatView.svelte` replaces the grid UI with party management, gacha rolling, and auto-battle arena. Combat is always unlocked (no age gate). Remove `CombatGrid.svelte` and `Barracks.svelte`.

**Tech Stack:** SvelteKit 5 (runes: `$state`, `$derived`, `$props`), TypeScript, TailwindCSS 4

---

### Task 1: Rewrite combat data definitions

**Files:**
- Rewrite: `src/lib/combatData.ts`

**Step 1: Write the new combatData.ts**

Replace the entire file with gacha hero/enemy definitions:

- `HeroClass` type: `"warrior" | "monk"`
- `HeroClassDef` with stats: `baseHp/hpPerLevel`, `baseAtk/atkPerLevel`, `baseSpd/spdPerLevel`, `abilityName`
- `HERO_CLASSES` record:
  - Warrior: HP 50+5L, ATK 8+2L, SPD 10+0.3L, ability "Power Strike" (3x damage)
  - Monk: HP 35+3.5L, ATK 5+1.5L, SPD 15+0.5L, ability "Inner Peace" (heal lowest ally)
- `Hero` interface: `id, name, heroClass, level, maxHp, atk, spd`
- `computeHeroStats(heroClass, level)` function
- `createHero(name, heroClass, level)` using `crypto.randomUUID()`
- `HERO_NAMES` array (40 short names)
- `rollGacha()`: random class, level via `Math.pow(Math.random(), 4) * 100` (skewed low), random name
- `EnemyTypeDef` for goblins: HP 10+3E, ATK 1+1E, SPD 4+0.5E
- `generateEnemyParty(enemyLevel)`: 1 goblin at E1-4, 2 at E5-7, 3 at E8-10
- Constants: `MAX_ENEMY_LEVEL=10`, `GACHA_COST=1`, `PARTY_SIZE=3`, `AP_SCALE=10`, `MAX_MANA=100`, `MANA_PER_TURN=20`

**Step 2: Verify no type errors**

Run: `cd /Users/bevan/projects/civdle/.claude/worktrees/gacha-combat-rework-add842 && npx svelte-check 2>&1 | tail -20`

Expected: Errors in other files that still import old types (combatEngine, gameState, etc.) — that's fine, we'll fix those next.

---

### Task 2: Rewrite combat engine

**Files:**
- Rewrite: `src/lib/combatEngine.ts`

**Step 1: Write the new combatEngine.ts**

- `BattleFighter` interface: `id, name, heroClass, level, hp, maxHp, atk, spd, mana, ap, isEnemy, abilityName`
- `BattleLogEntry`: `{ text, type: "attack"|"ability"|"death"|"info" }`
- `BattleState`: `{ fighters, log, status, tick }`
- `GachaState`: `{ gold, heroes, party (string|null)[3], enemyLevel, maxEnemyLevel, battle }`
- `createInitialGachaState()`: returns state with gold=0, empty heroes/party, enemyLevel=1, maxEnemyLevel=1
- `startBattle(heroes, enemies)`: creates BattleState from Hero[] and EnemyHero[]
- `tickBattle(state)`: AP-based auto-battle:
  1. All alive fighters gain `spd * AP_SCALE` AP
  2. Fighters with AP >= 100 act (sorted by AP desc, max 3 actions per fighter per tick)
  3. Each action: gain MANA_PER_TURN if has ability, then:
     - If mana >= MAX_MANA: use ability (warrior=3x attack, monk=heal lowest ally), reset mana
     - Else: basic attack random enemy
  4. Check win (all enemies dead) or loss (all heroes dead)

---

### Task 3: Update GameState and gameEngine

**Files:**
- Modify: `src/lib/gameEngine.ts` (GameState interface, createInitialState)
- Modify: `src/lib/gameData.ts` (remove unit resources)

**Step 1: Update gameData.ts**

Remove from `ResourceId` type: `"unitSwordsman" | "unitSpearman" | "unitArcher"`
Remove those 3 entries from `RESOURCES` record.

**Step 2: Update gameEngine.ts**

- Change import from `CombatState`/`createInitialCombatState` to `GachaState`/`createInitialGachaState`
- In `GameState` interface: replace `combat: CombatState` with `gacha: GachaState`
- In `createInitialState()`: replace `combat: createInitialCombatState()` with `gacha: createInitialGachaState()`

---

### Task 4: Update gameState.svelte.ts

**Files:**
- Modify: `src/lib/gameState.svelte.ts`

**Step 1: Update imports and save migration**

Replace old combatEngine/combatData imports with new ones. In `loadFromStorage()`:
- Remove migration for `parsed.combat`
- Add migration: if `parsed.gacha` missing, create fresh via `createInitialGachaState()`
- If old `parsed.combat?.loot?.warSpoils` exists, migrate to `gacha.gold`
- Ensure starter hero Fred exists in gacha.heroes

**Step 2: Replace combat methods**

Remove: `placeUnitOnGrid`, `removeUnitFromGrid`, `craftBarracksUnit`, `sendWave`, combat loop methods.

Add new methods:
- `rollGachaHero()`: check gold >= GACHA_COST, subtract gold, call `rollGacha()`, add to heroes
- `assignHeroToParty(heroId, slotIndex)`: put hero in party slot
- `removeHeroFromParty(slotIndex)`: clear party slot
- `setEnemyLevel(level)`: set enemy level (capped to maxEnemyLevel)
- `startFight()`: generate enemy party, get party heroes, call `startBattle`, start combat loop
- `#startCombatLoop()` / `#clearCombatLoop()`: tick every 500ms, on win: grant gold=enemyLevel, advance maxEnemyLevel
- `debugGrantGold(amount)`: debug helper

**Step 3: Remove combat-unlocked age gate**

Remove all `combat.unlocked` checks. Combat/gacha is always available.

---

### Task 5: Rewrite CombatView.svelte

**Files:**
- Rewrite: `src/lib/components/CombatView.svelte`

**Step 1: Write new CombatView**

Props: `gacha: GachaState`, action handlers (`onRoll`, `onAssign`, `onRemove`, `onFight`, `onSetLevel`).

Layout (top to bottom):
1. **Header bar**: gold display, enemy level selector (◄/► arrows), Fight button
2. **Battle arena** (visible when battle active): hero fighters (left) vs enemy fighters (right) with HP/mana bars, scrolling battle log (last 15 entries)
3. **Party slots**: 3 slots showing hero name/class/level or "Empty", click to remove
4. **Hero collection**: gacha roll button, scrollable list of all heroes sorted by level desc, "Add" button to assign to first empty party slot, "In Party" badge if assigned

Use Tailwind classes consistent with existing components. Class emojis: warrior=⚔️, monk=🥋. 

---

### Task 6: Update page wiring and cleanup

**Files:**
- Modify: `src/routes/+page.svelte`
- Delete: `src/lib/components/CombatGrid.svelte`
- Delete: `src/lib/components/Barracks.svelte`
- Modify: `src/lib/components/DebugPanel.svelte`

**Step 1: Update +page.svelte**

- Remove combat-unlocked gate for showing Combat tab (always show it)
- Update CombatView props to pass `game.state.gacha` and new action handlers
- Remove old combat prop passing

**Step 2: Delete unused components**

Delete `CombatGrid.svelte` and `Barracks.svelte`.

**Step 3: Update DebugPanel**

Add gacha debug section: grant gold button (input amount), set enemy level.

**Step 4: Ensure starter hero Fred**

In `createInitialGachaState()`, create Fred (warrior L1) and place in party slot 0.

---

### Task 7: Build verification

**Step 1: Type check**

Run: `npx svelte-check`
Expected: No errors

**Step 2: Dev server test**

Run dev server, open browser, verify:
- Combat tab always visible
- Fred in party slot 0
- Can fight level 1 goblins (auto-battle)
- Win grants gold
- Can roll gacha with gold
- Can swap heroes into party
- Enemy levels unlock as you beat them
- Battle log shows actions

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: rework combat into gacha hero auto-battle system"
```
