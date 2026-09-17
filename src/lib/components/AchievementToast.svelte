<script lang="ts">
  import { onMount } from "svelte";
  import { ACHIEVEMENTS_BY_ID } from "$lib/achievements";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { AchievementEventData } from "$lib/gameState.svelte";

  const TOAST_MS = 4500;

  let {
    event,
    onDismiss,
  }: {
    event: QueuedEvent<AchievementEventData>;
    onDismiss: (id: string) => void;
  } = $props();

  let def = $derived(ACHIEVEMENTS_BY_ID[event.data.achievementId]);

  onMount(() => {
    const timeout = setTimeout(() => onDismiss(event.id), TOAST_MS);
    return () => clearTimeout(timeout);
  });
</script>

{#if def}
  <button
    type="button"
    class="animate-achievement-toast pointer-events-auto flex w-80 items-center gap-3 rounded-lg border border-amber-400/60 bg-background/95 px-3 py-2 text-left shadow-xl shadow-black/40 backdrop-blur"
    onclick={() => onDismiss(event.id)}
    data-achievement-toast={def.id}
  >
    <div
      class="flex size-11 shrink-0 items-center justify-center rounded-md bg-amber-400/20 text-2xl"
    >
      {def.icon}
    </div>
    <div class="min-w-0">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
        Achievement unlocked
      </p>
      <p class="truncate text-sm font-semibold">{def.name}</p>
      <p class="truncate text-xs text-muted-foreground">{def.description}</p>
    </div>
  </button>
{/if}
