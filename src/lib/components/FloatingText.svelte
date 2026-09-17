<script lang="ts">
  import { onMount } from "svelte";
  import { cn } from "$lib/utils";

  let {
    id,
    text,
    class: className,
    duration = 1100,
    onDone,
  }: {
    id: string;
    text: string;
    class?: string;
    duration?: number;
    onDone: (id: string) => void;
  } = $props();

  onMount(() => {
    const timeout = setTimeout(() => onDone(id), duration);
    return () => clearTimeout(timeout);
  });
</script>

<span
  class={cn(
    "animate-float-up pointer-events-none absolute left-1/2 top-0 z-10 whitespace-nowrap font-bold",
    className,
  )}
>
  {text}
</span>
