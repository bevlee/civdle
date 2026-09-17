# SvelteKit Port Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port Civdle from Next.js 16 / React 19 to SvelteKit 5 with Svelte 5 runes, pixel-perfect layout match.

**Architecture:** Keep all pure TypeScript game logic files (`gameData.ts`, `gameEngine.ts`, `combatData.ts`, `combatEngine.ts`) unchanged. Convert React hooks (`useGameState`, `useEventQueue`) to Svelte 5 rune-based `.svelte.ts` modules. Convert all React components to `.svelte` files. Use shadcn-svelte for UI primitives (Button, Badge, Card, Progress, Separator, Tabs).

**Tech Stack:** SvelteKit 5, Svelte 5 (runes), shadcn-svelte (bits-ui), Tailwind CSS 4, TypeScript 5

---

## Task 1: Scaffold SvelteKit project and install dependencies

**Files:**
- Create: `sveltekit/` (temporary directory for scaffold, then move contents)
- Modify: `package.json`

**Step 1: Remove Next.js files and scaffold SvelteKit**

```bash
# From the worktree root, create a fresh SvelteKit project in a temp dir
cd /Users/bevan/projects/civdle/.claude/worktrees/sveltekit-port-1e8978
npx sv create sveltekit-tmp --template minimal --types ts --no-add-ons --no-install
```

**Step 2: Move SvelteKit scaffold into place**

Move the SvelteKit scaffold files into the project root, replacing Next.js structure:

```bash
# Remove Next.js-specific files
rm -rf app/ components/ public/ next.config.ts next-env.d.ts eslint.config.mjs postcss.config.mjs components.json .next/

# Copy SvelteKit scaffold into root
cp -r sveltekit-tmp/* sveltekit-tmp/.* . 2>/dev/null || true
rm -rf sveltekit-tmp/
```

Keep `lib/` and `docs/` — we'll move `lib/` into `src/lib/` in the next task.

**Step 3: Install core dependencies**

```bash
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install clsx tailwind-merge
npm install tw-animate-css
```

**Step 4: Initialize shadcn-svelte**

```bash
npx shadcn-svelte@latest init
```

Choose: Style = Default, Base color = Neutral, CSS variables = yes, CSS path = `src/app.css`, Tailwind config = empty, Components alias = `$lib/components`, Utils alias = `$lib/utils`.

**Step 5: Add shadcn-svelte UI components**

```bash
npx shadcn-svelte@latest add button badge card progress separator tabs tooltip
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit 5 project with shadcn-svelte"
```

---

## Task 2: Move game logic files and set up styling

**Files:**
- Move: `lib/gameData.ts` → `src/lib/gameData.ts`
- Move: `lib/gameEngine.ts` → `src/lib/gameEngine.ts`
- Move: `lib/combatData.ts` → `src/lib/combatData.ts`
- Move: `lib/combatEngine.ts` → `src/lib/combatEngine.ts`
- Delete: `lib/useGameState.ts`, `lib/useEventQueue.ts`, `lib/utils.ts` (will be replaced)
- Modify: `src/app.css` — merge in custom animations from old `globals.css`

**Step 1: Move pure game logic files**

```bash
mkdir -p src/lib
mv lib/gameData.ts src/lib/
mv lib/gameEngine.ts src/lib/
mv lib/combatData.ts src/lib/
mv lib/combatEngine.ts src/lib/
rm -rf lib/
```

**Step 2: Fix imports in game logic files**

The game logic files use relative imports (`./gameData`, `./combatEngine`) — these should keep working since they all land in `src/lib/`. No changes needed unless the scaffold uses a different resolution.

**Step 3: Merge custom animations into `src/app.css`**

Add all the `@keyframes civdle-*` animations and `.animate-*` utility classes from the old `globals.css` into `src/app.css`, after the shadcn/tailwind imports. Also add the `:root` / `.dark` CSS variable blocks for the theme.

The `@custom-variant dark (&:is(.dark *));` line and `@theme inline { ... }` block from the old globals should be merged into the new app.css, along with the `@layer base` rules.

**Step 4: Verify TypeScript compilation**

