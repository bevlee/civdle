<script lang="ts">
  import type { BattlePlayback } from "$lib/battlePlayback";
  import { onMount } from "svelte";
  import type { Hit } from "$lib/combatEngine";
  import { cn } from "$lib/utils";

  let {
    playback,
    id,
    hit,
    heal,
    isUltimate = false,
    onDone,
  }: {
    playback: BattlePlayback;
    id: string;
    hit?: Hit;
    heal?: number;
    isUltimate?: boolean;
    onDone: (id: string) => void;
  } = $props();

  onMount(() => {
    const cancel = playback.schedule(() => onDone(id), 1100);
    return cancel;
  });
</script>

<span
  class={cn(
    "animate-popup pointer-events-none absolute top-1 left-1/2 z-20 whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
    heal !== undefined && "text-sm font-semibold text-green-400",
    hit?.dodged && "text-xs font-medium text-muted-foreground italic",
    hit && !hit.dodged && !hit.crit && "text-sm font-medium text-red-300",
    hit && !hit.dodged && hit.crit && "text-lg font-black text-red-400",
    hit && isUltimate && !hit.dodged && "text-orange-300",
  )}
>
  {#if heal !== undefined}
    +{heal}
  {:else if hit?.dodged}
    MISS
  {:else if hit}
    {#if hit.strong}<span class="text-red-500" title="Strong hit">▲</span>{/if}
    {#if hit.weak}<span class="text-sky-300/70" title="Weak hit">▼</span>{/if}
    {hit.damage}{hit.crit ? "!" : ""}
  {/if}
</span>
