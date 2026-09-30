# Mobile 3a Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the issues from the two reviews of `feat/mobile-3a`: close the early 5★ loophole in the Hall of Legends, stop popups stacking over player-opened sheets, make lifting a hero from the expanded phone army discoverable, and tidy four smaller UX and tooling issues.

**Architecture:** The Hall of Legends gets an age requirement in the settlement rules (`settlementPurchaseBlock`, which the buy action and every settlement screen already use). Its pack also requires 5★ summons to be unlocked, which covers old saves where the Hall is already built. Queued popups (new skill, achievements toast) wait on a small shared counter that user-opened sheets and dialogs hold while open. Touch drags in scrolling army lists gain hold-to-lift in `dragPlace`, and the grid's hint moves to the top.

**Tech Stack:** SvelteKit + Svelte 5 runes, TypeScript, Tailwind v4, bits-ui, Vitest (node environment; rune modules tested directly, DOM faked).

**Branch:** `claude/mobile-3a-review-fixes`, created from `feat/mobile-3a` at `2c64324`, in the worktree `.claude/worktrees/tooltip-ui-improvements-d6fb1d`. Merge back into `feat/mobile-3a` when done.

**Baseline:** `npx vitest run` shows 357 passing tests.

**Out of scope (decided):** Abyss income versus the 10× Tribute prices, and scaling old saves' Tribute. Both are fine as they are.

---

### Task 1: Hall of Legends can't be built before the Medieval era

The Hall's materials are all obtainable in the Iron Age: Steel Bar is Iron Bar plus Coal, Bricks come from Construction (an Iron Age skill), and Enchanted Gear is Smithing Lv 60. The Hall then sells guaranteed 5★ heroes a full age before 5★ summons open (Medieval).

**Files:**
- Modify: `src/lib/settlementData.ts` (the `SettlementUpgradeDef` interface near line 17, and the `hallOfLegends` entry near line 135)
- Modify: `src/lib/gameEngine.ts` (`settlementPurchaseBlock`; move `theAge` here)
- Modify: `src/lib/view/summonBanners.ts` (import `theAge` from the engine and re-export it)
- Test: `src/lib/view/settlementGroups.test.ts`

**Step 1: Write the failing test**

In `src/lib/view/settlementGroups.test.ts`, import `AGES` (`import { AGES, type ResourceId } from "../gameData";`). Make `richState()` reach the final age so existing tests keep meaning "everything is available":

```ts
// Enough of every resource any building asks for, in the final age (so no age gate applies).
function richState(): GameState {
  const state = createInitialState();
  state.ageIndex = AGES.length - 1;
  // ...existing resource loop unchanged
```

Add this inside `describe("settlementPurchaseBlock", ...)`:

```ts
  it("locks the Hall of Legends until the Medieval era", () => {
    const state = richState();
    const levels = getSkillLevels(state);
    state.ageIndex = AGES.findIndex((a) => a.id === "ironAge");
    expect(settlementPurchaseBlock(state, levels, "hallOfLegends")).toEqual({
      kind: "locked",
      reason: "Reach the Medieval era",
    });
    state.ageIndex = AGES.findIndex((a) => a.id === "medieval");
    expect(settlementPurchaseBlock(state, levels, "hallOfLegends")).toBeNull();
  });
```

**Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/view/settlementGroups.test.ts`
Expected: FAIL. The Iron Age case returns `null` instead of the lock.

**Step 3: Implement**

`src/lib/settlementData.ts`: change the import to `import type { AgeId, ResourceAmount, SkillId } from "./gameData";` and add to `SettlementUpgradeDef`:

```ts
  /** Age that must be reached before building. */
  ageRequired?: AgeId;
```

In `hallOfLegends`, after `prereqs: [],`:

```ts
    // It sells 5★ heroes, so it waits for the age that opens 5★ summons.
    ageRequired: "medieval",
```

`src/lib/gameEngine.ts`: move `theAge` here from `summonBanners.ts` unchanged (place it next to `getMaxSummonStars`):

```ts
/** An age as it reads after "in" or "Reach": "the Iron Age", "the Medieval era", "the Renaissance". */
export function theAge(name: string): string {
  return /age$/i.test(name) || name === "Renaissance" ? `the ${name}` : `the ${name} era`;
}
```

In `settlementPurchaseBlock`, after the `requires` check and before the `prereqs` check:

```ts
  if (def.ageRequired && state.ageIndex < ageIndexOf(def.ageRequired)) {
    return { kind: "locked", reason: `Reach ${theAge(AGES[ageIndexOf(def.ageRequired)].name)}` };
  }
