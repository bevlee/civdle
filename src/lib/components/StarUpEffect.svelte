<script lang="ts">
  import { onMount } from "svelte";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { StarUpEventData } from "$lib/gameState.svelte";
  import { MAX_STARS, UNITS } from "$lib/combatData";
  import UnitCard from "./UnitCard.svelte";

  let {
    event,
    onDismiss,
  }: {
    event: QueuedEvent<StarUpEventData>;
    onDismiss: (id: string) => void;
  } = $props();

  // The overlay is keyed by event id, so capturing the initial event is intended.
  // svelte-ignore state_referenced_locally
  const { unitId, fromStars, toStars } = event.data;
  const def = UNITS[unitId];
  const maxed = toStars >= MAX_STARS;

  let phase = $state<"approach" | "flash" | "result">("approach");

  onMount(() => {
    const timers = [
      setTimeout(() => (phase = "flash"), 800),
      setTimeout(() => (phase = "result"), 1000),
      setTimeout(() => onDismiss(event.id), maxed ? 4200 : 3400),
    ];
    return () => timers.forEach(clearTimeout);
  });

  function handleClick() {
    if (phase === "result") onDismiss(event.id);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-hidden bg-black/75 backdrop-blur-[2px]"
  class:animate-screen-shake={phase === "flash"}
  onclick={handleClick}
>
  {#if phase === "flash"}
    <div class="absolute inset-0 bg-white"></div>
  {/if}

  {#if phase === "result"}
    <div class="summon-rays pointer-events-none absolute h-[160vmax] w-[160vmax]" style:--ray-color="oklch(0.9 0.18 85 / 0.4)"></div>
    <div class="starup-burst pointer-events-none absolute h-64 w-64"></div>
  {/if}

  {#if phase === "approach"}
    <div class="flex items-center gap-2">
      <div class="starup-left"><UnitCard {unitId} stars={fromStars} size="md" /></div>
      <span class="text-3xl font-black text-yellow-300">+</span>
      <div class="starup-right"><UnitCard {unitId} stars={fromStars} size="md" /></div>
    </div>
  {:else if phase === "result"}
    <div class="relative flex flex-col items-center gap-4">
      <p class="animate-zoom-text text-4xl font-black tracking-widest text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]">
        {maxed ? "MAX RANK" : "RANK UP"}
      </p>
      <div class="starup-result relative">
        <UnitCard {unitId} stars={toStars} size="lg" showTraits animate />
      </div>
      <p class="flex items-center gap-2 text-2xl font-bold text-yellow-400">
        <span>{"★".repeat(fromStars)}</span>
        <span class="text-muted-foreground">→</span>
        <span>{"★".repeat(fromStars)}<span class="star-pop text-3xl" style="animation-delay: 0.5s">★</span></span>
      </p>
      <p class="text-sm text-muted-foreground">
        {def.name} is now {toStars}★{maxed ? " — a shining legend" : ""}
      </p>
    </div>
  {/if}
</div>
