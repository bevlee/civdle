<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { Modifier } from "$lib/gameEngine";
  import type { Snippet } from "svelte";

  // Hover breakdown for a buffed number: base value, each active buff, final value.
  let {
    label,
    base,
    final,
    modifiers,
    format,
    children,
  }: {
    label: string;
    base: number;
    final: number;
    modifiers: Modifier[];
    format: (value: number) => string;
    children: Snippet;
  } = $props();
</script>

<Tooltip.Root>
  <Tooltip.Trigger
    class="cursor-help rounded-sm underline decoration-dotted decoration-muted-foreground/60 underline-offset-4"
  >
    {@render children()}
  </Tooltip.Trigger>
  <Tooltip.Content side="bottom" class="items-start px-3 py-2">
    <div class="flex min-w-40 flex-col gap-1 text-xs">
      <div class="flex justify-between gap-4">
        <span class="opacity-70">Base {label}</span>
        <span class="tabular-nums">{format(base)}</span>
      </div>
      {#if modifiers.length === 0}
        <p class="opacity-70">No active buffs</p>
      {:else}
        {#each modifiers as m, i (i)}
          <div class="flex justify-between gap-4">
            <span>{m.source}</span>
            <span class="tabular-nums">{m.effect}</span>
          </div>
        {/each}
      {/if}
      <div class="mt-1 flex justify-between gap-4 border-t border-background/20 pt-1 font-semibold">
        <span>Current</span>
        <span class="tabular-nums">{format(final)}</span>
      </div>
    </div>
  </Tooltip.Content>
</Tooltip.Root>
