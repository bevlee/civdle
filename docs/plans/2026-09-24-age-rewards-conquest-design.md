# Age Rewards & Conquest — Design

## Goal

Make each age-up feel like a milestone with a visible, concrete reward, instead of
only a flat time/output multiplier. Add an endgame skill whose resource is the only
currency for guaranteed-5★ summons.

## Age rewards

| Age | Unlocks | Vampire copies |
|---|---|---|
| Bronze | Campaign & The Abyss | 1 |
| Iron | 4★ summons | 2 |
| Medieval | 5★ summons | 3 |
| Renaissance | Conquest skill (Glory) | 4 |

Age bonuses are flat speed-ups instead of percentages: Bronze, Iron and Medieval each
take -0.2s off every action (-0.6s total); Renaissance doubles every resource. The 10
Vampires (4★ Necromancer, shown to players as "4★ hero") are enough to promote one to 8★.

- `AgeDef` gains a `reward` describing hero copies and unlocks; the unit is the constant
  `AGE_REWARD_UNIT = "vampire"`.
- Copies are granted as fresh cards at base stars when the age is advanced.

## Summon star cap moves from settlement to ages

- War Forge and Master Forge settlement upgrades are removed.
- `maxSummonStars` becomes age-based: 3★ until Iron, 4★ in Iron, 5★ from Medieval.

## Combat gated behind Bronze Age

- Campaign and The Abyss tabs stay visible but show a locked state
  ("Unlocks in Bronze Age") while in the Stone Age. Settlement stays open.

## Conquest skill → Glory

- New skill category `"combat"`; skill `conquest` has no skill prereqs and no shop
  upgrades. Skills gain an optional `ageRequired`; Conquest requires Renaissance.
  Unlocks are re-evaluated when an age is advanced.
- Pure gathering recipes: Raid (Lv 0) 1 Glory, Campaign (Lv 30) 2 Glory,
  Conquest (Lv 60) 3 Glory per action. Age and mastery bonuses apply as normal.
- New resource `glory`.

## 5★-only summons

- Require **both** the Celestial Altar and Glory. Regular Tribute can no longer pay for them.
- Legendary Pack: 10 guaranteed 5★ for 100 Glory.
- Legendary Summon: 1 guaranteed 5★ for 10 Glory.
- Regular summons/packs still cost Tribute and are unchanged.

Balance note: with Renaissance's ×2, a pack takes ~70s (Lv 0) to ~23s (Lv 60) of
Conquest. This is deliberately generous; costs are single constants
for later tuning.

## UI

- Next-age panel shows a **Reward** line beneath the requirements checklist.
- Age-up popup lists the age's bonus and rewards, e.g. "×2 resources · 4★ hero ×4 · Conquest skill".

## Testing

- Conquest locked before Renaissance, unlocked on advancing into it.
- Legendary summons refuse without the Altar or without enough Glory, never spend Tribute.
- Age advance grants the right Vampire count; max summon stars follow age.
- Combat unlocks at Bronze.

No save migrations: there are no live players yet.