```

(`ageIndexOf` and `AGES` are already in scope in `gameEngine.ts`.)

`src/lib/view/summonBanners.ts`: delete the local `theAge` and add:

```ts
import { theAge } from "../gameEngine";
export { theAge };
```

`SettlementView.svelte` and `townView.ts` keep importing `theAge` from `summonBanners`.

**Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/view/settlementGroups.test.ts`
Expected: PASS, including "agrees with the buy action for every building".

**Step 5: Run the full suite**

Run: `npx vitest run`
Expected: only the Hall of Legends tests in `src/lib/gameState.test.ts` fail (their `buyHall` helper runs in the Stone Age). Task 2 fixes them.

**Step 6: Commit**

```bash
git add src/lib/settlementData.ts src/lib/gameEngine.ts src/lib/view/summonBanners.ts src/lib/view/settlementGroups.test.ts
git commit -m "fix(game): the Hall of Legends waits for the Medieval era"
```

---

### Task 2: The Tribute 5★ pack needs 5★ summons (covers old saves)

A save that built the Hall before Task 1 keeps it, so the pack itself also checks the summon cap.

**Files:**
- Modify: `src/lib/gameState.svelte.ts` (near `get hasHallOfLegends` and `rollTributeLegendaryPack`, around lines 740–800)
- Test: `src/lib/gameState.test.ts` (`describe("Hall of Legends")`, around line 423)

**Step 1: Write the failing test**

At the top of `describe("Hall of Legends", ...)`:

```ts
  const MEDIEVAL = AGES.findIndex((a) => a.id === "medieval");
  const IRON_AGE = AGES.findIndex((a) => a.id === "ironAge");
```

In `buyHall()`, add `game.state.ageIndex = MEDIEVAL;` as its first line. Then add:

```ts
  it("stays shut before 5★ summons, even with the Hall already built", () => {
    game.state.ageIndex = IRON_AGE;
    game.state.settlementUpgrades = ["hallOfLegends"]; // an old save built it early
    game.state.gacha.gold = TRIBUTE_LEGENDARY_PACK_COST;
    expect(game.tributeLegendaryPackUnlocked).toBe(false);
    game.rollTributeLegendaryPack();
    expect(game.state.gacha.cards).toHaveLength(0);
    expect(game.state.gacha.gold).toBe(TRIBUTE_LEGENDARY_PACK_COST);
  });
```

**Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/gameState.test.ts -t "Hall of Legends"`
Expected: FAIL. `tributeLegendaryPackUnlocked` is undefined and the pack rolls.

**Step 3: Implement**

In `src/lib/gameState.svelte.ts`, after `get hasHallOfLegends()`:

```ts
  /** The Tribute 5★ pack needs the Hall of Legends and an age that summons 5★ heroes. */
  get tributeLegendaryPackUnlocked(): boolean {
    return this.hasHallOfLegends && this.#maxSummonStars >= 5;
  }
```

In `rollTributeLegendaryPack`, replace `!this.hasHallOfLegends` with `!this.tributeLegendaryPackUnlocked`, and update its doc comment to `/** Summon 10 guaranteed 5★ heroes for Tribute. Needs the Hall of Legends and 5★ summons. */`.

**Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/gameState.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/gameState.svelte.ts src/lib/gameState.test.ts
git commit -m "fix(game): the Tribute 5★ pack needs 5★ summons"
```

---

### Task 3: The Legend Pack banner shows the age requirement

**Files:**
- Modify: `src/lib/view/summonBanners.ts` (the `pack` banner)
- Test: `src/lib/view/summonBanners.test.ts`

**Step 1: Update the tests so they fail**

In "locks the legendary banners until their buildings (and the final age) are in", replace the `pack.requirements` expectation with:

```ts
    expect(pack.requirements).toEqual([
      { label: "Build the Hall of Legends", done: false, sub: "Settlement building", settlement: true },
      { label: "Reach the Medieval era", done: false, sub: "Currently in the Iron Age", settlement: false },
    ]);

    // The Hall alone isn't enough before 5★ summons.
    expect(summonBanners({ ...ironAge, hasHallOfLegends: true })[2].locked).toBe(true);
```

