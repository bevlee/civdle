<script lang="ts">
  import { onMount } from "svelte";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { SummonEventData } from "$lib/gameState.svelte";
  import { UNITS } from "$lib/combatData";
  import { RARITY_NAMES, rarityColor } from "$lib/rarity";
  import UnitCard from "./UnitCard.svelte";

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
  const FLIP_MS = 600;
  const HOLD_MS: Record<number, number> = { 1: 1400, 2: 1600, 3: 2000, 4: 2600, 5: 3400 };

  let phase = $state<"charge" | "flip" | "revealed">("charge");
  let confetti = $state<{ x: number; drift: number; dur: number; delay: number; c: string }[]>([]);

  const PALETTE = ["oklch(0.85 0.18 85)", "oklch(0.8 0.2 340)", "oklch(0.85 0.18 200)", "oklch(0.9 0.18 100)", "oklch(0.75 0.2 280)"];

  onMount(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        phase = "flip";
        if (rarity >= 4) {
          const n = rarity === 5 ? 70 : 24;
          confetti = Array.from({ length: n }, () => ({
            x: Math.random() * 100,
            drift: (Math.random() - 0.5) * 200,
            dur: 1.6 + Math.random() * 1.4,
            delay: Math.random() * 0.5,
            c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          }));
        }
      }, CHARGE_MS[rarity]),
    );
    timers.push(setTimeout(() => (phase = "revealed"), CHARGE_MS[rarity] + FLIP_MS * 0.5));
    timers.push(setTimeout(() => onDismiss(event.id), CHARGE_MS[rarity] + FLIP_MS + HOLD_MS[rarity]));
    return () => timers.forEach(clearTimeout);
  });

  function handleClick() {
    if (phase === "revealed") onDismiss(event.id);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-hidden bg-black/75 backdrop-blur-[2px]"
  class:animate-screen-shake={phase === "flip" && rarity >= 4}
  onclick={handleClick}
>
  {#if phase === "flip" && rarity === 5}
    <div class="animate-screen-flash absolute inset-0 bg-yellow-200"></div>
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
    <div class="relative" style="perspective: 900px">
      {#if phase === "charge"}
        <div
          class="summon-charge flex h-60 w-48 items-center justify-center rounded-xl border-4 bg-gradient-to-br from-zinc-800 to-zinc-950"
          style:border-color={color}
          style:--glow={`color-mix(in oklch, ${color} 80%, transparent)`}
          style:--charge-speed={`${Math.max(0.25, 0.9 - rarity * 0.12)}s`}
        >
          <span class="text-6xl opacity-70" style:color>?</span>
        </div>
      {:else}
        <div class={phase === "flip" ? "summon-flip" : ""}>
          <UnitCard unitId={card.unitId} stars={card.stars} size="lg" showTraits animate />
        </div>
      {/if}
    </div>

    {#if phase === "revealed"}
      <div class="animate-zoom-text text-center">
        <p class="text-2xl font-black tracking-tight" style:color>
          {RARITY_NAMES[rarity]} · {"★".repeat(rarity)}
        </p>
        <p class="text-sm text-muted-foreground">Click to continue</p>
      </div>
    {/if}
  </div>
</div>
