# Mobile Redesign (Claude Design "Civdle Mobile" 3a) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the phone UI (< 768px, Tailwind `md`) to match option **3a** of the Claude Design file
`Civdle Mobile.dc.html`. Share the parts that also improve desktop, and leave the rest of desktop as it is.

**Architecture:** Game logic stays in `CivdleGame` (`src/lib/gameState.svelte.ts`). New *pure* view helpers
go in `src/lib/view/*.ts` and are unit-tested with vitest. New Svelte components live in
`src/lib/components/mobile/` for phone-only chrome (header, skill picker, action bar, sheets, now-playing
bar). Components shared with desktop (Battle, Town, Achievements) are changed in place and use responsive
classes. `src/routes/+page.svelte` owns tab state and chooses the phone or desktop layout with `md:`.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind 4, bits-ui/shadcn-svelte primitives, vitest.

**Design source:** The bundle is unpacked at
`/private/tmp/claude-501/-Users-bevan-projects-civdle/d15a3ebc-2d51-4317-9eff-2408b12c266c/scratchpad/design/`
(temporary: to recreate it, read the artifact and decode its `__bundler/manifest` + `template` blocks, which are base64+gzip) (`template.html` = markup, `script.js` = the design's view-model, `support.js` =
the Claude Design runtime only, no product content). To view it, run the `design-preview` entry in
`.claude/launch.json`, then open `http://localhost:8765/index.html`. Phone **3a** is the top one. 2b and 1c
are earlier rounds and are background only. The shared link is
https://claude.ai/artifact/CyCGm1fDC9hHqsaADGp55H.

---

## What 3a changes (design → current app)

