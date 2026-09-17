<script lang="ts">
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { ActionGainEventData } from "$lib/gameState.svelte";
  import GainToast from "./GainToast.svelte";

  const MAX_TOASTS = 4;

  let {
    events,
    onDismiss,
  }: {
    events: QueuedEvent[];
    onDismiss: (id: string) => void;
  } = $props();

  let gainToasts = $derived(
    events.filter(
      (e): e is QueuedEvent<ActionGainEventData> => e.type === "actionGain",
    ),
  );

  // Keep the stack short: when actions are fast, retire the oldest toasts
  // early rather than letting the list grow.
  $effect(() => {
    if (gainToasts.length <= MAX_TOASTS) return;
    for (const stale of gainToasts.slice(0, gainToasts.length - MAX_TOASTS)) {
      onDismiss(stale.id);
    }
  });
</script>

{#if gainToasts.length > 0}
  <div
    class="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-1.5"
    aria-live="polite"
  >
    {#each gainToasts.slice(-MAX_TOASTS) as toast (toast.id)}
      <GainToast id={toast.id} gains={toast.data.gains} onDone={onDismiss} />
    {/each}
  </div>
{/if}
