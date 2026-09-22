<script lang="ts">
  import { ATTACK_TYPES, UNITS, ULTIMATES, type UnitCard } from "$lib/combatData";
  import { ultimateCharge } from "$lib/battlePlayback";
  import type { Fighter } from "$lib/combatEngine";
  import Sprite, { type Pose } from "./Sprite.svelte";
  import { TRAIT_SYNERGIES } from "$lib/traits";
  import { starDisplay, PURPLE_STAR_COLOR } from "$lib/rarity";

  let { card, fighter, enemy = false, pose = "idle", animate = false, ghost = false, ultEvery = 3, castingUltimate = false }: {
    card: UnitCard;
    fighter?: Fighter;
    enemy?: boolean;
    pose?: Pose;
    animate?: boolean;
    ghost?: boolean;
    ultEvery?: number;
    castingUltimate?: boolean;
  } = $props();

  const colors = ["#8fae84", "#b494ce", "#d4ae68"];
  let charge = $derived(ultimateCharge(fighter?.turns ?? 0, ultEvery));
  let chargeLabel = $derived(castingUltimate ? "Ultimate active" : charge.ready ? "Ultimate next" : `Ultimate in ${charge.remaining} personal actions`);
  let def = $derived(UNITS[card.unitId]);
  let sd = $derived(starDisplay(card.stars));
</script>

<div class="battle-unit" class:ghost class:defeated={fighter && fighter.hp <= 0}>
  <div class="unit-sprite" class:ascended={card.ascended}><Sprite unitId={card.unitId} {pose} {animate} flip={enemy} class="h-full" /></div>
  {#if !ghost}
    <span class="unit-name">{def.name}</span>
      {#if card.ascended}
      <span class="unit-stars ascended-star card-ascended-star" aria-label="Ascended">✦</span>
    {:else}
      <span class="unit-stars" style:color={sd.purple ? PURPLE_STAR_COLOR : undefined} aria-label={`${card.stars} stars`}>{"★".repeat(sd.count)}</span>
    {/if}
    {#if fighter}
      <div class="unit-health" role="meter" aria-label={`${def.name} health`} aria-valuenow={fighter.hp} aria-valuemin={0} aria-valuemax={fighter.maxHp} title={`${fighter.hp} / ${fighter.maxHp} HP`}>
        <div class:enemy style:width={`${100 * fighter.hp / fighter.maxHp}%`}></div>
      </div>
      <div class="ultimate-charge" class:ready={charge.ready && fighter.hp > 0} class:casting={castingUltimate}
        role="meter" aria-label={`${def.name} ultimate charge`} aria-valuenow={castingUltimate ? ultEvery : charge.filled} aria-valuemin={0} aria-valuemax={ultEvery}
        aria-valuetext={fighter.hp <= 0 ? "Defeated" : chargeLabel}
        title={`${ULTIMATES[def.attackType].name}: ${chargeLabel}. Every ${ultEvery} personal actions. ${ULTIMATES[def.attackType].description}`}>
        {#each Array(ultEvery) as _, index}<span class:filled={castingUltimate || index < charge.filled}></span>{/each}
        {#if fighter.hp > 0 && (castingUltimate || charge.ready)}<small>{castingUltimate ? "ULT" : "ULT next"}</small>{/if}
      </div>
    {:else}
      <div class="unit-traits" aria-label={`${ATTACK_TYPES[def.attackType].name}; ${def.traits.map(t => TRAIT_SYNERGIES[t].name).join(", ")}`}>
        {#each def.traits as trait, i (trait)}
          <span style:background={colors[i]} title={TRAIT_SYNERGIES[trait].name}></span>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .battle-unit { display: flex; flex-direction: column; align-items: center; width: 100%; user-select: none; }
  .unit-sprite { height: 64px; display: flex; justify-content: center; filter: drop-shadow(0 5px 4px #0008); pointer-events: none; }
  .unit-name { max-width: 104px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 600; line-height: 15px; }
  .unit-stars { color: #f6d453; font-size: 9px; line-height: 11px; letter-spacing: -1px; }
  .unit-traits { display: flex; gap: 3px; height: 8px; align-items: center; }
  .unit-traits span { width: 4px; height: 4px; border-radius: 50%; }
  .unit-health { width: 50px; height: 3px; background: #ffffff12; margin-top: 4px; border-radius: 4px; overflow: hidden; }
  .unit-health > div { height: 100%; background: #92bd90; transition: width 250ms; }
  .unit-health > div.enemy { background: #c47d79; }
  .ultimate-charge { position: relative; display: flex; align-items: center; justify-content: center; gap: 3px; height: 12px; margin-top: 2px; }
  .ultimate-charge > span { width: 5px; height: 5px; border-radius: 50%; background: #ffffff12; border: 1px solid #ffffff25; }
  .ultimate-charge > span.filled { background: #b1a3d8; border-color: #b1a3d8; }
  .ultimate-charge.ready > span.filled, .ultimate-charge.casting > span { background: #f1ca72; border-color: #f1ca72; }
  .ultimate-charge small { position: absolute; top: 10px; white-space: nowrap; font-size: 8px; line-height: 10px; color: #f1ca72; }
  .ascended { filter: drop-shadow(0 0 8px oklch(0.85 0.2 85 / 0.6)) drop-shadow(0 5px 4px #0008); }
  .ascended-star { color: #fcd34d; font-size: 12px; letter-spacing: 0; }
  .defeated { opacity: .35; filter: grayscale(1); }
  .ghost { opacity: .4; }
  @media (max-width: 640px) { .unit-sprite { height: 64px; } .unit-name { font-size: 10px; max-width: 80px; } }
</style>
