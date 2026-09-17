# Unit cards, gacha, stars, traits and the turn-paused auto-battle

## Overview

Combat is a gacha army builder. Players spend **War Spoils** (`gacha.gold`) to
summon unit cards, merge duplicates to raise their star rank, build a party of
**3**, and fight randomly generated enemy armies in a speed-driven auto-battle
that pauses on every unit's turn to animate the attack or ultimate.

## Units

48 units across six factions (Barbarian, Knight, Wizard, Necromancer, Ranger,
Demon), each with HP / ATK / DEF / SPD, a base rarity (1–5★), an attack type
and two traits (three for Ascendants). Data lives in `src/lib/combatData.ts`;
sprites in `src/lib/assets/units/<id>.png` are 4×4 sheets (idle, attack, hit,
death rows × 4 frames) rendered one cell at a time by `Sprite.svelte`.

### Attack triangle

⚔ Melee beats 🏹 Ranged beats ✨ Magic beats ⚔ Melee. Strong hits deal ×1.5
and are marked with a red ▲ in the damage popup; weak hits deal ×0.75.

### Stars

Cards are summoned at their base rarity. Two cards of the same unit and star
count merge into one card a star higher (max 10★). Each star above base
multiplies HP/ATK/DEF by 1.4; speed is unchanged. 10★ cards get a holographic
overlay. Merging plays the `StarUpEffect` overlay; summoning plays the
`SummonReveal` overlay with escalating charge time, rays, screen shake, flash
and confetti from 1★ to 5★.

### Summon rates

5★ 1% · 4★ 5% · 3★ 15% · 2★ 30% · 1★ 49%. One roll costs 1 War Spoils; new
saves start with 10.

## Traits and synergies (`src/lib/traits.ts`)

Count how many party units share a trait; 2 copies gives tier 1, 3 gives
tier 2 (Ascendant: 1 and 2). Bonuses are army-wide `ArmyMods` applied at
battle start or per attack: ATK/HP/DEF multipliers, speed, crit, dodge,
lifesteal, ultimate damage, execute bonus, DEF ignore, double hits, turn-start
heal, enemy DEF/SPD penalties, and (Ascendant tier 2) ultimates every 2nd turn.
Enemy armies get synergies too.

## Battle (`src/lib/combatEngine.ts`)

Continuous-time initiative: every fighter accrues AP at its speed and the first
to reach 100 acts. `stepBattle` resolves exactly one turn so the UI can pause
900 ms after an attack and 1800 ms after an ultimate. Every 3rd turn of a unit
is its ultimate: a generic 2× damage hit (real ultimates to be designed later).
Damage: `atk × clamp(1 + 0.05·(atk − def), 0.3, 3) × type × crit × execute`.

## Enemy encounters

Three archetypes, rolled per encounter:

| Archetype | Type | Strength | Weakness |
|---|---|---|---|
| Warband | Melee | +25% HP & DEF | −2 SPD; magic tears through |
| Volley | Ranged | +30% ATK | −25% HP; melee closes the gap |
| Coven | Magic | ultimate every 2nd turn | −25% DEF; ranged picks them off |

Enemy count, max rarity and bonus stars scale with level (1–30). The encounter
is previewed with a matchup readout and a first-time tutorial. A loss keeps the
same encounter so the player has to change composition; a win pays out spoils,
unlocks the next level and rolls a new encounter.

## UI

`CombatView` composes the header, arena (or `EncounterPanel`), party strip,
and `ArmyInventory` (unlimited, vertically scrolling square tiles, sortable by
rarity / stars / trait / name in both directions). Clicking a tile opens
`CardDetailModal` with stats, traits, add/remove, merge and discard.
