<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { prefersReducedMotion } from "svelte/motion";

  /**
   * A notice from the game (e.g. training stopped), in the toast stack at the top of the page.
   * Leaves on its own, but holds while hovered or focused so it can be read.
   */
  const TOAST_MS = 6000;

  let {
    message,
    onDismiss,
  }: {
    message: { title: string; detail: string } | null;
    onDismiss: () => void;
  } = $props();

  let paused = $state(false);

  $effect(() => {
    if (!message || paused) return;
    const timeout = setTimeout(() => onDismiss(), TOAST_MS);
    return () => clearTimeout(timeout);
  });

  let motion = $derived(prefersReducedMotion.current ? 0 : 1);
</script>

{#if message}
  <div
    class="pointer-events-auto flex w-full items-start gap-3 rounded-[16px] border border-red-400/50 bg-card py-3 pr-2 pl-3.5 shadow-2xl shadow-black/60 md:w-96"
    in:fly={{ y: -24 * motion, duration: 250 * motion }}
    out:fade={{ duration: 180 * motion }}
    onmouseenter={() => (paused = true)}
    onmouseleave={() => (paused = false)}
    onfocusin={() => (paused = true)}
    onfocusout={() => (paused = false)}
    role="group"
    aria-label={message.title}
    data-message-toast
  >
    <span
      class="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-red-400/15 text-2xl"
      aria-hidden="true">⚠️</span
    >
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="text-base font-bold text-red-300">{message.title}</span>
      <span class="text-sm text-muted-foreground">{message.detail}</span>
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
