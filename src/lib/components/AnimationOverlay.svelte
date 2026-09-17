<script lang="ts">
  import type { AgeId } from "$lib/gameData";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import AgeAdvanceEffect from "./AgeAdvanceEffect.svelte";

  interface AgeAdvanceEventData {
    ageId: AgeId;
    ageName: string;
    speedPct: number;
    outputPct: number;
  }

  const AGE_FLASH_COLOR: Record<AgeId, string> = {
    stoneAge: "oklch(0.7 0.01 90)",
    bronzeAge: "oklch(0.72 0.15 65)",
    ironAge: "oklch(0.5 0.02 250)",
    medieval: "oklch(0.4 0.13 264)",
    renaissance: "oklch(0.82 0.16 95)",
  };

  let {
    events,
    onDismiss,
  }: {
    events: QueuedEvent[];
    onDismiss: (id: string) => void;
  } = $props();

  let ageEvents = $derived(
    events.filter(
      (e): e is QueuedEvent<AgeAdvanceEventData> => e.type === "ageAdvance",
    ),
  );
</script>

{#if ageEvents.length > 0}
  <div class="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
    {#each ageEvents as event (event.id)}
      <AgeAdvanceEffect
        {event}
        color={AGE_FLASH_COLOR[event.data.ageId]}
        {onDismiss}
      />
    {/each}
  </div>
{/if}
