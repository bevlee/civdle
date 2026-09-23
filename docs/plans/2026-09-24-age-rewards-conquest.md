# Age Rewards & Conquest Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give each age a concrete reward (heroes, unlocks), simplify age bonuses to a flat speed-up plus a Renaissance ×2, and add the Conquest skill whose Glory resource is the only currency for 5★-only summons.

**Architecture:** Age data (`AGES` in `gameData.ts`) gains a `reward` block; pure engine functions in `gameEngine.ts` derive summon star cap, combat access and skill unlocks from `ageIndex`. `CivdleGame` (`gameState.svelte.ts`) wires these into gacha methods; Svelte components render them. No save migration (no live players).

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest.

Design: `docs/plans/2026-09-24-age-rewards-conquest-design.md` (amended: no migrations, bonuses reworked, reward text says "4★ hero").

Run tests with: `npx vitest run` (needs `node_modules` + `npx svelte-kit sync` in the worktree).

---

### Task 1: Flat speed-up age bonuses + Renaissance ×2

**Files:** Modify `src/lib/gameData.ts` (AgeDef, AGES), `src/lib/gameEngine.ts:164-178, 345-352`; Test `src/lib/gameEngine.test.ts`.

New bonus shape: `bonus: { flatTime: number; outputMult: number }`.
Bronze/Iron/Medieval: `{ flatTime: 0.2, outputMult: 1 }`; Renaissance: `{ flatTime: 0, outputMult: 2 }`.

```ts
export interface AgeBonus { flatTimeReduction: number; outputMult: number }
export function getAgeBonus(ageIndex: number): AgeBonus {
  let flatTimeReduction = 0, outputMult = 1;
  for (let i = 1; i <= ageIndex; i++) {
    flatTimeReduction += AGES[i].bonus.flatTime;
    outputMult *= AGES[i].bonus.outputMult;
  }
  return { flatTimeReduction, outputMult };
}
```
In `getActionEffects`: add to `effects.flatTimeReduction`, push `formatSeconds` modifier when > 0.

Tests: `getAgeBonus(0..4)` → `{0,1}`, `{0.2,1}`, `{0.4,1}`, `{0.6,1}`, `{0.6,2}`; Bronze woodcutting time is 1.8s and wood is 1. Rewrite existing tests that relied on Bronze ×1.1 output to use foraging's 0.5 Plant Fibres (Stone Age) for fractional rounding, and Renaissance ×2 where a scaled amount is needed.

Commit: `feat: ages give flat speed-ups, Renaissance doubles output`

### Task 2: Age rewards data + engine helpers

**Files:** `src/lib/gameData.ts`, `src/lib/gameEngine.ts`; Test `src/lib/gameEngine.test.ts`.

```ts
export interface AgeReward {
  heroCopies: number;
  maxSummonStars?: number;   // Iron 4, Medieval 5
  unlocksCombat?: boolean;   // Bronze
  unlocksSkill?: SkillId;    // Renaissance -> conquest
}
export const AGE_REWARD_UNIT = "vampire"; // shown to players as "4★ hero"
```
Bronze `{heroCopies:1, unlocksCombat:true}`, Iron `{2, maxSummonStars:4}`, Medieval `{3, maxSummonStars:5}`, Renaissance `{4, unlocksSkill:"conquest"}`; Stone `{heroCopies:0}`.

Engine:
- `getMaxSummonStars(ageIndex)` → highest `maxSummonStars` reached, default 3.
- `isCombatUnlocked(ageIndex)` → any age ≤ index with `unlocksCombat`.
- `advanceAge` appends `heroCopies` × `createCard(AGE_REWARD_UNIT)` to `state.gacha.cards`, then runs `computeUnlocks`.

Tests: star cap per age; combat unlock at 1; advancing Stone→Bronze adds 1 vampire card, Medieval→Renaissance adds 4.

Commit: `feat: ages grant 4★ hero copies and gameplay unlocks`

### Task 3: Conquest skill + Glory

**Files:** `src/lib/gameData.ts` (ResourceId, RESOURCES, SkillCategory `"combat"`, SkillDef `ageRequired?: AgeId`, SKILLS.conquest, SKILL_ORDER), `src/lib/gameEngine.ts` (`computeUnlocks`, `createInitialState`), `src/lib/gameState.svelte.ts` (save fill-in uses same helper); Test `gameEngine.test.ts`.

Recipes (no inputs, `upgrades: []`): Raid Lv0 → 1 glory, Campaign Lv30 → 2, Conquest Lv60 → 3.

Add `export function isSkillUnlockable(def, levels, ageIndex)` checking prereqs + `ageRequired`; use in `computeUnlocks` and initial state (`unlocked = isSkillUnlockable(def, zeroLevels, 0)`).

Tests: conquest locked at start; `advanceAge` into Renaissance unlocks it and reports it; Raid at Renaissance yields 2 Glory (1 × 2).

Commit: `feat: add Conquest skill producing Glory`

### Task 4: Remove forge settlement upgrades

**Files:** `src/lib/settlementData.ts` (drop `warForge`/`masterForge` from id union, record, order; delete `maxSummonStars`), `src/lib/gameState.svelte.ts` (`#maxSummonStars` → `getMaxSummonStars(ageIndex)`).

Commit: `refactor: summon star cap comes from ages, not forges`

### Task 5: Glory-priced legendary summons

**Files:** `src/lib/gameState.svelte.ts`; Test `src/lib/gameState.test.ts`.

```ts
export const LEGENDARY_PACK_COST = 100;   // Glory
export const LEGENDARY_SINGLE_COST = 10;  // Glory
rollLegendary(count: 1 | 10): void // requires Celestial Altar + resources.glory >= cost; spends glory, never gacha.gold
```
Keep `rollLegendaryPack()` as `rollLegendary(10)`; add `rollLegendarySingle()`. Update Celestial Altar description.

Tests: no altar → no-op; altar but <cost glory → no-op even with lots of Tribute; success spends Glory only and adds 5★ cards.

Commit: `feat: 5★-only summons cost Glory`

### Task 6: UI

- `AgeDisplay.svelte`: header shows "-0.6s actions · ×2 resources" (omit zero parts); reward line under the checklist: `Reward: 4★ hero ×N · Unlocks …`; age-up floating text shows the new age's bonus.
- `AgeAdvanceEffect.svelte`: subtitle listing rewards.
- `gameState.svelte.ts` `advanceAgeAction`: event payload `{ ageId, ageName, bonusText, rewardText }` from a shared `describeAgeBonus` / `describeAgeReward` in `gameEngine.ts`.
- `+page.svelte`: Campaign/Abyss tabs show 🔒 and a locked panel "Unlocks in Bronze Age" when `!game.combatUnlocked`.
- `ArmyInventory.svelte` / `CombatView.svelte`: legendary buttons priced in Glory (`✦`), single + pack; star-cap chip tooltip "Advance to Iron/Medieval Age".
- `SkillUnlockModal.svelte`: category label handles `"combat"`.

Verify in the browser via preview (debug panel age select), then commit: `feat: age reward UI, locked combat tabs, Glory summons`.