```bash
npm run check
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: move game logic to src/lib, add custom animations"
```

---

## Task 3: Port event queue (useEventQueue → Svelte 5 runes)

**Files:**
- Create: `src/lib/eventQueue.svelte.ts`

**Step 1: Write the event queue module**

The React hook `useEventQueue` manages a list of transient events (level-ups, resource gains, etc.) with auto-dismiss. In Svelte 5, this becomes a class with `$state`:

```typescript
// src/lib/eventQueue.svelte.ts

export interface QueuedEvent<T = unknown> {
  id: string;
  type: string;
  data: T;
}

export class EventQueue {
  events = $state<QueuedEvent[]>([]);
  #counter = 0;

  emit<T>(type: string, data: T): string {
    this.#counter += 1;
    const id = `${type}-${this.#counter}`;
    this.events = [...this.events, { id, type, data }];
    return id;
  }

  dismiss(id: string): void {
    this.events = this.events.filter((e) => e.id !== id);
  }
}
```

**Step 2: Verify compilation**

```bash
npm run check
```

**Step 3: Commit**

```bash
git add src/lib/eventQueue.svelte.ts
git commit -m "feat: port event queue to Svelte 5 runes"
```

---

## Task 4: Port game state (useGameState → Svelte 5 runes)

**Files:**
- Create: `src/lib/gameState.svelte.ts`

**Step 1: Write the game state module**

This is the biggest conversion. The React hook `useGameState` becomes a Svelte 5 class that:
- Uses `$state()` for `state`, `loaded`, `message`, `pendingUnlocks`, `progress`
- Uses `$derived()` for `levels`, `ageIndex`, `ageBonus`, `ageAdvanceStatus`, `displayProgress`
- Uses `$effect()` for: load from localStorage on mount, periodic save, action scheduling loop, progress bar timer, combat tick timer
- Exports action methods as regular class methods

Key conversion patterns:
- `useState(x)` → `x = $state(initialValue)`
- `useRef(x)` → plain class field (no ref wrapper needed)
- `useEffect(() => { ... }, [deps])` → `$effect(() => { ... })` (auto-tracks deps)
- `useCallback(fn, [deps])` → regular method (no memoization needed in Svelte)
- `setState(prev => newValue)` → `this.state = newValue` (direct mutation)

The `stateRef` pattern (used to avoid stale closures in setTimeout callbacks) is not needed in Svelte — class fields are always current.

```typescript
// src/lib/gameState.svelte.ts
import { CONSUMABLES, ResourceId, SKILLS, SKILL_ORDER, SkillId } from "./gameData";
import {
  ApplyActionOutcome, GameState, advanceAge, aggregateConsumableEffects,
  applyAction, computeActionResult, computeUnlocks, createInitialState,
  getActiveConsumableDefs, getAgeAdvanceStatus, getAgeBonus,
  getSkillEligibleAgeIndex, getSkillLevels, processOfflineProgress,
} from "./gameEngine";
import { createInitialCombatState, placeUnit, removeUnit, startWave, tickCombat } from "./combatEngine";
import { BARRACKS_RECIPES, generateWave, UnitId, UNITS } from "./combatData";
import { EventQueue } from "./eventQueue.svelte";

const SAVE_KEY = "civdle-save";
const SAVE_INTERVAL_MS = 5000;
const PROGRESS_INTERVAL_MS = 100;

function loadFromStorage(): GameState {
  // Same as React version — load from localStorage with migrations
  // (copy loadFromStorage and saveToStorage verbatim)
}

function saveToStorage(state: GameState) {
  // Same as React version
}

export class CivdleGame {
  state = $state<GameState>(createInitialState());
  loaded = $state(false);
  message = $state<string | null>(null);
  pendingUnlocks = $state<SkillId[]>([]);
  #progress = $state(0);
  eventQueue = new EventQueue();

  // Timer refs — plain fields, no useRef needed
  #actionTimeout: ReturnType<typeof setTimeout> | null = null;
  #progressInterval: ReturnType<typeof setInterval> | null = null;
  #actionStart = 0;
  #actionDuration = 0;

