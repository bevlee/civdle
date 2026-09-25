<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  // Hover card for any element: a short `text`, or a `title` + body via `content`.
  // The trigger is a span, so it can wrap disabled buttons (which swallow
  // pointer events) and sit inside other buttons without nesting interactive elements.
  let {
    text,
    title,
    content,
    side = "top",
    class: className,
    contentClass,
    disabled = false,
    children,
  }: {
    text?: string;
    title?: string;
    content?: Snippet;
    side?: "top" | "bottom" | "left" | "right";
    class?: string;
    contentClass?: string;
    disabled?: boolean;
    children: Snippet;
  } = $props();

  // Touch has no hover, so a tap toggles the hint instead. The tooltip's own
  // handlers close it on pointerdown and click, so those are skipped for touch.
  // Taps on an enabled button inside the hint are left alone so it just acts.
  let open = $state(false);
  let touch = false;
  let wasOpen = false;

  type Handler = ((e: Event) => void) | undefined;
</script>

{#if !disabled && (text || title || content)}
  <Tooltip.Root bind:open>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <span
          {...props}
          class={cn("inline-flex rounded-sm", className)}
          onpointerdown={(e) => {
            touch = e.pointerType !== "mouse";
            wasOpen = open;
            if (!touch) (props.onpointerdown as Handler)?.(e);
          }}
          onpointerup={(e) => {
            (props.onpointerup as Handler)?.(e);
            if (touch && !(e.target as Element).closest("button:not(:disabled)")) open = !wasOpen;
          }}
          onclick={(e) => {
            if (!touch) (props.onclick as Handler)?.(e);
          }}
        >
          {@render children()}
        </span>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content {side} class={contentClass}>
      {#if title}<p class="font-semibold">{title}</p>{/if}
      {#if text}<p class={title ? "text-muted-foreground" : undefined}>{text}</p>{/if}
      {@render content?.()}
    </Tooltip.Content>
  </Tooltip.Root>
{:else}
  {@render children()}
{/if}
