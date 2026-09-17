# Achievements — design

## Goal
A third centre tab ("Achievements") listing milestones, and Steam-style
toasts at the top-middle of the page when one unlocks.

## Data
- `GameState.achievements: Record<AchievementId, number>` — id → unlock time.
- `GameState.stats` — counters the engine can't derive from a snapshot:
  actions, outOfMaterials, battlesWon, battlesLost, bestWinLevel,
  cardsSummoned, packsOpened, bestSummonStars, merges, cardsDiscarded,
  bestOfflineHaul. Old saves get zeros.

## Definitions (`src/lib/achievements.ts`)
`AchievementDef { id, name, description, icon, category, hidden?,
check(state, levels), progress?(state, levels) -> {current, target} }`.

Categories: skills (lv 10/20/50/99 per skill + all-skills combos), resources
(Over 9000, hoarding), ages, army (gacha), combat, misc (fun ones).
Hidden ones show as "???" until unlocked.

`checkAchievements(state)` returns `{ state, newlyUnlocked }` and is pure.

## Detection
`CivdleGame.init` opens a `$effect.root` whose effect reads `state`, runs
`checkAchievements`, and (untracked) writes the new state and emits an
`achievement` event per unlock. Any mutation path (training, combat, debug)
is covered without per-call-site wiring.

## UI
- `AchievementsView.svelte` in the centre panel: overall progress bar,
  skill milestones as a compact per-skill chip grid, other categories as
  card lists with progress bars for numeric goals.
- `AchievementToasts.svelte` fixed at top-centre (z above overlays),
  stacked, auto-dismiss after 4.5s, slide-down/up animation.