In "unlocks them with Glory and Tribute prices", add `maxStars: 5,` to the input.

**Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/view/summonBanners.test.ts`
Expected: FAIL (one requirement instead of two; the Hall-only pack is unlocked).

**Step 3: Implement**

In `summonBanners.ts`, import `ageNameForStars` from `./summonOdds` (it imports only `gameData`, `gameEngine` and a type, so there's no cycle). Inside `summonBanners()`, before `banners`:

```ts
  const fiveStars = input.maxStars >= 5;
```

Replace the pack's `locked` and `requirements`:

```ts
      locked: !(input.hasHallOfLegends && fiveStars),
      requirements: [
        settlementRequirement("hallOfLegends", input.hasHallOfLegends),
        {
          label: `Reach ${theAge(ageNameForStars(5))}`,
          done: fiveStars,
          sub: fiveStars ? "Done" : `Currently in ${theAge(current)}`,
          settlement: false,
        },
      ],
```

**Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/view/summonBanners.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/view/summonBanners.ts src/lib/view/summonBanners.test.ts
git commit -m "feat(ui): Legend Pack banner lists the Medieval requirement"
```

---

### Task 4: Queued popups wait while a player-opened sheet or dialog is open

The Age sheet, summon panel, hero details and combat guide open outside `OverlayQueue`. Training keeps running, so a skill unlock can open a second focus-trapping dialog on top. `+page.svelte` already holds popups during summon reveals (`revealOpen`); this generalises that.

**Files:**
- Create: `src/lib/view/popupHold.svelte.ts`
- Test: `src/lib/view/popupHold.test.ts`
- Modify: `src/lib/components/mobile/AgeSheet.svelte`, `src/lib/components/SummonPanel.svelte`, `src/lib/components/CardDetailModal.svelte`, `src/lib/components/TutorialOverlay.svelte`, `src/routes/+page.svelte` (lines 36–39, 514, 551)

**Step 1: Write the failing test**

`src/lib/view/popupHold.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { holdPopups, popupHold } from "./popupHold.svelte";

describe("popupHold", () => {
  it("holds while any hold is open, and a second release does nothing", () => {
    expect(popupHold.active).toBe(false);
    const releaseA = holdPopups();
    const releaseB = holdPopups();
    expect(popupHold.active).toBe(true);
    releaseA();
    releaseA();
    expect(popupHold.active).toBe(true);
    releaseB();
    expect(popupHold.active).toBe(false);
  });
});
```

**Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/view/popupHold.test.ts`
Expected: FAIL (module not found).

**Step 3: Implement the module**

`src/lib/view/popupHold.svelte.ts`:

```ts
// Queued popups (a new skill, the achievements toast) wait while the player has a sheet
// or dialog of their own open, so two focus-trapping dialogs never stack.

let holds = $state(0);

export const popupHold = {
  get active(): boolean {
    return holds > 0;
  },
};

/** Hold queued popups until the returned function is called (calling it again does nothing). */
export function holdPopups(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
  };
}
```

**Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/view/popupHold.test.ts`
Expected: PASS.

**Step 5: Wire it up**

Each component imports `import { holdPopups } from "$lib/view/popupHold.svelte";` and adds one effect. The release function is the effect's teardown.

- `AgeSheet.svelte`, after `blocker`: `$effect(() => { if (open) return holdPopups(); });`
- `SummonPanel.svelte`, after `let shown = ...` (line 49). Hold on `open`, not `shown`, so the hold lasts through reveals: `$effect(() => { if (open) return holdPopups(); });`
- `CardDetailModal.svelte` (mounted only while shown, via `{#if selectedCard}` in `CombatView.svelte:414`): `$effect(() => holdPopups());`
- `TutorialOverlay.svelte` (mounted only while shown): `$effect(() => holdPopups());`

Do not add it to `SkillUnlockModal`; it is one of the queued popups.

In `src/routes/+page.svelte`, import `popupHold`. Replace the comment and derived at lines 36–39 with:

```ts
  // Summon reveals, and sheets the player opened, are modal too; the queued sheet and
  // toast wait for them to close.
  let revealOpen = $derived(
    game.events.some((e) => e.type === "summon" || e.type === "summonPack" || e.type === "starUp"),
  );
  let popupsWait = $derived(revealOpen || popupHold.active);
```

