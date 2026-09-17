<script lang="ts">
  import type { UnitId } from "$lib/combatData";
  import UnitCard from "./UnitCard.svelte";
  import { cn } from "$lib/utils";

  let {
    unitId,
    stars,
    size = "lg",
    flipped = false,
    color,
    charging = false,
    chargeSpeed = "0.8s",
    animate = false,
    showTraits = false,
    class: className = "",
  }: {
    unitId: UnitId;
    stars: number;
    size?: "sm" | "md" | "lg";
    /** false shows the card back; true rotates to reveal the front. */
    flipped?: boolean;
    /** Rarity colour for the back's border and glow. */
    color: string;
    charging?: boolean;
    chargeSpeed?: string;
    animate?: boolean;
    showTraits?: boolean;
    class?: string;
  } = $props();

  const WIDTH = { sm: "w-24", md: "w-32", lg: "w-48" } as const;
  const MARK = { sm: "text-3xl", md: "text-4xl", lg: "text-6xl" } as const;
</script>

<div class={cn("flip-card", WIDTH[size], className)} style:--glow={color}>
  <div class="flip-inner" class:flipped>
    <div
      class={cn(
        "flip-back flip-face flex items-center justify-center rounded-lg border-2",
        charging && "summon-charge",
      )}
      style:border-color={color}
      style:--glow={`color-mix(in oklch, ${color} 80%, transparent)`}
      style:--charge-speed={chargeSpeed}
    >
      <span class={cn("font-black opacity-80 drop-shadow", MARK[size])} style:color>?</span>
    </div>
    <div class="flip-face flip-front">
      <UnitCard {unitId} {stars} {size} {showTraits} animate={animate && flipped} />
    </div>
  </div>
</div>
