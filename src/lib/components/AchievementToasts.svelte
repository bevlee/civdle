<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { prefersReducedMotion } from "svelte/motion";
  import type { Overlay } from "$lib/view/overlayQueue.svelte";
  import { achievementToastNames, achievementToastTitle } from "$lib/view/achievementToast";

  /**
   * One toast for however many achievements just unlocked. Tapping it opens the
   * Achievements tab; otherwise it leaves on its own, and more unlocks arriving
   * while it is up merge in and restart the clock.
   */
  const TOAST_MS = 5000;

  let {
    overlay,
    onOpen,
    onDismiss,
  }: {
    overlay: Extract<Overlay, { kind: "achievements" }> | null;
    onOpen: () => void;
    onDismiss: () => void;
  } = $props();

  let key = $derived(overlay ? overlay.eventIds.join(",") : "");

  $effect(() => {
    if (!key) return;
    const timeout = setTimeout(() => onDismiss(), TOAST_MS);
    return () => clearTimeout(timeout);
  });

  let motion = $derived(prefersReducedMotion.current ? 0 : 1);
</script>

<!-- Always mounted so screen readers hear each toast as it arrives. -->
<div
  role="status"
  class="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[120] flex justify-center md:inset-x-0 md:top-[calc(env(safe-area-inset-top)+0.75rem)]"
>
  {#if overlay}
    <button
      type="button"
      class="pointer-events-auto flex w-full items-center gap-3 rounded-[14px] border border-amber-400/45 bg-card px-3 py-2.5 text-left shadow-xl shadow-black/50 md:w-80"
      in:fly={{ y: -24 * motion, duration: 250 * motion }}
      out:fade={{ duration: 180 * motion }}
      onclick={onOpen}
      data-achievement-toast
    >
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-400/20 text-lg"
        aria-hidden="true">🏆</span
      >
      <span class="flex min-w-0 flex-1 flex-col gap-px">
        <span class="text-sm font-semibold">{achievementToastTitle(overlay.count)}</span>
        <span class="truncate text-xs text-amber-300">{achievementToastNames(overlay.names)}</span>
      </span>
      <span class="text-xl leading-none text-muted-foreground" aria-hidden="true">›</span>
    </button>
  {/if}
</div>