Change `{#if overlay?.kind === "skillUnlock" && !revealOpen}` to `&& !popupsWait`, and `overlay?.kind === "achievements" && !revealOpen` to `&& !popupsWait`.

**Step 6: Check**

Run: `npx vitest run && npm run check`
Expected: all pass, 0 errors.

**Step 7: Manual check (phone width, `?debug`)**

Train a skill until one action away from unlocking the next skill (use the Debug panel to set XP), open the Age sheet from the header, and wait for the action. The unlock sheet must not appear until the Age sheet is closed, and then it appears straight away. Repeat with the summon panel open.

**Step 8: Commit**

```bash
git add src/lib/view/popupHold.svelte.ts src/lib/view/popupHold.test.ts src/lib/components/mobile/AgeSheet.svelte src/lib/components/SummonPanel.svelte src/lib/components/CardDetailModal.svelte src/lib/components/TutorialOverlay.svelte src/routes/+page.svelte
git commit -m "fix(ui): queued popups wait for sheets the player opened"
```

---

### Task 5: Hold a hero to lift it from a scrolling army list

In the expanded grid (`touch-pan-y`), an upward finger drag scrolls, and only a sideways drag lifts a card (`gestureIntent`, `dragPlace.ts:64`). Upward is the natural gesture toward the board. Add the standard mobile pattern: a finger resting on a card for `HOLD_MS` lifts it, and it then drags in any direction. The collapsed strip (`touch-pan-x`) gets the same behaviour.

Stopping the native scroll after the hold relies on a non-passive `touchmove` handler calling `preventDefault()`. That works because the finger hasn't moved yet, so the first `touchmove` is still cancelable.

**Files:**
- Modify: `src/lib/dragPlace.ts`
- Test: `src/lib/dragPlace.action.test.ts`

**Step 1: Write the failing tests**

Add `HOLD_MS` to the import from `./dragPlace`, then append:

```ts
describe("hold to lift (a finger in a scrolling list)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const listCard = () => new FakeElement(new FakeElement(null, { "data-drag-scroll": "y" }));
  const touch = { pointerType: "touch" };

  it("lifts a card after a still hold, then drags it along the scroll axis", () => {
    const card = listCard();
    const { calls, drops, action } = mount(card);
    pointer(card, "pointerdown", 0, 0, touch);
    vi.advanceTimersByTime(HOLD_MS);
    expect(calls).toEqual(["state"]);
    pointer(card, "pointermove", 0, 100, touch);
    pointer(card, "pointerup", 0, 100, touch);
    expect(drops).toEqual([{ assign: ["a", 2] }]);
    expect(calls).toEqual(["state", "state", "drop", "end"]);
    action.destroy();
  });

  it("scrolls when the finger moves before the hold completes", () => {
    const card = listCard();
    const { calls, action } = mount(card);
    pointer(card, "pointerdown", 0, 0, touch);
    pointer(card, "pointermove", 0, 100, touch);
    vi.advanceTimersByTime(HOLD_MS);
    pointer(card, "pointerup", 0, 100, touch);
    expect(calls).toEqual([]);
    action.destroy();
  });

  it("still taps on a quick press", () => {
    const card = listCard();
    const { calls, action } = mount(card);
    pointer(card, "pointerdown", 0, 0, touch);
    pointer(card, "pointerup", 0, 0, touch);
    vi.advanceTimersByTime(HOLD_MS);
    expect(calls).toEqual(["tap"]);
    action.destroy();
  });

  it("treats a hold on a locked card as a tap (details)", () => {
    const card = listCard();
    const { calls, action } = mount(card, { locked: true });
    pointer(card, "pointerdown", 0, 0, touch);
    vi.advanceTimersByTime(HOLD_MS);
    pointer(card, "pointerup", 0, 0, touch);
    expect(calls).toEqual(["tap"]);
    action.destroy();
  });

  it("stops the list scrolling only once a card is lifted", () => {
    const card = listCard();
    const { action } = mount(card);
    pointer(card, "pointerdown", 0, 0, touch);
    const early = new Event("touchmove", { cancelable: true });
    card.dispatchEvent(early);
    expect(early.defaultPrevented).toBe(false);
    vi.advanceTimersByTime(HOLD_MS);
    const late = new Event("touchmove", { cancelable: true });
    card.dispatchEvent(late);
    expect(late.defaultPrevented).toBe(true);
    pointer(card, "pointerup", 0, 0, touch);
    action.destroy();
  });
});
```

