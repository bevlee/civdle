# Train-side gain toasts and integer yields

## Goal

- Show a toast on the training panel for each completed action listing the
  resources actually gained.
- Every resource gain is a whole number. No more `+1.1 Wood` or `+0.3 Clay`.
- Add a little variance to gathering without changing the balance.

## Chance rounding

Fractional expected amounts become probabilities. An expected `1.1` yields 1
with a 10% chance of 2; an expected `0.3` yields 1 on 30% of actions and 0
otherwise. The long-run average is unchanged, so age bonuses and the 0.5/0.3
recipe outputs keep their current value while feeling like bonus drops.

The existing Ore Sense double-roll moves into the same roll step.

## Engine

- `computeActionResult` becomes deterministic: it returns expected (possibly
  fractional) amounts and no longer calls `Math.random`. The training preview
  and offline loop's affordability check use it.
- New `rollOutputs(result, effects, rng)` produces integer `RolledOutput`s:
  `{ resource, amount, expected, bonus }` where `bonus` is true when the roll
  beat `floor(expected)`.
- `applyAction(state, skillId, rng = Math.random)` rolls, applies, and returns
  the rolled outputs in its outcome. Offline progress uses the same path.

## UI

- Preview reads `1 Wood (+1 at 10%)` and `Clay (30%)` so the variance is
  explained.
- `CivdleGame` emits one `actionGain` event per action with the rolled
  outputs. `GainToastStack`, mounted at page level, renders up to 4 recent
  toasts fixed at the bottom centre of the viewport, newest last, each
  fading after ~1.6s. They show on every tab (including Combat) so progress
  is visible while fighting. Each toast lists only the amounts gained.
- The inventory floating text and skill panel flashes are unchanged; the
  amounts they show are now integers.

## Testing

Vitest unit tests for `rollOutputs` and `applyAction` with injected rng.
