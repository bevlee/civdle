<script lang="ts">
  import { onMount } from "svelte";
  import { RESOURCES } from "$lib/gameData";
  import type { RolledOutput } from "$lib/gameEngine";

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
</script>

<div
  class="animate-toast-in pointer-events-none flex w-fit items-center gap-x-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-sm shadow-sm backdrop-blur-sm"
  style={`--toast-duration: ${duration}ms`}
  role="status"
>
  {#each gains as gain, i (gain.resource)}
    {#if i > 0}<span class="text-muted-foreground/50">·</span>{/if}
    <span class="font-semibold tabular-nums text-emerald-300">
      +{gain.amount}
      <span class="font-normal">{RESOURCES[gain.resource].name}</span>
    </span>
  {/each}
</div>