**Step 2: Run them and confirm they fail**

Run: `npx vitest run src/lib/dragPlace.action.test.ts`
Expected: FAIL (`HOLD_MS` is not exported; no lift after the hold).

**Step 3: Implement in `src/lib/dragPlace.ts`**

1. Update the `gestureIntent` doc comment's last line to: `A mouse or pen always drags (the wheel scrolls). A finger that rests first lifts (see HOLD_MS).`
2. After `DRAG_THRESHOLD`:

```ts
/** How long a finger rests on a card in a scrolling list before it lifts (then drags any way). */
export const HOLD_MS = 350;
```

3. Add `hold: ReturnType<typeof setTimeout> | null;` to `interface Gesture`.
4. In `end()`, after `gesture = null; if (!g) return;`, add `if (g.hold) clearTimeout(g.hold);`.
5. Add inside the action, next to `onKey`:

```ts
  // A finger resting on a card in a scrolling list lifts it. A locked card stays a tap.
  function lift(g: Gesture) {
    g.hold = null;
    if (gesture !== g || g.mode !== "wait" || !options.source || options.locked) return;
    g.mode = "drag";
    window.addEventListener("keydown", onKey);
    navigator.vibrate?.(10);
    options.onDragState?.({ source: options.source, x: g.x0, y: g.y0, over: dropTargetAt(g.x0, g.y0) });
  }

  // Once lifted, the finger drags the card, so stop the list scrolling underneath it.
  // (Only a cancelable touchmove can stop a touch-action pan, and the first one after a
  // still hold is cancelable.)
  function touchmove(e: Event) {
    if (gesture?.mode === "drag") e.preventDefault();
  }
```

6. In `down()`, add `hold: null` to the new gesture object. After `setPointerCapture`:

```ts
    const g = gesture;
    if (e.pointerType === "touch" && g.axis) g.hold = setTimeout(() => lift(g), HOLD_MS);
```

7. In `move()`, inside `if (g.mode === "wait")` after `if (intent === "wait") return;`, add:

```ts
      if (g.hold) { clearTimeout(g.hold); g.hold = null; }
```

8. Register and remove the listener alongside the others: `node.addEventListener("touchmove", touchmove, { passive: false });` and `node.removeEventListener("touchmove", touchmove);` in `destroy()`.

`navigator.vibrate` is missing on iOS and in Node's `navigator`; the optional call handles both.

**Step 4: Run and confirm everything passes**

Run: `npx vitest run src/lib/dragPlace.action.test.ts src/lib/dragPlace.test.ts`
Expected: PASS, including the existing "lets a finger scroll a strip along its declared axis" test.

**Step 5: Commit**

```bash
git add src/lib/dragPlace.ts src/lib/dragPlace.action.test.ts
git commit -m "feat(ui): hold a hero to lift it from a scrolling army list"
```

---

### Task 6: The expanded army says how to lift a hero, at the top

The instruction currently sits below the whole grid, where players only see it after scrolling.

**Files:**
- Modify: `src/lib/components/ArmyInventory.svelte` (around lines 424–442)

**Step 1: Implement**

Delete the `<p class="pt-3.5 ...">` (and its comment) at the bottom of the grid's scroll container. Insert this immediately before `<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2 pb-3" data-drag-scroll="y">`:

```svelte
      <p class="shrink-0 px-3 pt-2 text-center text-xs text-muted-foreground">
        {locked ? "Formation locked until the battle ends · tap for details" : "Hold a hero, then drag it onto the board · tap for details"}
      </p>
```

**Step 2: Check**

Run: `npm run check`
Expected: 0 errors.

**Step 3: Manual check (375px, touch emulation)**

Open Battle, expand the army, and confirm the hint is visible above the grid without scrolling. On a real device (Android Chrome and iOS Safari), holding a card lifts it; dragging it up onto a slot places it; a quick flick still scrolls the grid; a tap opens details.

**Step 4: Commit**

```bash
git add src/lib/components/ArmyInventory.svelte
git commit -m "fix(ui): lift hint sits at the top of the expanded army"
```

---

### Task 7: Desktop shows age progress at a glance, and tabs mark the current one

Phones show "3/5" in the header (`PhoneHeader`); the desktop header hides progress behind the dropdown.

