<script lang="ts">
  import { onMount } from "svelte";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { StarUpEventData } from "$lib/gameState.svelte";
  import { MAX_STARS, UNITS, getPromotionCost } from "$lib/combatData";
  import { GOLD_STAR_COLOR, PURPLE_STAR_COLOR, starColor, starSlots } from "$lib/rarity";
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
  const purple = toStars > 5 && !maxed;
  const color = purple ? PURPLE_STAR_COLOR : GOLD_STAR_COLOR;

  // The copies consumed by this promotion fly in from a fan around the hero.
  const copyCount = Math.min(5, getPromotionCost(toStars)?.copies ?? 1);
  // Arc from the left, over the top, to the right; a lone copy comes from the left.
  const copies = Array.from({ length: copyCount }, (_, i) => {
    const angle = copyCount === 1 ? Math.PI : Math.PI - (i * Math.PI) / (copyCount - 1);
    return { dx: Math.cos(angle) * 240, dy: -Math.sin(angle) * 170, delay: i * 90 };
  });

  // The star slot that changes: a new gold star, or a gold slot turning purple.
  const toRow = starSlots(toStars);
  const changedSlot = toStars > 5 ? toStars - 6 : toStars - 1;

  // Escalate with the tier, like summon reveals do with rarity.
  const GATHER_MS = 900 + copyCount * 90;
  const HOLD_MS = maxed ? 3400 : purple ? 2600 : 2200;

  let phase = $state<"gather" | "result">("gather");
  let skippedAt = $state(0);

  onMount(() => {
    const timers = [
      setTimeout(() => (phase = "result"), GATHER_MS),
      setTimeout(() => onDismiss(event.id), GATHER_MS + HOLD_MS),
    ];
    return () => timers.forEach(clearTimeout);
  });

  function handleClick() {
    if (phase === "result") {
      if (Date.now() - skippedAt < 300) return;
      requestAnimationFrame(() => onDismiss(event.id));
    } else {
      skippedAt = Date.now();
      phase = "result";
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="pointer-events-auto animate-overlay-fadein absolute inset-0 flex select-none items-center justify-center overflow-hidden bg-black/90 backdrop-blur-[2px]"
  class:animate-screen-shake={phase === "result" && (purple || maxed)}
  onclick={handleClick}
  style:--tier={color}
>
  {#if phase === "result"}
    <div class="animate-screen-flash absolute inset-0" style:background-color={`color-mix(in oklch, ${color} 35%, black)`}></div>
    <div
      class="summon-rays pointer-events-none absolute h-[160vmax] w-[160vmax]"
      style:--ray-color={`color-mix(in oklch, ${color} ${maxed ? 55 : 40}%, transparent)`}
    ></div>
    <div class="burst pointer-events-none absolute h-64 w-64"></div>
  {/if}

  <div class="relative flex flex-col items-center gap-4">
    <p
      class="title text-4xl font-black tracking-widest"
      class:invisible={phase !== "result"}
      style:color
    >
      {maxed ? "ASCENSION" : "RANK UP"}
    </p>

    <div class="relative">
      {#if phase === "gather"}
        {#each copies as c, i (i)}
          <div
            class="copy absolute top-1/2 left-1/2"
            style:--dx={`${c.dx}px`}
            style:--dy={`${c.dy}px`}
            style:--gather={`${GATHER_MS - 150}ms`}
            style:animation-delay={`${c.delay}ms`}
          >
            <UnitCard {unitId} stars={def.baseStars} size="sm" />
          </div>
        {/each}
        <div class="summon-charge rounded-lg" style:--glow={`color-mix(in oklch, ${color} 70%, transparent)`} style:--charge-speed="0.5s">
          <UnitCard {unitId} stars={fromStars} size="lg" showTraits />
        </div>
      {:else}
        <div class="starup-result">
          <UnitCard {unitId} stars={toStars} ascended={maxed} size="lg" showTraits animate />
        </div>
      {/if}
    </div>

    <div class="flex flex-col items-center gap-1" class:invisible={phase !== "result"}>
      <p class="flex items-center text-3xl leading-none">
        {#if toRow.maxed}
          <span class="card-ascended-star star-pop" style="animation-delay: 0.25s">✦</span>
        {:else}
          {#each toRow.slots as tier, i (i)}
            {#if i === changedSlot}
              <span class="star-pop glow" style:color={starColor(tier)} style="animation-delay: 0.25s">★</span>
            {:else}
              <span style:color={starColor(tier)}>★</span>
            {/if}
          {/each}
        {/if}
      </p>
      <p class="text-sm text-muted-foreground">
        {def.name} · {fromStars}★ → <span class="font-bold" style:color>{toStars}★</span>
        {#if maxed}— ascended{/if}
      </p>
      <p class="text-xs text-white/40">Click to continue</p>
    </div>

    {#if phase === "gather"}
      <p class="absolute -bottom-10 text-xs text-white/40">Click to skip</p>
    {/if}
  </div>
</div>

<style>
  /* Copies start fanned out, hover, then get pulled into the hero and vanish. */
  @keyframes gather {
    0% {
      transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.6);
      opacity: 0;
    }
    25% {
      transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.85);
      opacity: 1;
    }
    55% {
      transform: translate(-50%, -50%) translate(calc(var(--dx) * 1.08), calc(var(--dy) * 1.08)) scale(0.85);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(0.2);
      opacity: 0;
      filter: brightness(3);
    }
  }
  .copy {
    z-index: 1;
    opacity: 0;
    animation: gather var(--gather) cubic-bezier(0.6, 0, 0.8, 0.4) forwards;
  }

  @keyframes title-in {
    0% {
      transform: scale(0.5);
      opacity: 0;
    }
    60% {
      transform: scale(1.1);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  .title:not(.invisible) {
    animation: title-in 0.5s cubic-bezier(0.3, 1.4, 0.5, 1) forwards;
    text-shadow: 0 0 14px color-mix(in oklch, var(--tier) 80%, transparent);
  }

  @keyframes burst {
    0% {
      transform: scale(0.2);
      opacity: 1;
    }
    100% {
      transform: scale(2.6);
      opacity: 0;
    }
  }
  .burst {
    border-radius: 9999px;
    background: radial-gradient(circle, white 0%, color-mix(in oklch, var(--tier) 60%, transparent) 35%, transparent 70%);
    animation: burst 0.9s ease-out forwards;
  }

  .glow {
    text-shadow: 0 0 10px currentColor;
  }
</style>
