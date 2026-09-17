# Main Story and The Depths

Combat splits into two modes that share the party, army inventory and battle
engine. The old free level selector and its grind loop are gone.

## Main Story (`mode: "story"`)

- Linear: `gacha.storyLevel` is the next level; it only moves forward. No
  replaying cleared levels, no auto-battle.
- A win pays the level number in War Spoils once and rolls the next level's
  encounter. A loss keeps the same encounter so composition has to change.
- Every 5th level is a **boss**: one legendary "main" enemy plus two minions
  generated as ordinary enemies from 4 levels lower, so minion bonus stars
  step up by one per boss. Boss stars are 5★ at level 5, 6★ at 10, … 10★ at
  30. Bosses 1–3 draw from ordinary legendaries, bosses 4–6 from the six
  Ascendants. The boss army carries a ×1.3 stat bonus so it is a bigger wall
  than the regular level after it, which gains a bonus star.
- The encounter panel and arena mark the boss; the header shows the reward.
- Level 30 cleared means the story is complete.

## The Depths (`mode: "depths"`)

- Endless. `depths.level` is the next depth; `level - 1` depths are cleared.
- Every army is normalised onto a smooth strength curve:
  `18 × 1.08^(depth − 1)` per enemy, using `unitStrength = hp + 5·atk + 3·def`.
  Whatever units roll, the multiplier puts the army exactly on the curve, so
  there are no rarity cliffs; a star merge (×1.4) is worth ~4–5 depths, which
  is what produces bursts of progress between stalls.
- **Auto** keeps fighting: on a result the store pauses 1.5 s, dismisses and
  descends again. Auto is remembered in the save and resumes on load.
  Starting a Main Story fight switches Auto off.
- **Passive income**: every 5 depths cleared pays +10 War Spoils every 10 s,
  ticked by the store and shown as a floating `+N ⚔` in the top bar and the
  combat header. Offline time is paid on load and reported in the welcome
  message.

## Shared

- Only one battle runs at a time (`gacha.battleMode`). The other tab shows a
  note and disables its Fight button until the result panel is dismissed.
- Save migration: `enemyLevel`/`maxEnemyLevel` become `storyLevel` (from the
  highest level reached) with a fresh encounter; `depths` and `battleMode`
  default in.

## Tuning notes (from simulation, optimal play with instant rolling)

- Story arc ≈ 90 min. Walls sit on bosses 20, 25, 30 and the regular level
  right after each (bonus star step). Levels 1–15 are a warm-up (~5 min).
- Depths reach ~30 in 5 min, ~50 in 20 min, and stall near 60 for a maxed
  10★ legendary party.
- The passive income is large relative to a 1-spoil roll (depth 30 pays 360
  rolls a minute). If the economy feels too fast, raise `DEPTHS_SCALE` or
  `DEPTHS_BASE_STRENGTH` rather than the income numbers.