**Files:**
- Modify: `src/lib/components/AgeDisplay.svelte` (imports at line 8; the Advance buttons around lines 94–113)
- Modify: `src/routes/+page.svelte` (desktop tab buttons, around line 292)

**Step 1: Implement**

`AgeDisplay.svelte`: change the import to `import { ageRewards, checklistProgress, type ChecklistItem } from "$lib/view/ageChecklist";` and add after `nextRewards`:

```ts
  let progress = $derived(checklistProgress(checklist));
```

On the "Advance" button, replace the `title` with:

```svelte
            title={ageAdvanceStatus.canAdvance ? `Advance to ${ageAdvanceStatus.nextAge.name}` : `What ${ageAdvanceStatus.nextAge.name} needs`}
```

On the arrow button, replace the `aria-label` and contents:

```svelte
            aria-label={`Requirements and rewards for ${ageAdvanceStatus.nextAge.name}, ${progress.met} of ${progress.total} met`}
            onclick={() => (detailsOpen = !detailsOpen)}
          >
            {#if !ageAdvanceStatus.canAdvance}
              <span class="mr-1 tabular-nums" aria-hidden="true">{progress.met}/{progress.total}</span>
            {/if}
            <span aria-hidden="true" class={cn("transition-transform", detailsOpen && "rotate-180")}>▾</span>
```

`+page.svelte`: on the desktop tab `<button>` inside `{#each TABS as tab (tab.id)}` (the one with `px-4 py-2`), add `aria-current={centerTab === tab.id ? "page" : undefined}`.

**Step 2: Check**

Run: `npm run check`
Expected: 0 errors.

**Step 3: Manual check (desktop width)**

With a new game, the header reads "Advance | 0/5 ▾". It updates as requirements are met, and shows only the arrow once advancing is possible (the button then pulses).

**Step 4: Commit**

```bash
git add src/lib/components/AgeDisplay.svelte src/routes/+page.svelte
git commit -m "feat(ui): desktop age header shows requirement progress"
```

---

### Task 8: Phone battle log closes on a tap outside, or Escape

The Log panel is a fixed panel with no backdrop, so the battlefield stays tappable behind it and only its Close link dismisses it.

**Files:**
- Modify: `src/lib/components/CombatView.svelte` (the `aside#battle-report` around line 391; the styles near lines 519 and 525–551)

**Step 1: Implement**

Directly after the closing `</aside>` of `#battle-report`:

```svelte
  {#if showLog}
    <!-- Phones: a tap outside the report closes it. -->
    <button class="log-backdrop" aria-label="Close battle report" tabindex="-1" onclick={() => (showLog = false)}></button>
  {/if}
```

Near the top of the markup (with the other top-level elements):

```svelte
<svelte:window onkeydown={(e) => { if (e.key === "Escape" && showLog) showLog = false; }} />
```

(If `CombatView` already has a `<svelte:window>`, merge this handler into it; a component can only have one.)

In `<style>`, next to `.report-heading { display: none; }` add `.log-backdrop { display: none; }`. Inside `@media (max-width: 767px) { ... }` add:

```css
    .log-backdrop { display: block; position: fixed; inset: 0; z-index: 39; background: #0009; }
```

(`.battle-sidebar.open` is `z-index: 40`, so the panel stays above the backdrop.)

**Step 2: Check**

Run: `npm run check`
Expected: 0 errors.

**Step 3: Manual check (375px)**

Battle → Log: the page dims behind the panel. Tapping the dimmed area closes it, and so does Escape. At 768px and up the log sidebar looks unchanged.

**Step 4: Commit**

```bash
git add src/lib/components/CombatView.svelte
git commit -m "fix(ui): phone battle log closes on outside tap or Escape"
```

---

### Task 9: Campaign reward line wraps instead of truncating on phones