| Area | Design 3a (phone) | Today (phone) |
|---|---|---|
| Bottom nav | 5 tabs: Train · Battle · Town · Items · Achievements. Green dot = training, amber = battle | 6 tabs: Train · Campaign · Abyss · Town · Items · Awards, 10px labels |
| Header | Age name + "→ Iron · 0/1 ▾" (opens age sheet) and a progress bar. On the right: running skill + Lv + mini bar + ■ stop, or "Idle · Train ›" | AgeDisplay with Tribute and SP stats |
| Tribute / SP | Removed from header. Tribute sits on the Battle tab with an ⓘ hint; SP sits on Town › Shop with an ⓘ hint | In header |
| Skill picker | Two dropdown buttons, **Gathering** and **Production**. One open at a time. It shows the running skill ("● Crafting") and opens a 3-column chip grid (name, level, XP bar, ● when running) with "???" chips for undiscovered skills | Horizontal strip plus "All N" grid |
| Skill detail | Sticky header (name, "Training" badge, Lv x/99, XP bar), description, recipe segmented chips (locked ones show "??? Lv 15"), then a **Uses/Makes** card. Each input row: "−1 · have 131" plus a "Woodcutting ›" jump chip, shown red when you're short. Makes rows show chance and amount owned. Two stat tiles: time and XP per action | Consumes/Produces run-on sentences, Action block mid-page |
| Train button | **Sticky action bar** above the nav: progress bar, recipe name, gain line ("+1 Tools · −1 Wood…"), big button **Train X / Stop · 1.4s / Switch to X / Short on X**. While you view another skill: "Still training Crafting · Tools · Back ›" | Button mid-page |
| Recipe choice | Tapping a recipe only **views** it. Training changes only when you press Train/Switch | `selectRecipe` changes the live recipe immediately |
| Now-playing | On non-Train tabs, a bar ("● Crafting  13m 06s  ■") that opens Train | Nav dot only |
| Battle | Campaign/Abyss segmented control in **one** tab. Tribute chip + ⓘ. Title/sub + Fight. Controls row (Auto, Ⅱ, ½×/1×/2×, sound, Log, ?). Board with YOU/ENEMY synergy chips and Front/Back slot labels. **Pointer drag** from army to slot (works on touch); drag slot→slot to swap and off the board to remove. **Tap a hero for a detail sheet.** Army strip: "Army · 11 ▴  +6 promotable  Summon ›". Expanding it gives a filter grid (Any/1★…5★, Melee/Ranged/Magic, trait chips) | Two tabs; HTML5 drag (desktop only) plus tap-to-select slot; summon buttons inline |
| Summon | "Summon ›" opens a sheet with three banners (Standard / Legendary / Legend Pack). Each shows its lock requirements with "Settlement ›" jumps, an odds bar chart (star tiers the age hasn't reached show "🔒 Unlocks in the Iron Age"), costs ("Save 10"), ×1/×10 buttons, and results inline ("Best · 4★ Vampire", NEW badges) | Buttons in ArmyInventory, rates toggle |
| Town | Segmented **Shop \| Settlement**. Shop = skill upgrades moved here from the Items sidebar, grouped per skill ("Crafting · Lv 12 2/3"). Settlement = summon-odds bars + "Abyss tribute ×1", then buildings grouped **Ready to build / Gathering materials (top 2, "Show N more") / Built**. Cost chips show have/need, and a short one jumps to the skill that makes it | Settlement list only; Shop is in Items |
| Items | Inventory only, same sections | Inventory \| Shop tabs |
| Achievements | Done/total + bar, filter chips with counts (All, Skills, Resources, Ages, Army, Combat, Misc), skill-milestone grid including "???" undiscovered rows, sections sorted done → in-progress → secret | Similar data, no filters |
| Popups | **One overlay at a time.** New skill = bottom sheet with **Later** / **Start crafting Tools**. Achievements queue behind it, then show as **one grouped toast** ("🏆 3 achievements unlocked … ›") that opens Achievements. **Gains never float**: they go in the action bar. Level-ups stay small | SkillUnlockModal, stacked achievement toasts, floating GainToastStack |
| Age sheet | Bottom sheet: Next age, Requirements, Reward, button (Locked / Advance) | AgeDisplay popover |

## Desktop impact: decisions (all six recommendations confirmed by the user, 2026-09-29)

1. **Merge Campaign + Abyss into one "Battle" tab on desktop too.** `CombatView` already takes a
   `mode`, so this means one tab and one segmented control. It is simpler and keeps phone and desktop the same.
   *Recommended: yes.*
2. **Move Shop into Town on desktop too**, so the right sidebar becomes Inventory only (no tabs). SP lives
   next to what it buys. *Recommended: yes.*
3. **Viewed vs active recipe applies to both layouts.** Tapping a recipe mid-training currently swaps the
   running recipe, which is surprising on desktop too. *Recommended: yes.*
4. **Pointer drag + tap-for-details applies to both.** HTML5 DnD doesn't fire on touch, and one code path is
   easier to maintain. Desktop tap opens the existing `CardDetailModal` as a dialog instead of a sheet.
   This drops tap-slot-then-tap-card placement. *Recommended: yes*, but it changes a desktop habit.
5. **Summon sheet on phone, dialog on desktop**, both built from one `SummonPanel` component.
6. **Popup rules apply to both.** Queue overlays, group achievements, and the new-skill sheet gets
   Start/Later. **Floating gain toasts stay on desktop** (there's no action bar there) and are hidden
   below `md`.
7. **Phone only:** new header, Gathering/Production picker, sticky action bar, now-playing bar, bottom sheets.
   Desktop keeps AgeDisplay (Tribute/SP stay in its header), the left SkillPanel and the in-page Train button.
8. **Skill grouping:** `SkillCategory` has `gathering | crafting | combat`. The design files Conquest
   (`combat`) under **Production**. *Recommended:* map `crafting`+`combat` → "Production".

## Correctness notes found while planning

- **Summon odds.** When the age caps star tiers, the design adds the capped tiers' odds to the top tier.
  The engine (`rollRarity`, `src/lib/combatData.ts:234`) instead **renormalises** the remaining tiers
  proportionally. The UI must display what the engine does (see Task 5), not what the mockup shows.
- **Settlement buildings** have `prereqs` and `requires` chains, which the mockup ignores. A building
  whose prereq isn't met must not show as "Ready to build". It gets its own "Locked" reason (Task 6).
- **Party swaps** already exist (`movePartyCard` in `src/lib/party.ts`, `game.assignCardToParty`,
  `game.removeFromParty`). The drag work is UI only.

---

## Phase 0: Setup

### Task 0: Worktree and baseline

**Step 1:** Create a worktree/branch `feat/mobile-3a` (superpowers:using-git-worktrees).
**Step 2:** Run `npm test` and `npm run check`, and record the baseline. Both should pass on `main`.
**Step 3:** Create `src/lib/view/` (pure helpers) and `src/lib/components/mobile/`.

---

## Phase 1: Pure view helpers (TDD, no UI yet)

Each helper gets a `*.test.ts` next to it. Run tests with `npx vitest run src/lib/view/<file>.test.ts`.

### Task 1: Skill groups for the picker

**Files:** Create `src/lib/view/skillGroups.ts` and `src/lib/view/skillGroups.test.ts`

**Step 1: Failing test**
```ts
import { describe, expect, it } from "vitest";
import { skillGroups } from "./skillGroups";
import { createInitialState } from "$lib/gameEngine"; // use whatever gameEngine.test.ts uses to build a fresh state

describe("skillGroups", () => {
  it("splits skills into Gathering and Production, locked ones as placeholders", () => {
    const state = createInitialState();
    const groups = skillGroups(state);
    expect(groups.map((g) => g.label)).toEqual(["Gathering", "Production"]);
    const gathering = groups[0];
    expect(gathering.skills.some((s) => s.id === "foraging" && s.unlocked)).toBe(true);
    // conquest (category "combat") is filed under Production, locked at start
    expect(groups[1].skills.find((s) => s.id === "conquest")?.unlocked).toBe(false);
  });

  it("keeps SKILL_ORDER inside each group, unlocked first", () => {
    const groups = skillGroups(createInitialState());
    for (const g of groups) {
      const firstLocked = g.skills.findIndex((s) => !s.unlocked);
      if (firstLocked >= 0) expect(g.skills.slice(firstLocked).every((s) => !s.unlocked)).toBe(true);
    }
  });
});
```
**Step 2:** Run it. Expected: FAIL (module not found).

**Step 3: Implement**
```ts
import { SKILL_ORDER, SKILLS, type SkillId } from "$lib/gameData";
import type { GameState } from "$lib/gameEngine";

export type SkillGroupLabel = "Gathering" | "Production";
export interface SkillChip { id: SkillId; unlocked: boolean }
export interface SkillGroup { label: SkillGroupLabel; skills: SkillChip[] }

export const groupOf = (id: SkillId): SkillGroupLabel =>
  SKILLS[id].category === "gathering" ? "Gathering" : "Production";

export function skillGroups(state: GameState): SkillGroup[] {
  return (["Gathering", "Production"] as const).map((label) => {
    const ids = SKILL_ORDER.filter((id) => groupOf(id) === label);
    const chips = ids.map((id) => ({ id, unlocked: state.skills[id].unlocked }));
    return { label, skills: [...chips.filter((c) => c.unlocked), ...chips.filter((c) => !c.unlocked)] };
  });
}
```
**Step 4:** Run it. Expected: PASS. **Step 5:** Commit `feat(view): group skills for the phone picker`.

### Task 2: Resource source lookup (for "Woodcutting ›" and Town cost jumps)

**Files:** Create `src/lib/view/resourceSource.ts` and its test.
First run `grep -rn "sourceOf\|producedBy" src/lib`. If such a helper already exists, reuse it and skip this task.

Test cases:
- `resourceSource("wood")` → `{ skillId: "woodcutting", recipeId: <first recipe with a wood output> }`.
- A resource nothing produces → `null`.
- Prefer the lowest `requiredLevel` recipe when several produce it.

Implementation: loop over `SKILL_ORDER`, then `SKILLS[id].recipes`, and match `outputs.some(o => o.resource === r)`.
Cache the result in a `Map` at module load. Commit.

### Task 3: Action-bar state

**Files:** Create `src/lib/view/actionBar.ts` and its test.

```ts
export type ActionBarState =
  | { kind: "stop"; label: string }           // viewing the running skill+recipe
  | { kind: "short"; label: string; sub: string } // missing an input
  | { kind: "switch"; label: string; sub: string } // something else is running
  | { kind: "train"; label: string; sub: string };

export function actionBarState(args: {
  viewedSkill: SkillId; viewedRecipeId: string;
  activeSkill: SkillId | null; activeRecipeId: string | null;
  resources: Partial<Record<ResourceId, number>>;
  secondsLeft: number; timeText: string; xpText: string;
}): ActionBarState
```
Tests (one each):
1. Viewed recipe equals the active one → `stop`, label `Stop · 1.4s`.
2. The recipe's first input is short → `short`, label `Short on Wood`, sub `Needs 1 Wood`.
3. Another skill is active and inputs are OK → `switch`, label `Switch to Tools`.
4. Idle → `train`, label `Train Tools`, sub `2.60s · +9 XP`.
5. Same skill but a *different* viewed recipe → `switch` (not `stop`).

Also export `stillTrainingLine(activeSkill, activeRecipeName)` → `"Crafting · Tools"` for the "Still training … Back ›" row. Commit.

### Task 4: Viewed recipe separate from active recipe (game-state change)

**Files:** Modify `src/lib/gameState.svelte.ts` (`startTraining` around line 573) and test in `src/lib/gameState.test.ts`.

**Step 1: Failing test**
```ts
it("startTraining with a recipe commits that recipe", () => {
  const game = makeGame(); // existing test helper
  game.startTraining("crafting", "cordage");
  expect(game.state.activeSkill).toBe("crafting");
  expect(game.state.skills.crafting.selectedRecipeId).toBe("cordage");
});
it("startTraining without a recipe keeps the selected one (desktop path unchanged)", () => { /* … */ });
```
**Step 3:** Change the signature to `startTraining(skillId: SkillId, recipeId?: string)`. If `recipeId` is given,
also set `selectedRecipeId`, and reset `#progress` when the recipe changed. **Don't** remove `selectRecipe`.
The UI stops calling it while training (Task 9), and keeps a local `viewedRecipe` map instead.
Run `npm test`, then commit.

### Task 5: Summon odds for display

**Files:** Create `src/lib/view/summonOdds.ts` and its test.

```ts
export interface OddsRow { stars: number; pct: number; lockedUntil?: string }
/** Mirrors rollRarity: tiers above maxStars are dropped and the rest renormalised. */
export function displayOdds(rates: RollRate[], maxStars: number, ageNameForStars: (s: number) => string): OddsRow[]
```
Tests:
- `BASE_RATES`, cap 3 → 5★/4★ get `pct: 0` with `lockedUntil` set. 3★/2★/1★ come out ≈ 16.0/32.3/52.7 (15/.93 etc.) and sum to 100.
- Cap 5 → the percentages equal the rates ×100.
- **Cross-check:** run `rollRarity` with a seeded rand 100k times at cap 3. The frequencies land within ±0.5% of `displayOdds`. This guards against drift if the engine changes.

Commit.

### Task 6: Settlement grouping

**Files:** Create `src/lib/view/settlementGroups.ts` and its test.

```ts
export interface BuildingView {
  id: SettlementUpgradeId; built: boolean; ready: boolean;
  lockedReason?: string;         // unmet prereq / `requires` chain
  met: number;                   // 0..1 mean of min(have/need,1)
  cost: { resource: ResourceId; have: number; need: number; short: boolean }[];
}
export function settlementGroups(state: GameState, levels: Record<SkillId, number>): {
  ready: BuildingView[]; gathering: BuildingView[]; locked: BuildingView[]; built: BuildingView[];
}
```
Tests: a built building goes in `built`. All costs met with prereqs met → `ready`. Costs met but `requires` not
built → `locked` (never `ready`). `gathering` is sorted by `met` descending. Get the purchase rules from
`buySettlementUpgradeAction` (`gameState.svelte.ts:794`) and put them in one helper that both call. The
UI must never show "Build" for something the action would refuse. Commit.

### Task 7: Achievement filters and ordering

**Files:** Create `src/lib/view/achievementList.ts` and its test (built on `src/lib/achievements.ts`).

Returns `{ done, total, filters: {id,label,count}[], sections: {category,label,items}[] }`. Test:
- The counts per category include skill milestones under "skills".
- Sort order within a section: unlocked, then in-progress (by progress desc), then hidden/secret last.
- Hidden and not unlocked → name `???`, no progress bar.

Commit.

### Task 8: Overlay queue (one overlay at a time)

**Files:** Create `src/lib/view/overlayQueue.svelte.ts` and its test.

Priority: `skillUnlock` sheet > `ageAdvance` > grouped achievement toast. While a sheet is open, achievement
events accumulate. When the sheet closes, emit **one** toast `{count, names[]}`. Tests drive it with fake
events: 3 achievements during an open sheet → nothing shown, then one grouped toast with count 3 after
close. Achievements with no sheet open → grouped within a 400ms window. Commit.

---

## Phase 2: Phone shell (`< md`). Desktop must be visually unchanged after this phase.

Verify each task with `preview_start civdle-dev` at 390×844 **and** 1280×800. At desktop width, take a
screenshot and compare it with `main`.

### Task 9: Tab model and bottom nav

**Files:** Modify `src/routes/+page.svelte`.

- `CenterTab` becomes `"train" | "battle" | "settlement" | "items" | "achievements"`, with `battleMode: BattleMode`
  as separate state. On mount, map old values (`story`/`depths` → `battle` + mode). Bind `battleMode`
  to `game.state.gacha.battleMode` if it's already persisted there.
- Phone nav: 5 columns, 11–12px labels, 44px min touch target, pill behind the active icon (design: `C.accent`
  pill), dots as today.
- Desktop tab row: the same 5 tabs (decision 1). "Items" stays `lg:hidden`.
- Commit.

### Task 10: Bottom sheet primitive

**Files:** Create `src/lib/components/mobile/BottomSheet.svelte`.
Props: `open`, `onClose`, `title?`, children. It has a dim backdrop (tap to close), slides up
(`translateY(110%)` → 0, 220ms), a drag handle, `max-h-[85dvh]` with scroll, padding for
`env(safe-area-inset-bottom)`, focus trap, and Esc to close. Build it on bits-ui `Dialog` so a11y comes free,
with custom content classes. Every sheet below uses it. Commit.

### Task 11: Phone header

**Files:** Create `src/lib/components/mobile/PhoneHeader.svelte`. In `+page.svelte`, render it `md:hidden`
and wrap `AgeDisplay` in `hidden md:block`.
- Left: age name, "→ {next} · {met}/{total} ▾", and a thin progress bar (from `ageAdvanceStatus`). Tapping opens the age sheet (Task 12).
- Right: when training, a green dot, skill name, a mini XP bar, `Lv n`, and a ■ stop button (44px target). Tapping the name goes to Train with that skill selected and its group open. When idle: "Idle · Train ›".
Commit.

### Task 12: Age sheet

**Files:** Create `src/lib/components/mobile/AgeSheet.svelte`. Reuse the `checklist`/reward logic from
`AgeDisplay.svelte` by moving it into `src/lib/view/ageChecklist.ts`, which both then import (DRY). The button reads
"Advance to Iron Age" when met, and otherwise is disabled with "Not yet — train Smithing" (first unmet item). Commit.

### Task 13: Skill picker (Gathering / Production)

**Files:** Create `src/lib/components/mobile/SkillPicker.svelte`. In `+page.svelte`, replace the
`SkillPanel horizontal` usage on the Train tab.
- It has two buttons. The open one gets an accent background and a rotated ▾. The sub-line "● Crafting" shows when that group has the running skill.
- The open group shows a `grid-cols-3` of chips: name, ● if running, an XP bar and the level. The selected chip is inverted (primary bg).
  Locked chips show `???` and `—` and are disabled.
- Default open group = the selected skill's group. Selecting a skill doesn't auto-collapse (the design keeps it open).
- Delete the `horizontal`/`showAll` branch from `SkillPanel.svelte` once nothing uses it.
Commit.

### Task 14: Train detail redesign (phone)

**Files:** Modify `src/lib/components/TrainingView.svelte`. Keep one component and add a `compact` prop, or
branch with `md:` classes. Don't fork it.
- Sticky skill header (`sticky top-0` inside the scroll area): name, a "Training" badge when active, `Lv n / 99`, XP bar and XP text.
- Recipe chips: 3 columns. Locked ones show "??? / Lv 15". The running one gets a "● Training" sub-line. A tap sets the local
  `viewedRecipe[skill]` and does **not** call `onSelectRecipe` (decision 3; do this on desktop too).
- Uses/Makes card: one row per input with name, `−amt · have N` (red when short) and a jump chip `{SourceSkill} ›`
  (Task 2) that selects the source skill + recipe and opens its group. Makes rows: name, chance (`+25%`), `×amt`, have.
- Two stat tiles: time per action, XP per action.
- Hide the in-page Train/Stop button below `md`, because the action bar replaces it.
Commit.

### Task 15: Sticky action bar

**Files:** Create `src/lib/components/mobile/ActionBar.svelte`. It is rendered in `+page.svelte` between the scroll area and
the nav, on the Train tab only, `md:hidden`.
- It has a progress bar (`game.displayProgress` when viewing the active recipe), recipe name and a sub-line. While training, the sub-line is the
  last gain ("+1 Tools · −1 Wood · −1 Stone", taken from the `gain` events GainToastStack uses today); otherwise it shows
  `actionBarState().sub`. The button styles come from `kind`: primary / red-tinted stop / muted short.
- The "Still training X · Back ›" row shows when `kind === "switch"`.
- Tapping Train/Switch calls `game.startTraining(skill, viewedRecipe)` (Task 4). Stop calls `game.stopTraining()`.
- Hide `GainToastStack` below `md` (decision 6).
Commit.

### Task 16: Now-playing bar

**Files:** Create `src/lib/components/mobile/NowPlaying.svelte`. It shows on non-Train tabs when `activeSkill` is set:
"● {Skill}   {elapsed}   ■". Elapsed needs a `trainingSince` timestamp. **Check first** whether
state has one. If not, add `trainingStartedAt` to the state set in `startTraining` (and default it when loading old saves)
with a test. Tapping opens Train. Commit.

### Task 17: Overlays on phone

**Files:** Modify `SkillUnlockModal.svelte`, `AchievementToasts.svelte` and `+page.svelte`.
- Wire `overlayQueue` (Task 8) into `+page.svelte`.
- SkillUnlockModal: render in `BottomSheet` below `md` (desktop keeps its current placement). Add a
  **"Start {skill} {first recipe}"** primary action and **Later**. Start calls `startTraining(id, recipe)` and switches to Train.
  Remove the `$effect` in `+page.svelte` that force-switches tab/skill on unlock, because the sheet's Start does that now.
- AchievementToasts: one grouped toast, "🏆 N achievements unlocked · names… ›". Tapping it opens the Achievements tab.
  On phone it sits under the header; on desktop it stays top-middle.
Commit.

---

## Phase 3: Battle tab (shared, decisions 1, 4, 5)

### Task 18: Merge Campaign/Abyss into one tab

**Files:** Modify `+page.svelte` and `CombatView.svelte`.
- The top of the tab has a segmented `Campaign | The Abyss`, disabled while `game.inBattle` (the same rule the mockup uses). The
  Tribute chip ("120 TRIBUTE ⓘ") sits next to it, and ⓘ opens a small hint ("Tribute is earned by winning Campaign levels…").
- Keep the locked-before-Bronze empty state.
- Tighten the phone controls row into one line: Auto (Abyss only), Ⅱ, ½×/1×/2×, 🔈, Log, ?.
Commit.

### Task 19: Pointer drag and drop + tap for details

**Files:** Create `src/lib/dragPlace.ts` (a Svelte action), with a test for the pure part. Modify `CombatView.svelte`
and `ArmyInventory.svelte`.
- Pure part `resolveDrop(src, overSlot)`: returns `{assign: [cardId, slot]} | {remove: slot} | null`. Test all
  4 cases: card→slot, slot→slot swap, slot→off-board = remove, card→off-board = nothing.
- Action `use:dragPlace={{ source, onTap, onDrop, locked }}` uses pointer events. It starts a drag after a 6px move, and
  keeps horizontal scrolling in the army strip (if the first movement is mostly horizontal
  in a horizontal strip, scroll instead of dragging, like the mockup's `scrolling` flag). A floating ghost follows the pointer
  with the label "Drop on a slot" / "Place · Front · 2" / "Release to remove". Hit-test with
  `document.elementFromPoint` → `[data-slot]`.
- Remove the HTML5 `ondragover/ondrop` handlers and the tap-select-slot mode.
- Slots show "Front · 2" / "Back · 1" labels under the "+" (layout: even = front).
Commit.

### Task 20: Hero detail sheet

**Files:** Modify `CardDetailModal.svelte` so it renders in `BottomSheet` below `md`.
Contents: portrait, stars, faction · type, HP/ATK/DEF/SPD tiles, trait chips, the placement line
("In party · Front · 2" or "Not in party — drag onto the board to place"), **Remove from party** (disabled in
battle) and **Done**. Keep the existing promote/merge actions. Commit.

### Task 21: Army strip, expanded filter view and "+N promotable"

**Files:** Modify `ArmyInventory.svelte`.
- Collapsed (phone): a single horizontal row of cards (P badge = in party, green + = promotable). Header row
  "Army · 11 ▴", a "+6 promotable" chip, the active filter label with ×, and **Summon ›**.
- Expanded: fills the Battle area above the nav and adds filter rows: stars (Any, 1★…5★ with counts, zero-count
  dimmed), type (All/Melee/Ranged/Magic with counts), and owned trait chips. Empty state: "No heroes match these
  filters · Clear filters". "Drag a hero up to place it · tap for details".
- Desktop keeps its current layout but gets the same filter set (the star filter is new).
Commit.

### Task 22: Summon panel

**Files:** Create `src/lib/components/SummonPanel.svelte`. Move the summon buttons and rates toggle out of
`ArmyInventory.svelte`.
- Banner list: Standard / Legendary / Legend Pack, each with stars and a status (cost or 🔒 Locked).
- Selected banner: title and description. If locked, a requirements checklist: Celestial Altar (`hasCelestialAltar`),
  final age (`legendarySummonsUnlocked`), Hall of Legends (`hasHallOfLegends`), each unmet one with a
  "Settlement ›" jump.
- Odds bars from `displayOdds` (Task 5), showing the source ("via Feast Hall" / "Base rates") and a
  "Improve odds in Settlement ›" link.
- Cost rows and ×1/×10 buttons wired to the existing actions (`roll…`, `rollLegendary`,
  `rollTributeLegendaryPack`). Button text: "Summon ×10 · 90 Tribute" / "Need 90 Tribute".
- Results reuse `SummonReveal`/`PackReveal`, plus a "Best · 4★ Vampire" line and NEW badges.
- Phone: inside `BottomSheet`. Desktop: a bits-ui Dialog.
Commit.

---

## Phase 4: Town, Items, Achievements (shared)

### Task 23: Town = Shop | Settlement

**Files:** Modify `SettlementView.svelte` and `Shop.svelte`, and in `+page.svelte` remove the Shop tab from `itemsPanel`.
- Segmented `Shop | Settlement`, with the choice remembered per session. The SP deep link (header/hint) opens Shop.
- Shop: "Skill points · +1 every skill level-up · {sp}" with ⓘ, and the upgrades grouped by skill ("Crafting · Lv 12 · 2/3"),
  each row showing name, description and an `N SP` / `Owned` button. The Mastery (global) upgrades group stays first.
- Settlement: summon odds bars (`displayOdds` at cap 5, source name), "Abyss tribute ×1/×2", then the groups
  from `settlementGroups` (Task 6): Ready to build, Gathering materials (first 2, "Show N more"), Locked (with the reason),
  Built (n/9). Cost chips are green when met and red when short; a short chip jumps to Train with the source skill + recipe
  viewed (Task 2).
Commit.

### Task 24: Items tab / sidebar

**Files:** Modify `+page.svelte`. `itemsPanel` becomes `<Inventory>` only, with no tab strip, on both phone and the `lg` sidebar
(decision 2). Keep the resource-highlight behaviour. Commit.

### Task 25: Achievements

**Files:** Modify `AchievementsView.svelte` to use `achievementList` (Task 7).
Header "Achievements {done}/{total}" with a bar, then filter chips (horizontal scroll on phone, wrapped on desktop). The Skill
milestones grid lists undiscovered skills as `???` / "Not discovered". Then the sections, with unlock dates for done ones
and progress bars for in-progress ones. Commit.

---

## Phase 5: Verification and cleanup

### Task 26: Cross-layout verification

1. `npm test`: all green, including the new `src/lib/view/*.test.ts`.
2. `npm run check`: 0 errors.
3. `preview_start civdle-dev` at **390×844** (Mobile preset): walk Train (both groups, a locked chip, recipe
   view vs train, short-input jump, Switch/Back), Battle (drag card→slot, slot→slot, slot→off, tap → sheet,
   expand army + filters, summon ×1/×10 with a debug-granted currency via `?debug`), Town (Shop buy, Settlement build,
   short-chip jump), Items, Achievements filters, new-skill sheet (unlock via DebugPanel) and grouped toast.
4. Also check **360×740** (small Android): no horizontal scroll, and every tap target ≥ 44px.
5. **1280×800:** everything in the "Desktop impact" section behaves as decided. The rest matches `main`
   (compare screenshots).
6. Touch: in the `mobile` preset (touch emulation), confirm drag works and that the army strip still scrolls sideways.

### Task 27: Cleanup

Delete dead code: the `SkillPanel` horizontal branch, the tab-switch `$effect` on unlock, HTML5 drag handlers, and the
narrow-only Shop tab. Remove the `design-preview` entry from `.claude/launch.json`. Update
`docs/plans/2026-09-29-mobile-redesign.md` with anything that changed. Commit, then finish the branch
(superpowers:finishing-a-development-branch).

---

## Out of scope / follow-ups (listed in the design's "Try next")

- Mark skills that are short on inputs in the chip grid.
- Long-press a chip to preview it without leaving the current skill.
