<script lang="ts">
  import { onMount } from "svelte";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { StarUpEventData } from "$lib/gameState.svelte";
  import { MAX_STARS, UNITS } from "$lib/combatData";
  import { starDisplay, PURPLE_STAR_COLOR } from "$lib/rarity";
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
  const fromSd = starDisplay(fromStars);
  const toSd = starDisplay(toStars);

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
    if (phase === "result") requestAnimationFrame(() => onDismiss(event.id));
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="pointer-events-auto animate-overlay-fadein absolute inset-0 flex select-none items-center justify-center overflow-hidden bg-black/90 backdrop-blur-[2px]"
  class:animate-screen-shake={phase === "flash"}
  onclick={handleClick}
>
  {#if phase === "flash"}
    <div class="absolute inset-0 bg-yellow-950/90"></div>
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
        {maxed ? "ASCENSION" : "RANK UP"}
      </p>
      <div class="starup-result relative">
        <UnitCard {unitId} stars={toStars} ascended={maxed} size="lg" showTraits animate />
      </div>
      <p class="flex items-center gap-2 text-2xl font-bold">
        <span style:color={fromSd.purple ? PURPLE_STAR_COLOR : "#facc15"}>{"★".repeat(fromSd.count)}</span>
        <span class="text-muted-foreground">→</span>
        {#if maxed}
          <span class="card-ascended-star star-pop text-4xl" style="animation-delay: 0.5s">✦</span>
        {:else if fromSd.purple === toSd.purple}
          <span style:color={toSd.purple ? PURPLE_STAR_COLOR : "#facc15"}>{"★".repeat(fromSd.count)}<span class="star-pop text-3xl" style="animation-delay: 0.5s">★</span></span>
        {:else}
          <span style:color={PURPLE_STAR_COLOR}><span class="star-pop text-3xl" style="animation-delay: 0.5s">★</span></span>
        {/if}
      </p>
      <p class="text-sm text-muted-foreground">
        {def.name} is now {#if maxed}ascended — a shining legend{:else}{toStars}★{/if}
      </p>
    </div>
  {/if}
</div>
