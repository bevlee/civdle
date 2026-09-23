<script lang="ts">
  import type { UnitCard } from "$lib/combatData";
  import { activeSynergies } from "$lib/traits";
  import TraitChip from "./TraitChip.svelte";
  let { cards, enemy = false }: { cards: UnitCard[]; enemy?: boolean } = $props();
  let synergies = $derived(activeSynergies(cards));
</script>

<div class="synergies" class:enemy>
  {#each synergies as synergy (synergy.trait)}
    <TraitChip trait={synergy.trait} count={synergy.count} tier={synergy.tier} />
  {/each}
  {#if cards.length === 0}<span class="empty">Place units to build synergies</span>{/if}
</div>

<style>
  .synergies { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }
  .enemy { justify-content: flex-end; }
  .empty { font-size: 15px; color: var(--muted-foreground); }
</style>
