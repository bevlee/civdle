<script lang="ts">
  import { onMount } from "svelte";
  import type { AgeId } from "$lib/gameData";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";

  interface AgeAdvanceEventData {
    ageId: AgeId;
    ageName: string;
    speedPct: number;
    outputPct: number;
  }

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
    const timeout = setTimeout(() => onDismiss(event.id), 1700);
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
  >
    <p class="text-3xl font-black tracking-tight sm:text-5xl">
      {event.data.ageName} achieved!
    </p>
  </div>
</div>
