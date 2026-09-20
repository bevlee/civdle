<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { UnitCard } from "$lib/combatData";
  import { activeSynergies, TRAIT_SYNERGIES } from "$lib/traits";
  let { cards, enemy = false }: { cards: UnitCard[]; enemy?: boolean } = $props();
  let synergies = $derived(activeSynergies(cards));
  const colors: Record<string, string> = { charger: "#dc932e", disruptor: "#c970b7", skirmisher: "#68b5d0", swarm: "#68b493" };
</script>

<Tooltip.Provider delayDuration={0}>
<div class="synergies" class:enemy>
  {#each synergies as synergy (synergy.trait)}
    {@const definition = TRAIT_SYNERGIES[synergy.trait]}
    <Tooltip.Root>
      <Tooltip.Trigger class={`synergy ${synergy.tier > 0 ? "active" : ""}`}
        style={`--trait-color: ${colors[synergy.trait] ?? "#b7a674"}`}>
        <span aria-hidden="true">{synergy.tier > 0 ? "✦" : "◇"}</span>
        {definition.name} {synergy.count}/{synergy.nextThreshold ?? definition.thresholds[1]}
      </Tooltip.Trigger>
      <Tooltip.Content side="bottom" class="flex-col items-start border border-border bg-popover text-popover-foreground p-3">
        <strong>{definition.name} · {synergy.count} deployed</strong>
        {#each definition.tiers as bonus, index}
          <span class={synergy.tier === index + 1 ? "text-amber-300 font-semibold" : "text-muted-foreground"}>
            {definition.thresholds[index]}: {bonus}{synergy.tier === index + 1 ? " · Active" : ""}
          </span>
        {/each}
      </Tooltip.Content>
    </Tooltip.Root>
  {/each}
  {#if cards.length === 0}<span class="empty">Place units to build synergies</span>{/if}
</div>
</Tooltip.Provider>

<style>
  .synergies { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }
  .enemy { justify-content: flex-end; }
  :global(.synergy) { border-radius: 4px; background: #ffffff07; color: #797979; padding: 3px 6px; font-size: 10px; line-height: 1.2; white-space: nowrap; }
  :global(.synergy.active) { color: var(--trait-color); background: color-mix(in srgb, var(--trait-color) 16%, transparent); }
  .empty { font-size: 10px; color: var(--muted-foreground); }
</style>
