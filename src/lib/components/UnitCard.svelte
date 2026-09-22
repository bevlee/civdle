<script lang="ts">
  import { ATTACK_TYPES, FACTIONS, MAX_STARS, UNITS, type UnitId } from "$lib/combatData";
  import Sprite, { type Pose } from "./Sprite.svelte";
  import { TRAIT_SYNERGIES } from "$lib/traits";
  import { rarityColor, starDisplay, PURPLE_STAR_COLOR } from "$lib/rarity";
  import { cn } from "$lib/utils";

  let {
    unitId,
    stars,
    ascended = false,
    size = "md",
    hp,
    maxHp,
    showTraits = false,
    dim = false,
    pose = "idle",
    animate = false,
    flipSprite = false,
    class: className,
  }: {
    unitId: UnitId;
    stars: number;
    ascended?: boolean;
    size?: "tile" | "sm" | "md" | "lg";
    hp?: number;
    maxHp?: number;
    showTraits?: boolean;
    dim?: boolean;
    pose?: Pose;
    animate?: boolean;
    flipSprite?: boolean;
    class?: string;
  } = $props();

  let def = $derived(UNITS[unitId]);
  let shiny = $derived(stars >= MAX_STARS);
  let sd = $derived(starDisplay(stars));
  let color = $derived(rarityColor(def.baseStars));
  let type = $derived(ATTACK_TYPES[def.attackType]);
  let hpPct = $derived(
    hp !== undefined && maxHp ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : null,
  );
  let hpColor = $derived(
    hpPct === null ? "" : hpPct > 60 ? "bg-green-500" : hpPct > 30 ? "bg-yellow-500" : "bg-red-500",
  );

  const SIZE_CLASS = {
    tile: "w-16 h-16",
    sm: "w-24",
    md: "w-32",
    lg: "w-48",
  } as const;
  const STAR_CLASS = {
    tile: "text-[8px] leading-[9px]",
    sm: "text-[10px] leading-3",
    md: "text-xs leading-3.5",
    lg: "text-base leading-5",
  } as const;
  const NAME_CLASS = {
    tile: "",
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-base",
  } as const;
</script>

<div
  class={cn(
    "relative shrink-0 select-none overflow-hidden rounded-lg border-2 bg-card text-card-foreground",
    SIZE_CLASS[size],
    shiny && (ascended ? "card-ascended-glow" : "card-shiny-glow"),
    dim && "opacity-40 grayscale",
    className,
  )}
  style:border-color={color}
  style:background-color={`color-mix(in oklch, ${FACTIONS[def.faction].color} 18%, var(--card))`}
  title={`${def.name} ${"★".repeat(sd.count)}${sd.purple ? " (purple)" : ""} · ${type.name}`}
>
  {#if size === "tile"}
    <div class="flex h-full w-full items-end justify-center" role="img" aria-label={def.name}>
      <Sprite {unitId} {pose} {animate} flip={flipSprite} class="h-full" />
    </div>
    <div
      class={cn(
        "pointer-events-none absolute inset-x-0 top-0 flex flex-wrap justify-center bg-gradient-to-b from-black/70 to-transparent px-0.5 pt-0.5 pb-1 drop-shadow",
        ascended ? "text-yellow-300 text-sm" : cn(sd.purple ? "" : "text-yellow-400", STAR_CLASS.tile),
      )}
    >
      {#if ascended}
        <span class="card-ascended-star">✦</span>
      {:else}
        {#each Array(sd.count) as _, i (i)}<span style:color={sd.purple ? PURPLE_STAR_COLOR : undefined}>★</span>{/each}
      {/if}
    </div>
    <span
      class="absolute right-0.5 bottom-0.5 rounded bg-black/60 px-0.5 text-[9px] leading-3"
      title={type.name}
    >
      {type.icon}
    </span>
  {:else}
    <div
      class={cn(
        "flex items-center justify-between gap-1 px-1.5 py-0.5 font-bold tracking-tight",
        NAME_CLASS[size],
      )}
      style:background-color={`color-mix(in oklch, ${color} 35%, transparent)`}
    >
      <span class="truncate">{def.name}</span>
      <span class="shrink-0 opacity-90" title={type.name}>{type.icon}</span>
    </div>
    <div role="img" aria-label={def.name}>
      <Sprite {unitId} {pose} {animate} flip={flipSprite} class="w-full" />
    </div>
    <div class={cn("flex flex-wrap justify-center px-1 py-0.5 drop-shadow", ascended ? "text-yellow-300" : cn(sd.purple ? "" : "text-yellow-400", STAR_CLASS[size]))}>
      {#if ascended}
        <span class={cn("card-ascended-star", size === "lg" ? "text-xl" : "text-base")}>✦</span>
      {:else}
        {#each Array(sd.count) as _, i (i)}<span style:color={sd.purple ? PURPLE_STAR_COLOR : undefined}>★</span>{/each}
      {/if}
    </div>
    {#if hpPct !== null}
      <div class="mx-1 mb-1 h-1.5 overflow-hidden rounded-full bg-black/50">
        <div class={cn("h-full transition-all duration-300", hpColor)} style:width={`${hpPct}%`}></div>
      </div>
    {/if}
    {#if showTraits}
      <div class="flex flex-wrap justify-center gap-0.5 px-1 pb-1">
        {#each def.traits as trait (trait)}
          <span
            class={cn(
              "rounded px-1 text-[9px] leading-3.5",
              trait === "ascendant" ? "bg-yellow-500/30 text-yellow-300" : "bg-black/40 text-foreground/90",
            )}
          >
            {TRAIT_SYNERGIES[trait].name}
          </span>
        {/each}
      </div>
    {/if}
  {/if}
  {#if shiny}
    <div class={cn("pointer-events-none absolute inset-0", ascended ? "card-ascended-sheen" : "card-shiny")}></div>
  {/if}
</div>
