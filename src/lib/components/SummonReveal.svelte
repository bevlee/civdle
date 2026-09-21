<script lang="ts">
  import { onMount } from "svelte";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { SummonEventData } from "$lib/gameState.svelte";
  import { UNITS } from "$lib/combatData";
  import { RARITY_NAMES, rarityColor } from "$lib/rarity";
  import FlipCard from "./FlipCard.svelte";

  let {
    event,
    onDismiss,
  }: {
    event: QueuedEvent<SummonEventData>;
    onDismiss: (id: string) => void;
  } = $props();

  // The overlay is keyed by event id, so capturing the initial event is intended.
  // svelte-ignore state_referenced_locally
  const card = event.data.card;
  const rarity = UNITS[card.unitId].baseStars;
  const color = rarityColor(rarity);

  // Escalating suspense: higher rarity charges longer, shakes, flashes, showers confetti.
  const CHARGE_MS: Record<number, number> = { 1: 350, 2: 650, 3: 1000, 4: 1500, 5: 2200 };
  const FLIP_MS = 650;
  const HOLD_MS: Record<number, number> = { 1: 1400, 2: 1600, 3: 2000, 4: 2600, 5: 3400 };

  let phase = $state<"charge" | "flip" | "revealed">("charge");
  let confetti = $state<{ x: number; drift: number; dur: number; delay: number; c: string }[]>([]);

  const PALETTE = ["oklch(0.85 0.18 85)", "oklch(0.8 0.2 340)", "oklch(0.85 0.18 200)", "oklch(0.9 0.18 100)", "oklch(0.75 0.2 280)"];

  function makeConfetti(n: number) {
    return Array.from({ length: n }, () => ({
      x: Math.random() * 100,
      drift: (Math.random() - 0.5) * 200,
      dur: 1.6 + Math.random() * 1.4,
      delay: Math.random() * 0.5,
      c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    }));
  }

  onMount(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        phase = "flip";
        if (rarity >= 4) confetti = makeConfetti(rarity === 5 ? 70 : 24);
      }, CHARGE_MS[rarity]),
    );
    timers.push(setTimeout(() => (phase = "revealed"), CHARGE_MS[rarity] + FLIP_MS));
    timers.push(setTimeout(() => onDismiss(event.id), CHARGE_MS[rarity] + FLIP_MS + HOLD_MS[rarity]));
    return () => timers.forEach(clearTimeout);
  });

  function handleClick() {
    if (phase === "revealed") {
      onDismiss(event.id);
    } else {
      phase = "revealed";
      if (rarity >= 4) confetti = makeConfetti(rarity === 5 ? 70 : 24);
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="pointer-events-auto animate-overlay-fadein absolute inset-0 flex items-center justify-center overflow-hidden bg-black/90 backdrop-blur-[2px]"
  class:animate-screen-shake={phase === "flip" && rarity >= 4}
  onclick={handleClick}
>
  {#if phase === "flip" && rarity === 5}
    <div class="animate-screen-flash absolute inset-0 bg-yellow-900/80"></div>
  {/if}

  {#if rarity >= 3}
    <div
      class="summon-rays pointer-events-none absolute h-[160vmax] w-[160vmax]"
      style:--ray-color={`color-mix(in oklch, ${color} ${rarity === 5 ? 55 : rarity === 4 ? 40 : 25}%, transparent)`}
      style:opacity={phase === "charge" ? 0.5 : 1}
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

  <div class="relative flex flex-col items-center gap-4">
    <FlipCard
      unitId={card.unitId}
      stars={card.stars}
      size="lg"
      {color}
      flipped={phase !== "charge"}
      charging={phase === "charge"}
      chargeSpeed={`${Math.max(0.25, 0.9 - rarity * 0.12)}s`}
      showTraits
      animate
    />

    {#if phase === "revealed"}
      <div class="animate-zoom-text text-center">
        <p class="text-2xl font-black tracking-tight" style:color>
          {RARITY_NAMES[rarity]} · {"★".repeat(rarity)}
        </p>
        <p class="text-sm text-muted-foreground">Click to continue</p>
      </div>
    {:else}
      <p class="absolute bottom-6 text-xs text-white/40">Click to skip</p>
    {/if}
  </div>
</div>
