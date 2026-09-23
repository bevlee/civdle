<script lang="ts">
  import {
    ATTACK_TYPES,
    MAX_STARS,
    UNITS,
    ULTIMATES,
    computeCardStats,
    getPromotionCost,
    type UnitCard as UnitCardT,
  } from "$lib/combatData";
  import { RESOURCES } from "$lib/gameData";
  import { activeTraitsForCard, countTraits, tierFor } from "$lib/traits";
  import { RARITY_NAMES, rarityColor, starDisplay, PURPLE_STAR_COLOR } from "$lib/rarity";
  import { Button } from "$lib/components/ui/button";
  import Hint from "./Hint.svelte";
  import UnitCard from "./UnitCard.svelte";
  import HeroStats from "./HeroStats.svelte";
  import TraitChip from "./TraitChip.svelte";
  import type { Fighter } from "$lib/combatEngine";

  let {
    card,
    inParty = false,
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
    partyFull?: boolean;
    canPromoteNow?: boolean;
    copies?: UnitCardT[];
    resources?: Partial<Record<string, number>>;
    locked?: boolean;
    readOnly?: boolean;
    statMult?: number;
    fighter?: Fighter;
    onAddToParty?: () => void;
    onRemoveFromParty?: () => void;
    partyCards?: UnitCardT[];
    onPromote?: () => void;
    onClose: () => void;
  } = $props();

  let traitCounts = $derived(countTraits(partyCards));
  let def = $derived(UNITS[card.unitId]);
  let baseStats = $derived(computeCardStats(card.unitId, card.stars, card.ascended));
  let stats = $derived(fighter ? { hp: fighter.maxHp, atk: fighter.atk, def: fighter.def, spd: fighter.spd } : statMult !== 1 ? {
    hp: Math.floor(baseStats.hp * statMult),
    atk: Math.floor(baseStats.atk * statMult),
    def: Math.floor(baseStats.def * statMult),
    spd: baseStats.spd,
  } : baseStats);
  let type = $derived(ATTACK_TYPES[def.attackType]);
  let promotionCost = $derived(card.stars < MAX_STARS ? getPromotionCost(card.stars + 1) : null);
  let activeTraits = $derived(activeTraitsForCard(card));
  let sd = $derived(starDisplay(card.stars));

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onclick={onClose}>
  <div
    class="unit-details flex max-h-[90dvh] overflow-y-auto max-w-2xl flex-col gap-4 rounded-xl border border-border bg-popover p-4 shadow-2xl sm:flex-row"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
    aria-label={`${def.name} details`}
  >
    <UnitCard unitId={card.unitId} stars={card.stars} ascended={card.ascended} size="lg" />

    <div class="flex min-w-0 flex-1 flex-col gap-3 text-[19px]">
      <div>
        <h3 class="text-[23px] font-bold">
          {def.name}
          {#if card.ascended}
            <Hint text="Ascended" class="ml-1 cursor-help"><span class="text-yellow-300">✦</span></Hint>
          {/if}
        </h3>
        <p class="text-[17px]" style:color={rarityColor(def.baseStars)}>
          {RARITY_NAMES[def.baseStars]} · {type.icon} {type.name}
        </p>
        <p class="text-[17px] text-muted-foreground">
          <span style:color={sd.purple ? PURPLE_STAR_COLOR : "#fcd34d"}>{sd.symbol.repeat(sd.count)}</span> {card.stars}/{MAX_STARS}
        </p>
      </div>

      <HeroStats {stats} currentHp={fighter?.hp} class="text-[17px]" />
      {#if fighter}<p class="text-[15px] text-amber-300">Live battle stats · army bonuses included</p>{/if}

      {#if statMult > 1.005}
        <p class="text-[15px] font-semibold text-red-300">+{Math.round((statMult - 1) * 100)}% stat bonus applied</p>
      {/if}

      <p class="text-[17px] text-muted-foreground">
        {type.icon} {type.name}: beats {ATTACK_TYPES[type.beats].icon} {ATTACK_TYPES[type.beats].name}, weak to {ATTACK_TYPES[type.weakTo].icon} {ATTACK_TYPES[type.weakTo].name}.
      </p>

      <div class="flex flex-col gap-1">
        <p class="rounded border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-[17px]">
          <strong>{ULTIMATES[def.attackType].name}</strong> · Ultimate<br />
          {ULTIMATES[def.attackType].description} Triggers every third personal action, or every second with an army cadence bonus.
        </p>
        <div class="flex flex-wrap gap-1.5">
          {#each def.traits as trait (trait)}
            {@const regularIndex = (def.traits.filter(t => t !== "ascendant") as string[]).indexOf(trait)}
            {@const gateLabel = trait === "ascendant" ? null : regularIndex === 1 ? "6★" : regularIndex === 2 ? "8★" : null}
            {@const count = traitCounts.get(trait) ?? 0}
            <TraitChip {trait} {count} tier={tierFor(trait, count)} lockedLabel={activeTraits.includes(trait) ? null : gateLabel} size="lg" />
          {/each}
        </div>
      </div>

      {#if !readOnly}
        {#if promotionCost}
          <div class="rounded border border-border/40 bg-muted/50 px-2 py-1.5 text-[17px]">
            <div class="font-semibold text-muted-foreground mb-1">Promote to {card.stars + 1}★</div>
            <div class="flex flex-col gap-0.5">
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

        <div class="mt-auto flex flex-wrap gap-1.5">
          {#if inParty}
            <Button size="lg" class="text-[17px]" variant="outline" disabled={locked} onclick={() => { onRemoveFromParty?.(); onClose(); }}>Remove from party</Button>
          {:else}
            <Button size="lg" class="text-[17px]" disabled={partyFull || locked} onclick={() => { onAddToParty?.(); onClose(); }}>
              {partyFull ? "Party full" : "Add to party"}
            </Button>
          {/if}
          <Button
            size="lg"
            variant={canPromoteNow ? "default" : "outline"}
            class={canPromoteNow ? "bg-yellow-500 text-[17px] text-black hover:bg-yellow-400" : "text-[17px]"}
            disabled={!canPromoteNow}
            onclick={() => onPromote?.()}
          >
            {#if card.stars >= MAX_STARS}
              ✦ Max stars
            {:else if canPromoteNow}
              ⇈ Promote {card.stars}★ → {card.stars + 1}★
            {:else}
              ⇈ Promote (missing requirements)
            {/if}
          </Button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .unit-details :global(.card-ascended-glow) {
    animation: none;
    box-shadow: 0 0 8px 1px oklch(0.85 0.16 85 / 0.25);
  }

  .unit-details :global(.card-ascended-sheen) {
    opacity: 0.2;
    animation-duration: 6s;
  }

  .unit-details :global(.card-ascended-star) {
    animation: none;
    filter: drop-shadow(0 0 2px oklch(0.9 0.2 85 / 0.35));
  }
</style>