  // Derived values
  get levels() { return getSkillLevels(this.state); }
  get ageIndex() { return this.state.ageIndex; }
  get ageBonus() { return getAgeBonus(this.state.ageIndex); }
  get ageAdvanceStatus() { return getAgeAdvanceStatus(this.state, this.levels); }
  get progress() { return this.state.activeSkill ? this.#progress : 0; }
  get events() { return this.eventQueue.events; }

  constructor() {
    // Effects are set up in init() — called from +page.svelte's onMount
  }

  init() {
    // Load from localStorage + offline catch-up
    // Set up save interval + beforeunload
    // Set up action scheduling effect
    // Set up progress bar effect
    // Set up combat tick effect
    // Return cleanup function
  }

  // Action methods — direct translations of useCallback handlers:
  startTraining(skillId: SkillId) { ... }
  stopTraining() { ... }
  selectRecipe(skillId: SkillId, recipeId: string) { ... }
  buyUpgrade(skillId: SkillId, upgradeId: string) { ... }
  buyGlobalUpgrade(upgradeId: string) { ... }
  toggleConsumable(resourceId: ResourceId) { ... }
  dismissMessage() { ... }
  dismissUnlock() { ... }
  placeUnitOnGrid(lane: number, col: number, unitId: UnitId) { ... }
  removeUnitFromGrid(lane: number, col: number) { ... }
  craftBarracksUnit(unitId: string) { ... }
  sendWave() { ... }
  advanceAgeAction() { ... }
  dismissEvent(id: string) { this.eventQueue.dismiss(id); }
}
```

Important notes for the port:
- The action scheduling loop (`useEffect` that watches `state` and `loaded`) becomes an `$effect` that tracks `this.state.activeSkill` and related deps.
- React's Strict Mode double-invoke workarounds (using `stateRef` instead of functional updaters) are NOT needed — Svelte doesn't have Strict Mode. Regular `this.state = newValue` works.
- The combat tick `setInterval` starts/stops based on `state.combat.activeWave?.status`.
- The progress bar `setInterval` starts/stops based on `state.activeSkill`.

**Step 2: Verify compilation**

```bash
npm run check
```

**Step 3: Commit**

```bash
git add src/lib/gameState.svelte.ts
git commit -m "feat: port game state management to Svelte 5 runes"
```

---

## Task 5: Port FloatingText component

**Files:**
- Create: `src/lib/components/FloatingText.svelte`

**Step 1: Write the component**

The React `FloatingText` uses `useEffect` for auto-dismiss timer. In Svelte, use `onMount`:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { cn } from "$lib/utils";

  let {
    id,
    text,
    class: className,
    duration = 1100,
    onDone,
  }: {
    id: string;
    text: string;
    class?: string;
    duration?: number;
    onDone: (id: string) => void;
  } = $props();

  onMount(() => {
    const timeout = setTimeout(() => onDone(id), duration);
    return () => clearTimeout(timeout);
  });
</script>

<span
  class={cn(
    "animate-float-up pointer-events-none absolute left-1/2 top-0 z-10 whitespace-nowrap font-bold",
    className
  )}
>
  {text}
</span>
```

**Step 2: Commit**

```bash
git add src/lib/components/FloatingText.svelte
git commit -m "feat: port FloatingText component to Svelte"
```

---

## Task 6: Port AnimationOverlay component

**Files:**
- Create: `src/lib/components/AnimationOverlay.svelte`

**Step 1: Write the component**

Port the `AnimationOverlay` and inline `AgeAdvanceEffect` sub-component. In Svelte, the nested component can be extracted or kept as a snippet. Use `onMount` for the auto-dismiss timer.

The component filters events for `ageAdvance` type and renders full-screen flash effects.

**Step 2: Commit**

```bash
git add src/lib/components/AnimationOverlay.svelte
git commit -m "feat: port AnimationOverlay component to Svelte"
```

---

## Task 7: Port AgeDisplay component

**Files:**
- Create: `src/lib/components/AgeDisplay.svelte`

**Step 1: Write the component**

Direct translation. Props become `$props()`. Uses `Badge`, `Button`, `FloatingText` from the Svelte equivalents. The `cn()` utility from shadcn-svelte replaces the React one.

Key Svelte patterns:
- `{#each array as item}` replaces `.map()`
- `{#if condition}` replaces `{condition && <JSX>}`
- Event handlers: `onclick={handler}` replaces `onClick={handler}`

**Step 2: Commit**

```bash
git add src/lib/components/AgeDisplay.svelte
git commit -m "feat: port AgeDisplay component to Svelte"
```

---

## Task 8: Port SkillPanel component

**Files:**
- Create: `src/lib/components/SkillPanel.svelte`

**Step 1: Write the component**

The React version has a parent `SkillPanel` and child `SkillRow`. In Svelte, create both in one file (SkillRow as a `{#snippet}`) or as separate files. The `SkillRow` has a `useEffect` for auto-dismissing unlock events — use `$effect` in Svelte 5.

**Step 2: Commit**

```bash
git add src/lib/components/SkillPanel.svelte
git commit -m "feat: port SkillPanel component to Svelte"
```

---

## Task 9: Port TrainingView component

**Files:**
- Create: `src/lib/components/TrainingView.svelte`

**Step 1: Write the component**

Direct translation. Uses `Button`, `Progress`, `Separator`. The `formatAmount` helper stays as a local function.

**Step 2: Commit**

```bash
git add src/lib/components/TrainingView.svelte
git commit -m "feat: port TrainingView component to Svelte"
```

---

## Task 10: Port Inventory component

**Files:**
- Create: `src/lib/components/Inventory.svelte`

**Step 1: Write the component**

Direct translation. Uses `Card`, `CardContent`, `FloatingText`. The `RESOURCE_SECTIONS` constant and `formatGain` helper stay.

**Step 2: Commit**

```bash
git add src/lib/components/Inventory.svelte
git commit -m "feat: port Inventory component to Svelte"
```

---

## Task 11: Port Shop component

**Files:**
- Create: `src/lib/components/Shop.svelte`

**Step 1: Write the component**

Direct translation. Uses `Button`, `Separator`. Nested `.map()` loops become `{#each}` blocks.

**Step 2: Commit**

```bash
git add src/lib/components/Shop.svelte
git commit -m "feat: port Shop component to Svelte"
```

---

## Task 12: Port SkillUnlockModal component

**Files:**
- Create: `src/lib/components/SkillUnlockModal.svelte`

**Step 1: Write the component**

Uses `$state` for the `visible` flag. The `requestAnimationFrame(() => setVisible(true))` pattern translates to `onMount` + `tick()`.

**Step 2: Commit**

```bash
git add src/lib/components/SkillUnlockModal.svelte
git commit -m "feat: port SkillUnlockModal component to Svelte"
```

---

## Task 13: Port CombatGrid component

**Files:**
- Create: `src/lib/components/CombatGrid.svelte`

**Step 1: Write the component**

Has local `picker` state (`$state`). The nested grid rendering with click handlers translates directly. Unit picker popover uses `{#if}` conditional rendering.

**Step 2: Commit**

```bash
git add src/lib/components/CombatGrid.svelte
git commit -m "feat: port CombatGrid component to Svelte"
```

---

## Task 14: Port Barracks and CombatView components

**Files:**
- Create: `src/lib/components/Barracks.svelte`
- Create: `src/lib/components/CombatView.svelte`

**Step 1: Write both components**

Direct translations. `Barracks` uses `Button`. `CombatView` composes `CombatGrid`, `Barracks`, and `Button`.

**Step 2: Commit**

```bash
git add src/lib/components/Barracks.svelte src/lib/components/CombatView.svelte
git commit -m "feat: port Barracks and CombatView components to Svelte"
```

---

## Task 15: Wire up the main page and layout

**Files:**
- Modify: `src/routes/+layout.svelte`
- Modify: `src/routes/+page.svelte`
- Modify: `src/app.html`

**Step 1: Set up `src/app.html`**

Add the `dark` class to `<html>`, Geist font loading (via `@fontsource/geist-sans` and `@fontsource/geist-mono`, or Google Fonts CSS link).

```html
<!doctype html>
<html lang="en" class="dark h-full antialiased">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Civdle</title>
    %sveltekit.head%
  </head>
  <body class="min-h-full flex flex-col bg-background text-foreground" data-sveltekit-preload-data="hover">
    %sveltekit.body%
  </body>
</html>
```

**Step 2: Set up `src/routes/+layout.svelte`**

```svelte
<script lang="ts">
  import "../app.css";
  let { children } = $props();
</script>

{@render children()}
```

**Step 3: Write `src/routes/+page.svelte`**

This is the main game page. It:
1. Creates a `CivdleGame` instance
2. Calls `game.init()` in `onMount` (returns cleanup)
3. Has local `$state` for `clickedSkill` and `activeTab`
4. Computes `selectedSkill` and `highlightedResources` with `$derived`
5. Renders the full layout: `AnimationOverlay`, `AgeDisplay`, tab bar, skill/combat content, sidebar, `SkillUnlockModal`

The structure is a direct translation of the React `page.tsx`.

**Step 4: Verify the dev server starts**

```bash
npm run dev
```

Open browser, verify the game loads, shows "Loading save...", then renders the skill panel.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire up SvelteKit page and layout, game is functional"
```

---

## Task 16: Install fonts and final polish

**Files:**
- Modify: `src/app.css` (font imports)
- Modify: `src/app.html` (font variables)

**Step 1: Install Geist fonts**

```bash
npm install @fontsource-variable/geist-sans @fontsource-variable/geist-mono
```

Import in `src/app.css`:
```css
@import "@fontsource-variable/geist-sans";
@import "@fontsource-variable/geist-mono";
```

Set CSS variables for the fonts so Tailwind's `font-sans` / `font-mono` use them.

**Step 2: Visual verification**

Start the dev server, verify:
- Dark theme renders correctly
- Skills panel shows and is clickable
- Training starts/stops
- Progress bar animates smoothly
- Resource gains show floating text
- Level-ups flash gold
- Skill unlocks slide in
- Age advance shows full-screen animation
- Combat tab appears after Bronze Age
- Combat grid is interactive
- Inventory and Shop tabs work
- Save/load from localStorage works

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Geist fonts and finalize SvelteKit port"
```

---

## Task 17: Clean up and remove old Next.js artifacts

**Files:**
- Delete: `AGENTS.md` (Next.js-specific agent instructions)
- Modify: `CLAUDE.md` (remove `@AGENTS.md` reference)
- Delete: any remaining Next.js files (`next-env.d.ts`, etc.)
- Verify: `package.json` has no React/Next dependencies

**Step 1: Clean up**

```bash
rm -f AGENTS.md next-env.d.ts
# Verify no React imports remain
grep -r "from 'react'" src/ || echo "No React imports found"
grep -r "from \"react\"" src/ || echo "No React imports found"
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Next.js artifacts, clean up port"
```

---

## Key Svelte 5 conversion patterns reference

| React | Svelte 5 |
|-------|----------|
| `useState(x)` | `let x = $state(initialValue)` |
| `useRef(x)` | `let x = initialValue` (plain variable) |
| `useMemo(() => val, [deps])` | `let val = $derived(expression)` |
| `useEffect(() => { ... }, [deps])` | `$effect(() => { ... })` |
| `useCallback(fn, [deps])` | `function fn() { ... }` (no wrapper needed) |
| `{items.map(x => <X />)}` | `{#each items as x}<X />{/each}` |
| `{cond && <X />}` | `{#if cond}<X />{/if}` |
| `{cond ? <A /> : <B />}` | `{#if cond}<A />{:else}<B />{/if}` |
| `onClick={handler}` | `onclick={handler}` |
| `className={cn(...)}` | `class={cn(...)}` |
| `<X key={id} />` | `{#key id}<X />{/key}` |
| `props.children` | `{@render children()}` with `let { children } = $props()` |
| `React.ComponentProps<"div">` | Use `HTMLAttributes<HTMLDivElement>` or `$props()` |
