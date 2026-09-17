<script lang="ts">
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { AchievementEventData } from "$lib/gameState.svelte";
  import AchievementToast from "./AchievementToast.svelte";

  const MAX_VISIBLE = 3;

  let {
    events,
    onDismiss,
  }: {
    events: QueuedEvent[];
    onDismiss: (id: string) => void;
  } = $props();

  // Show the oldest few first so a burst of unlocks queues up in order.
  let toasts = $derived(
    events
      .filter((e): e is QueuedEvent<AchievementEventData> => e.type === "achievement")
      .slice(0, MAX_VISIBLE),
  );
</script>

{#if toasts.length > 0}
  <div
    class="pointer-events-none fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2"
  >
    {#each toasts as event (event.id)}
      <AchievementToast {event} {onDismiss} />
    {/each}
  </div>
{/if}