`levelSub` can read "Boss · +120 Tribute · Warlord 3★ joins you". It is truncated to one line, with only a `title` tooltip (which touch screens don't show) as the fallback.

**Files:**
- Modify: `src/lib/components/CombatView.svelte:226`

**Step 1: Implement**

Replace:

```svelte
          {#if levelSub}<p class="truncate text-[13px] text-muted-foreground" title={levelSub}>{levelSub}</p>{/if}
```

with:

```svelte
          {#if levelSub}<p class="line-clamp-2 text-[13px] leading-snug text-pretty text-muted-foreground">{levelSub}</p>{/if}
```

**Step 2: Manual check (320px and 375px)**

On a campaign boss level with a recruit, the full reward text is readable over at most two lines. The Fight button keeps its size, and the battlefield still fits without the page scrolling.

**Step 3: Commit**

```bash
git add src/lib/components/CombatView.svelte
git commit -m "fix(ui): campaign reward line wraps on phones"
```

---

### Task 10: `outputLevel` upgrades don't pull level-milestone bonuses forward (latent)

`isOutputActive` applies an `outputLevel` override to every entry for a resource, so the Mining Lv 25/50 bonus entries would unlock early if an upgrade ever overrode copperOre, ironOre or coal. No shipped upgrade does that today.

**Files:**
- Modify: `src/lib/gameEngine.ts` (`resolveOutputs`, around line 469)
- Test: `src/lib/gameEngine.test.ts`

**Step 1: Write the failing test**

Add `import { SKILLS } from "./gameData";` if it isn't imported yet. Next to "folds Mining's level milestones into one line per ore":

```ts
  it("keeps level milestones at their level when an outputLevel effect lowers the ore", () => {
    const upgrades = SKILLS.mining.upgrades;
    upgrades.push({ id: "testOre", name: "Test", cost: 0, description: "", effects: [{ type: "outputLevel", resource: "copperOre", level: 1 }] });
    try {
      const r = computeActionResult("mining", 10, ["testOre"], 1, "mineStone");
      expect(r?.outputs.find((o) => o.resource === "copperOre")?.amount).toBe(1);
    } finally {
      upgrades.pop();
    }
  });
```

(Match the upgrade object's shape to `SkillDef["upgrades"][number]` in `gameData.ts`, e.g. if `cost` is required.)

**Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/gameEngine.test.ts -t "outputLevel effect lowers the ore"`
Expected: FAIL, amount `1.5`.

**Step 3: Implement**

In `resolveOutputs`:

```ts
  const merged: ResourceAmount[] = [];
  const seen = new Set<ResourceId>();
  for (const o of outputs) {
    // An outputLevel effect moves a resource's first entry earlier; its level milestones stay put.
    const overrides = seen.has(o.resource) ? {} : levelOverrides;
    seen.add(o.resource);
    if (!isOutputActive(o, level, ageIndex, overrides)) continue;
```

(keep the rest of the loop as is).

**Step 4: Run and confirm everything passes**

Run: `npx vitest run src/lib/gameEngine.test.ts`
Expected: PASS, including "lowers a conditional output's level with an outputLevel effect".

**Step 5: Commit**

```bash
git add src/lib/gameEngine.ts src/lib/gameEngine.test.ts
git commit -m "fix(game): outputLevel effects leave level milestones alone"
```

---

### Task 11: The dev server uses the port the preview asks for

`.claude/launch.json` asks for port 3001, but Vite ignores `PORT` and starts on 5173/5174, so the preview opens a dead URL.

**Files:**
- Modify: `vite.config.ts` (the `server` block)

**Step 1: Implement**

```ts
	server: {
		// The preview tool passes the port it expects in PORT.
		port: process.env.PORT ? Number(process.env.PORT) : undefined,
		strictPort: Boolean(process.env.PORT),
		// The `skaffold dev` pod is reached through the ingress under this host,
		// which Vite would otherwise reject.
		allowedHosts: ['civdle-dev.bevsoft.com']
	}
```

**Step 2: Check**

Run: `PORT=3001 npm run dev` (stop it after it prints the URL)
Expected: `Local: http://localhost:3001/`. Starting the `civdle-dev` preview also lands on 3001.

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "chore: dev server honours PORT"
```

---

### Task 12: Final verification

**Step 1:** `npx vitest run`: all pass (357 plus the new tests).
**Step 2:** `npm run check`: 0 errors, 0 warnings.
**Step 3:** `npm run build`: succeeds.
**Step 4:** Preview walkthrough at 375×812 and at desktop width: Tasks 4, 6, 7, 8 and 9 manual checks. Also check that Town → Settlement shows the Hall of Legends under Locked with "Reach the Medieval era" in an Iron Age save (use `?debug` to set the age).
**Step 5:** Merge into `feat/mobile-3a` (use superpowers:finishing-a-development-branch).
