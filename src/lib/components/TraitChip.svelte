<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { Trait } from "$lib/combatData";
  import { TRAIT_SYNERGIES } from "$lib/traits";

  let {
    trait,
    count,
    tier,
    lockedLabel = null,
    size = "sm",
  }: {
    trait: Trait;
    count: number;
    tier: number;
    /** Star gate this hero still needs before the trait counts, e.g. "8★". */
    lockedLabel?: string | null;
    size?: "sm" | "lg";
  } = $props();

  const colors: Partial<Record<Trait, string>> = { charger: "#dc932e", disruptor: "#c970b7", skirmisher: "#68b5d0", swarm: "#68b493" };
  let definition = $derived(TRAIT_SYNERGIES[trait]);
  let active = $derived(tier > 0 && !lockedLabel);
  let max = $derived(definition.thresholds[definition.thresholds.length - 1]);
</script>

<Tooltip.Root>
  <Tooltip.Trigger class={`synergy ${size} ${active ? "active" : ""} ${lockedLabel ? "locked" : ""}`}
    style={`--trait-color: ${colors[trait] ?? "#b7a674"}`}>
    <span aria-hidden="true">{lockedLabel ? "🔒" : active ? "✦" : "◇"}</span>
    {definition.name} {lockedLabel ?? `${count}/${max}`}
  </Tooltip.Trigger>
  <Tooltip.Content side="bottom" class={`z-[100] p-3 ${size === "lg" ? "text-[15px]" : ""}`}>
    <strong>{definition.name} · {count} deployed</strong>
    {#if lockedLabel}<span class="text-muted-foreground">This hero adds to it from {lockedLabel}.</span>{/if}
    {#each definition.tiers as bonus, index}
      {@const current = active && tier === index + 1}
      <span class={current ? "text-amber-300 font-semibold" : "text-muted-foreground"}>
        {definition.thresholds[index]}: {bonus}{current ? " · Active" : ""}
      </span>
    {/each}
  </Tooltip.Content>
</Tooltip.Root>

<style>
  :global(.synergy) { border-radius: 4px; background: #ffffff07; color: #797979; padding: 3px 6px; font-size: 13px; line-height: 1.2; white-space: nowrap; }
  :global(.synergy.lg) { padding: 5px 9px; font-size: 15px; }
  :global(.synergy.active) { color: var(--trait-color); background: color-mix(in srgb, var(--trait-color) 16%, transparent); }
  :global(.synergy.locked) { opacity: 0.6; }
</style>
