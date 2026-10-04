<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { prefersReducedMotion } from "svelte/motion";

  /**
   * What the player earned while away, in the toast stack at the top of the page on load.
   * Leaves on its own, but holds while hovered or focused so it can be read.
   */
  const TOAST_MS = 8000;

  let {
    welcome,
    onDismiss,
  }: {
    welcome: { actions: number; tribute: number } | null;
    onDismiss: () => void;
  } = $props();

  let paused = $state(false);

  $effect(() => {
    if (!welcome || paused) return;
    const timeout = setTimeout(() => onDismiss(), TOAST_MS);
    return () => clearTimeout(timeout);
  });

  let motion = $derived(prefersReducedMotion.current ? 0 : 1);
</script>

{#if welcome}
  <div
    class="pointer-events-auto flex w-full items-start gap-3 rounded-[16px] border border-amber-400/50 bg-card py-3 pr-2 pl-3.5 shadow-2xl shadow-black/60 md:w-96"
    in:fly={{ y: -24 * motion, duration: 250 * motion }}
    out:fade={{ duration: 180 * motion }}
    onmouseenter={() => (paused = true)}
    onmouseleave={() => (paused = false)}
    onfocusin={() => (paused = true)}
    onfocusout={() => (paused = false)}
    role="group"
    aria-label="Welcome back"
    data-welcome-toast
  >
    <span
      class="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-amber-400/20 text-2xl"
      aria-hidden="true">🏕</span
    >
    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
      <span class="text-base font-bold">Welcome back!</span>
      <span class="flex flex-col gap-1">
        {#if welcome.tribute > 0}
          <span class="flex items-baseline gap-1.5 text-sm">
            <b class="text-lg font-bold text-amber-300 tabular-nums">+{welcome.tribute.toLocaleString()}</b>
            <span class="text-muted-foreground">⚔ Tribute from The Abyss</span>
          </span>
        {/if}
        {#if welcome.actions > 0}
          <span class="flex items-baseline gap-1.5 text-sm">
            <b class="text-lg font-bold tabular-nums">{welcome.actions.toLocaleString()}</b>
            <span class="text-muted-foreground">{welcome.actions === 1 ? "action" : "actions"} completed while away</span>
          </span>
        {/if}
      </span>
    </div>
    <button
      type="button"
      class="tap-target -my-1 flex size-8 shrink-0 items-center justify-center text-base text-muted-foreground hover:text-foreground"
      aria-label="Dismiss"
      onclick={onDismiss}
    >
      ✕
    </button>
  </div>
{/if}
