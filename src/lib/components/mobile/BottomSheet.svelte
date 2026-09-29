<script lang="ts">
  import { Dialog } from "bits-ui";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils.js";

  /**
   * A panel that slides up from the bottom edge over a dimmed backdrop. Built on the
   * bits-ui Dialog, so it traps focus while open, closes on Esc or a backdrop tap, and
   * hands focus back to whatever had it before it opened.
   */
  let {
    open,
    onClose,
    title,
    hideTitle = false,
    onOpenAutoFocus,
    class: className,
    children,
  }: {
    open: boolean;
    onClose: () => void;
    /** Names the sheet for assistive tech; shown as a heading unless `hideTitle`. */
    title?: string;
    hideTitle?: boolean;
    /** Call `preventDefault()` and focus something else to skip the first-tabbable default. */
    onOpenAutoFocus?: (event: Event) => void;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<Dialog.Root
  {open}
  onOpenChange={(next) => {
    if (!next) onClose();
  }}
>
  <Dialog.Portal>
    <Dialog.Overlay
      data-slot="bottom-sheet-overlay"
      class="fixed inset-0 z-[90] bg-black/60 duration-220 ease-out motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0"
    />
    <Dialog.Content
      data-slot="bottom-sheet"
      {onOpenAutoFocus}
      class={cn(
        "fixed inset-x-0 bottom-0 z-[90] mx-auto flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-[20px] border border-b-0 border-border bg-card text-card-foreground shadow-2xl shadow-black/50 outline-none",
        "duration-220 ease-out motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-bottom motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:slide-out-to-bottom",
        className,
      )}
    >
      <div class="flex shrink-0 justify-center pt-2 pb-1" aria-hidden="true">
        <span class="h-1 w-10 rounded-full bg-muted-foreground/40"></span>
      </div>
      {#if title}
        <Dialog.Title class={hideTitle ? "sr-only" : "shrink-0 px-4 pt-1 pb-2 text-base font-semibold"}>
          {title}
        </Dialog.Title>
      {/if}
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {@render children()}
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
