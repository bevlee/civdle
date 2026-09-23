<script lang="ts">
  import { onMount } from "svelte";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { AgeAdvanceEventData } from "$lib/gameState.svelte";

  let {
    event,
    color,
    onDismiss,
  }: {
    event: QueuedEvent<AgeAdvanceEventData>;
    color: string;
    onDismiss: (id: string) => void;
  } = $props();

  onMount(() => {
    const timeout = setTimeout(() => onDismiss(event.id), 2900);
    return () => clearTimeout(timeout);
  });
</script>

<div class="absolute inset-0 flex items-center justify-center">
  <div
    class="animate-screen-flash absolute inset-0"
    style:background-color={color}
  ></div>
  <div
    class="animate-zoom-text rounded-2xl border-2 bg-background/90 px-8 py-5 text-center shadow-2xl"
    style:border-color={color}
    style:animation-duration="2.8s"
  >
    <p class="text-3xl font-black tracking-tight sm:text-5xl">
      {event.data.ageName} achieved!
    </p>
    {#if event.data.bonusText || event.data.rewards.length}
      <p class="mt-2 text-sm font-semibold text-amber-300 sm:text-base">
        {[event.data.bonusText, ...event.data.rewards].filter(Boolean).join(" · ")}
      </p>
    {/if}
  </div>
</div>
