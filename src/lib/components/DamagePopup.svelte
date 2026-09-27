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
    "animate-popup pointer-events-none absolute top-1 left-1/2 z-20 flex items-baseline gap-1 whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] max-sm:flex-col max-sm:items-center max-sm:gap-0 max-sm:leading-tight",
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
    <span>{hit.damage}{hit.crit ? " crit!" : ""}</span>
    {#if hit.strong}<span class="text-[10px] font-bold text-red-500">Strong</span>{/if}
    {#if hit.weak}<span class="text-[10px] font-bold text-sky-300/70">Weak</span>{/if}
  {/if}
</span>
