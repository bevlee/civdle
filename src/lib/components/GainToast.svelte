<script lang="ts">
  import { onMount } from "svelte";
  import { RESOURCES } from "$lib/gameData";
  import type { RolledOutput } from "$lib/gameEngine";
  import { cn } from "$lib/utils";

  let {
    id,
    gains,
    duration = 1600,
    onDone,
  }: {
    id: string;
    gains: RolledOutput[];
    duration?: number;
    onDone: (id: string) => void;
  } = $props();

  onMount(() => {
    const timeout = setTimeout(() => onDone(id), duration);
    return () => clearTimeout(timeout);
  });

  let anyBonus = $derived(gains.some((g) => g.bonus));
</script>

<div
  class={cn(
    "animate-toast-in pointer-events-none flex w-fit items-center gap-x-2 rounded-md border px-2.5 py-1 text-sm shadow-sm",
    anyBonus
      ? "border-amber-500/50 bg-amber-500/10"
      : "border-emerald-500/30 bg-emerald-500/10",
  )}
  style={`--toast-duration: ${duration}ms`}
  role="status"
>
  {#each gains as gain, i (gain.resource)}
    {#if i > 0}<span class="text-muted-foreground/50">·</span>{/if}
    <span
      class={cn(
        "font-semibold tabular-nums",
        gain.bonus ? "text-amber-300" : "text-emerald-300",
      )}
    >
      +{gain.amount}
      <span class="font-normal">{RESOURCES[gain.resource].name}</span>
      {#if gain.bonus}
        <span class="ml-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400"
          >bonus</span
        >
      {/if}
    </span>
  {/each}
</div>
