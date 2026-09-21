<script lang="ts">
  import { onMount } from "svelte";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { SummonPackEventData } from "$lib/gameState.svelte";
  import { UNITS } from "$lib/combatData";
  import { rarityColor } from "$lib/rarity";
  import FlipCard from "./FlipCard.svelte";

  let {
    event,
    onDismiss,
  }: {
    event: QueuedEvent<SummonPackEventData>;
    onDismiss: (id: string) => void;
  } = $props();

  // The overlay is keyed by event id, so capturing the initial event is intended.
  // svelte-ignore state_referenced_locally
  const cards = event.data.cards;
  const rarities = cards.map((c) => UNITS[c.unitId].baseStars);
  const best = Math.max(...rarities);

  const START_MS = 700;
  const STAGGER_MS = 420;
  const FLIP_MS = 650;

  // Shrink the 5-wide grid on narrow viewports (5 md cards + gaps ≈ 720px).
  let innerWidth = $state(1024);
  let scale = $derived(Math.min(1, (innerWidth - 24) / 720));

  let flippedCount = $state(0);
  let done = $state(false);
  let shakeKey = $state(0);
  let flashKey = $state(0);
  let confetti = $state<{ x: number; drift: number; dur: number; delay: number; c: string }[]>([]);

  const PALETTE = ["oklch(0.85 0.18 85)", "oklch(0.8 0.2 340)", "oklch(0.85 0.18 200)", "oklch(0.9 0.18 100)", "oklch(0.75 0.2 280)"];

  let summary = $derived(
    [5, 4, 3, 2, 1]
      .map((r) => ({ r, n: rarities.filter((x) => x === r).length }))
      .filter((x) => x.n > 0),
  );

  onMount(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    cards.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          flippedCount = i + 1;
          const r = rarities[i];
          if (r >= 4) shakeKey += 1;
          if (r === 5) {
            flashKey += 1;
            confetti = [
              ...confetti,
              ...Array.from({ length: 40 }, () => ({
                x: Math.random() * 100,
                drift: (Math.random() - 0.5) * 200,
                dur: 1.6 + Math.random() * 1.4,
                delay: Math.random() * 0.3,
                c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
              })),
            ];
          }
        }, START_MS + i * STAGGER_MS),
      );
    });
    timers.push(setTimeout(() => (done = true), START_MS + cards.length * STAGGER_MS + FLIP_MS));
    return () => timers.forEach(clearTimeout);
  });

  function handleClick() {
    if (done) {
      onDismiss(event.id);
    } else {
      const alreadyFlipped = flippedCount;
      flippedCount = cards.length;
      for (let i = alreadyFlipped; i < cards.length; i++) {
        const r = rarities[i];
        if (r >= 4) shakeKey += 1;
        if (r === 5) {
          flashKey += 1;
          confetti = [
            ...confetti,
            ...Array.from({ length: 40 }, () => ({
              x: Math.random() * 100,
              drift: (Math.random() - 0.5) * 200,
              dur: 1.6 + Math.random() * 1.4,
              delay: Math.random() * 0.3,
              c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            })),
          ];
        }
      }
      done = true;
    }
  }
</script>

<svelte:window bind:innerWidth />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="pointer-events-auto animate-overlay-fadein absolute inset-0 flex items-center justify-center overflow-hidden bg-black/90 backdrop-blur-[2px]"
  onclick={handleClick}
>
  {#key flashKey}
    {#if flashKey > 0}
      <div class="animate-screen-flash absolute inset-0 bg-yellow-900/80"></div>
    {/if}
  {/key}

  {#if best >= 3}
    <div
      class="summon-rays pointer-events-none absolute h-[160vmax] w-[160vmax]"
      style:--ray-color={`color-mix(in oklch, ${rarityColor(best)} ${best === 5 ? 45 : best === 4 ? 32 : 20}%, transparent)`}
    ></div>
  {/if}

  {#each confetti as c, i (i)}
    <span
      class="confetti"
      style:left={`${c.x}%`}
      style:--drift={`${c.drift}px`}
      style:--dur={`${c.dur}s`}
      style:--delay={`${c.delay}s`}
      style:--c={c.c}
    ></span>
  {/each}

  {#key shakeKey}
    <div
      class="relative flex flex-col items-center gap-4"
      class:animate-screen-shake={shakeKey > 0}
      style:transform={`scale(${scale})`}
    >
      <p class="text-lg font-bold tracking-widest text-muted-foreground uppercase">10-card pack</p>
      <div class="grid grid-cols-5 gap-3">
        {#each cards as card, i (card.id)}
          <FlipCard
            unitId={card.unitId}
            stars={card.stars}
            size="md"
            color={rarityColor(rarities[i])}
            flipped={i < flippedCount}
            charging={i === flippedCount}
            chargeSpeed="0.5s"
            animate
          />
        {/each}
      </div>
      <div class="flex h-10 flex-col items-center justify-center">
        {#if done}
          <p class="animate-zoom-text flex flex-wrap items-center justify-center gap-3 text-base font-bold">
            {#each summary as s (s.r)}
              <span style:color={rarityColor(s.r)}>{"★".repeat(s.r)} ×{s.n}</span>
            {/each}
          </p>
          <p class="text-sm text-muted-foreground">Click to continue</p>
        {:else}
          <p class="text-xs text-white/40">Click to skip</p>
        {/if}
      </div>
    </div>
  {/key}
</div>
