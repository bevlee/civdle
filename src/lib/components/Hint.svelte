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
</script>

{#if !disabled && (text || title || content)}
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <span {...props} class={cn("inline-flex rounded-sm", className)}>
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
