# Shop upgrade rework, XP rebalance, and mastery upgrades

## Goals

- Make skill upgrades mechanically varied instead of the same "+1 / -0.2s / +2" triple.
- Show XP per action beside action time, each with a hover breakdown of buffs.
- Reach level 99 in roughly 10% of the current time.
- Add global "mastery" upgrades that unlock once any skill reaches level 99.

## Design

### Declarative upgrade effects

Each `SkillUpgrade` gains an `effects: UpgradeEffect[]` list. The engine no longer
has a per-skill `switch`; it folds every owned upgrade's effects (skill-level and
global) into one `ActionEffects` accumulator. Effect kinds:

| kind                | meaning                                              |
| ------------------- | ---------------------------------------------------- |
| `flatTime`          | subtract seconds from base action time               |
| `timeMult`          | multiply action time                                 |
| `flatOutput`        | +N of a named resource when the recipe yields it     |
| `flatPrimaryOutput` | +N of the recipe's first output                      |
| `outputMult`        | multiply every output                                |
| `doubleChance`      | chance (per action) to double outputs                |
| `refundChance`      | chance the recipe's inputs are not consumed          |
| `xpMult`            | multiply XP per action                               |
| `byproduct`         | extra resource, optionally with a chance             |
| `outputLevel`       | lower the level at which a conditional output appears|

### Determinism

`computeActionResult` is pure: it returns guaranteed outputs, chanced outputs
(with their chance), the refund/double chances, and the time/XP with a list of
`{ source, effect }` modifier lines. All dice are rolled in `applyAction`, which
takes an injectable `rng` so tests are deterministic. This also fixes the
training view flickering between values when Ore Sense was owned.

### XP

`XP_PER_ACTION` goes from 5 to 50. The level curve is untouched, so every level
takes one tenth of the actions it did. XP modifiers (skill `xpMult`, global
Wisdom) multiply this base and are rounded.

### Mastery upgrades

`GLOBAL_UPGRADES` in `gameData`: Haste (all actions ×0.5 time), Bounty (all
resources ×2), Wisdom (all XP ×2). They cost skill points and are purchasable
only once any skill is at `MAX_LEVEL`. The debug Hyperdrive stays free and
ungated.

### UI

Training view shows `Time 1.80s · XP +50`; hovering either opens a tooltip
listing the base value, each active buff, and the final value. The shop gains a
Mastery section that is greyed out with an explanation until a skill hits 99.

### Save migration

Crafting skills used shared ids (`efficiency`, `betterRecipes`, `mastery`).
Saves are migrated by slot: old id N maps to the skill's Nth upgrade. Unknown
ids are dropped.
