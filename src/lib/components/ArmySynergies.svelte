<script lang="ts">
  import type { UnitCard } from "$lib/combatData";
  import { activeSynergies, TRAIT_SYNERGIES } from "$lib/traits";
  let { cards, enemy = false }: { cards: UnitCard[]; enemy?: boolean } = $props();
  let synergies = $derived(activeSynergies(cards));
  const colors: Record<string, string> = { charger: "#dc932e", disruptor: "#c970b7", skirmisher: "#68b5d0", swarm: "#68b493" };
</script>

<div class="synergies" class:enemy>
  {#each synergies as synergy (synergy.trait)}
    {@const definition = TRAIT_SYNERGIES[synergy.trait]}
    <span
      class="synergy" class:active={synergy.tier > 0}
      style:--trait-color={colors[synergy.trait] ?? "#b7a674"}
      title={synergy.tier > 0 ? definition.tiers[synergy.tier - 1] : `Need ${synergy.nextThreshold}: ${definition.tiers[0]}`}
    >
      <span aria-hidden="true">{synergy.tier > 0 ? "✦" : "◇"}</span>
      {definition.name} {synergy.count}/{synergy.nextThreshold ?? definition.thresholds[1]}
    </span>
  {/each}
  {#if cards.length === 0}<span class="empty">Place units to build synergies</span>{/if}
</div>

<style>
  .synergies { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }
  .enemy { justify-content: flex-end; }
  .synergy { border-radius: 4px; background: #ffffff07; color: #797979; padding: 3px 6px; font-size: 10px; line-height: 1.2; white-space: nowrap; }
  .synergy.active { color: var(--trait-color); background: color-mix(in srgb, var(--trait-color) 16%, transparent); }
  .empty { font-size: 10px; color: var(--muted-foreground); }
</style>
