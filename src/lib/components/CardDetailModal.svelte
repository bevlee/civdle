<script lang="ts">
  import {
    ATTACK_TYPES,
    FACTIONS,
    MAX_STARS,
    UNITS,
    ULTIMATES,
    computeCardStats,
    getPromotionCost,
    type UnitCard as UnitCardT,
  } from "$lib/combatData";
  import { RESOURCES } from "$lib/gameData";
  import { activeTraitsForCard, countTraits, tierFor } from "$lib/traits";
  import { RARITY_NAMES, rarityColor } from "$lib/rarity";
  import { slotName } from "$lib/dragPlace";
  import { MediaQuery } from "svelte/reactivity";
  import { Button } from "$lib/components/ui/button";
  import Hint from "./Hint.svelte";
  import Sprite from "./Sprite.svelte";
  import StarRow from "./StarRow.svelte";
  import TraitChip from "./TraitChip.svelte";
  import BottomSheet from "./mobile/BottomSheet.svelte";
  import type { Fighter } from "$lib/combatEngine";

  let {
    card,
    inParty = false,
    slot,
    partyFull = false,
    canPromoteNow = false,
    copies = [],
    resources = {},
    locked = false,
    readOnly = false,
    statMult = 1,
    fighter,
    onAddToParty,
    onRemoveFromParty,
    partyCards = [],
    onPromote,
    onClose,
  }: {
    card: UnitCardT;
    inParty?: boolean;
    /** The hero's party slot (0-based), null when it's in the army only. Leave out for enemies. */
    slot?: number | null;
    partyFull?: boolean;
    canPromoteNow?: boolean;
    copies?: UnitCardT[];
    resources?: Partial<Record<string, number>>;
    /** A battle is on: the formation can't change. */
    locked?: boolean;
    /** No promoting or adding (enemies, and your heroes during a battle). */
    readOnly?: boolean;
    statMult?: number;
    fighter?: Fighter;
    onAddToParty?: () => void;
    onRemoveFromParty?: () => void;
    partyCards?: UnitCardT[];
    onPromote?: () => void;
    onClose: () => void;
  } = $props();

  // Phones get a bottom sheet; wider screens keep the centred dialog.
  const wide = new MediaQuery("(min-width: 48rem)");

  let traitCounts = $derived(countTraits(partyCards));
  let def = $derived(UNITS[card.unitId]);
  let baseStats = $derived(computeCardStats(card.unitId, card.stars, card.ascended));
  let stats = $derived(fighter ? { hp: fighter.maxHp, atk: fighter.atk, def: fighter.def, spd: fighter.spd } : statMult !== 1 ? {
    hp: Math.floor(baseStats.hp * statMult),
    atk: Math.floor(baseStats.atk * statMult),
    def: Math.floor(baseStats.def * statMult),
    spd: baseStats.spd,
  } : baseStats);
  let statTiles = $derived([
    { label: "HP", value: fighter ? fighter.hp : stats.hp, of: fighter ? stats.hp : null },
    { label: "ATK", value: stats.atk, of: null },
    { label: "DEF", value: stats.def, of: null },
    { label: "SPD", value: stats.spd, of: null },
  ]);
  let type = $derived(ATTACK_TYPES[def.attackType]);
  let faction = $derived(FACTIONS[def.faction]);
  let color = $derived(rarityColor(def.baseStars));
  let promotionCost = $derived(card.stars < MAX_STARS ? getPromotionCost(card.stars + 1) : null);
  let activeTraits = $derived(activeTraitsForCard(card));
  let showPlacement = $derived(slot !== undefined);
  let showRemove = $derived(inParty && onRemoveFromParty !== undefined);
  let showAdd = $derived(!inParty && !readOnly && onAddToParty !== undefined);

  // Open the sheet on Done rather than the first trait chip, whose tooltip would pop open.
  let doneButton = $state<HTMLElement | null>(null);

  function handleKeydown(e: KeyboardEvent) {
    // The sheet handles Esc itself.
    if (e.key === "Escape" && wide.current) onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet body()}
  <div class="unit-details flex flex-col gap-4 pb-1 text-sm">
    <div class="flex items-center gap-3.5">
      <div
        class="flex h-[76px] w-16 shrink-0 items-end justify-center overflow-hidden rounded-[14px] border-2 pb-1.5 md:h-24 md:w-20"
        style:border-color={color}
        style:background-color={`color-mix(in oklch, ${faction.color} 18%, var(--card))`}
      >
        <Sprite unitId={card.unitId} class="w-12 md:w-16" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <h3 class="text-[22px] leading-tight font-bold tracking-tight">
          {def.name}
          {#if card.ascended}
            <Hint text="Ascended" class="ml-1 cursor-help"><span class="text-yellow-300">✦</span></Hint>
          {/if}
        </h3>
        <p class="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
          <StarRow stars={card.stars} ascended={card.ascended} />
          <span>{card.stars}/{MAX_STARS} · <span style:color={color}>{RARITY_NAMES[def.baseStars]}</span></span>
        </p>
        <p class="text-[13px] text-muted-foreground">
          <span class="font-semibold" style:color={faction.color}>{faction.name}</span> · {type.icon} {type.name}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-2" aria-label="Hero attributes">
      {#each statTiles as tile (tile.label)}
        <div class="flex min-w-0 flex-col gap-0.5 rounded-xl bg-background px-3 py-2.5">
          <span class="text-[11px] font-semibold tracking-wider text-muted-foreground">{tile.label}</span>
          <span class="truncate text-lg font-semibold tabular-nums">{tile.value}</span>
          {#if tile.of !== null}<span class="-mt-0.5 text-[11px] text-muted-foreground tabular-nums">of {tile.of}</span>{/if}
        </div>
      {/each}
    </div>
    {#if fighter}<p class="-mt-2 text-[13px] text-amber-300">Live battle stats · army bonuses included</p>{/if}
    {#if statMult > 1.005}
      <p class="-mt-2 text-[13px] font-semibold text-red-300">+{Math.round((statMult - 1) * 100)}% stat bonus applied</p>
    {/if}

    <div class="flex flex-wrap gap-1.5">
      {#each def.traits as trait (trait)}
        {@const regularIndex = (def.traits.filter(t => t !== "ascendant") as string[]).indexOf(trait)}
        {@const gateLabel = trait === "ascendant" ? null : regularIndex === 1 ? "6★" : regularIndex === 2 ? "8★" : null}
        {@const count = traitCounts.get(trait) ?? 0}
        <TraitChip {trait} {count} tier={tierFor(trait, count)} lockedLabel={activeTraits.includes(trait) ? null : gateLabel} size="lg" />
      {/each}
    </div>

    <div class="flex flex-col gap-1.5 text-[13px] leading-snug">
      <p class="rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5">
        <strong>{ULTIMATES[def.attackType].name}</strong> · Ultimate<br />
        {ULTIMATES[def.attackType].description} Triggers every third personal action, or every second with an army cadence bonus.
      </p>
      <p class="text-muted-foreground">
        {type.icon} {type.name}: beats {ATTACK_TYPES[type.beats].icon} {ATTACK_TYPES[type.beats].name}, weak to {ATTACK_TYPES[type.weakTo].icon} {ATTACK_TYPES[type.weakTo].name}.
      </p>
    </div>

    {#if !readOnly}
      <div class="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3">
        {#if promotionCost}
          <div class="text-[13px]">
            <div class="mb-1 font-semibold text-muted-foreground">Promote to {card.stars + 1}★</div>
            <div class="flex flex-wrap gap-x-3 gap-y-0.5">
              <span class={copies.length >= promotionCost.copies ? "text-green-400" : "text-red-400"}>
                Copies: {copies.length}/{promotionCost.copies}
              </span>
              {#each promotionCost.resources as { resource, amount }}
                {@const have = (resources[resource] ?? 0)}
                <span class={have >= amount ? "text-green-400" : "text-red-400"}>
                  {RESOURCES[resource].name}: {have}/{amount}
                </span>
              {/each}
            </div>
          </div>
        {/if}
        <Button
          variant={canPromoteNow ? "default" : "outline"}
          class={canPromoteNow ? "h-11 rounded-xl bg-yellow-500 text-[15px] text-black hover:bg-yellow-400" : "h-11 rounded-xl text-[15px]"}
          disabled={!canPromoteNow}
          onclick={() => onPromote?.()}
        >
          {#if card.stars >= MAX_STARS}
            ✦ Max stars
          {:else if canPromoteNow}
            + Promote {card.stars}★ → {card.stars + 1}★
          {:else}
            + Promote (missing requirements)
          {/if}
        </Button>
      </div>
    {/if}

    {#if showPlacement}
      <p class="flex min-h-11 items-center rounded-xl bg-background px-3.5 text-sm {inParty ? 'text-green-400' : 'text-muted-foreground'}">
        {inParty && slot !== null && slot !== undefined ? `In party · ${slotName(slot)}` : "Not in party — drag onto the board to place"}
      </p>
    {/if}

    <div class="flex gap-2">
      {#if showRemove}
        <Button variant="outline" class="h-12 flex-1 rounded-xl text-[15px] font-semibold text-red-400 hover:text-red-300" disabled={locked}
          title={locked ? "Your formation is locked until the battle finishes" : undefined}
          onclick={() => { onRemoveFromParty?.(); onClose(); }}>Remove from party</Button>
      {:else if showAdd}
        <Button variant="outline" class="h-12 flex-1 rounded-xl text-[15px] font-semibold" disabled={partyFull || locked}
          onclick={() => { onAddToParty?.(); onClose(); }}>{partyFull ? "Party full" : "Add to party"}</Button>
      {/if}
      <Button bind:ref={doneButton} class="h-12 flex-1 rounded-xl text-base font-semibold" onclick={onClose}>Done</Button>
    </div>
  </div>
{/snippet}

{#if wide.current}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onclick={onClose}>
    <div
      class="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-popover p-5 shadow-2xl"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
      aria-label={`${def.name} details`}
    >
      {@render body()}
    </div>
  </div>
{:else}
  <BottomSheet open {onClose} title={`${def.name} details`} hideTitle
    onOpenAutoFocus={(e) => { e.preventDefault(); doneButton?.focus({ preventScroll: true }); }}>
    {@render body()}
  </BottomSheet>
{/if}

<style>
  .unit-details :global(.card-ascended-star) {
    animation: none;
    filter: drop-shadow(0 0 2px oklch(0.9 0.2 85 / 0.35));
  }
</style>
