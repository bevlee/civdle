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
  import { activeTraitsForCard, countTraits, tierFor, TRAIT_SYNERGIES } from "$lib/traits";
  import { RARITY_NAMES, rarityColor, starDisplay, PURPLE_STAR_COLOR } from "$lib/rarity";
  import { Button } from "$lib/components/ui/button";
  import UnitCard from "./UnitCard.svelte";

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
    onAddToParty?: () => void;
    onRemoveFromParty?: () => void;
    partyCards?: UnitCardT[];
    onPromote?: () => void;
    onClose: () => void;
  } = $props();

  let traitCounts = $derived(countTraits(partyCards));
  let def = $derived(UNITS[card.unitId]);
  let baseStats = $derived(computeCardStats(card.unitId, card.stars, card.ascended));
  let stats = $derived(statMult !== 1 ? {
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
    class="flex max-w-lg flex-col gap-3 rounded-xl border border-border bg-popover p-4 shadow-2xl sm:flex-row"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
    aria-label={`${def.name} details`}
  >
    <UnitCard unitId={card.unitId} stars={card.stars} ascended={card.ascended} size="lg" />

    <div class="flex min-w-0 flex-1 flex-col gap-2 text-sm">
      <div>
        <h3 class="text-lg font-bold">
          {def.name}
          {#if card.ascended}
            <span class="ml-1 text-yellow-300" title="Ascended">✦</span>
          {/if}
        </h3>
        <p class="text-xs" style:color={rarityColor(def.baseStars)}>
          {RARITY_NAMES[def.baseStars]} · {FACTIONS[def.faction].name} · {type.icon} {type.name}
        </p>
        <p class="text-xs text-muted-foreground">
          <span style:color={sd.purple ? PURPLE_STAR_COLOR : "#fcd34d"}>{sd.symbol.repeat(sd.count)}</span> {card.stars}/{MAX_STARS}
        </p>
      </div>

      <div class="grid grid-cols-4 gap-1 text-center text-xs">
        <div class="rounded bg-muted px-1 py-1"><div class="text-muted-foreground">HP</div><div class="font-bold tabular-nums">{stats.hp}</div></div>
        <div class="rounded bg-muted px-1 py-1"><div class="text-muted-foreground">ATK</div><div class="font-bold tabular-nums">{stats.atk}</div></div>
        <div class="rounded bg-muted px-1 py-1"><div class="text-muted-foreground">DEF</div><div class="font-bold tabular-nums">{stats.def}</div></div>
        <div class="rounded bg-muted px-1 py-1"><div class="text-muted-foreground">SPD</div><div class="font-bold tabular-nums">{stats.spd}</div></div>
      </div>

      {#if statMult > 1.005}
        <p class="text-[10px] font-semibold text-red-300">+{Math.round((statMult - 1) * 100)}% stat bonus applied</p>
      {/if}

      <p class="text-xs text-muted-foreground">
        {type.icon} {type.name}: beats {ATTACK_TYPES[type.beats].icon} {ATTACK_TYPES[type.beats].name}, weak to {ATTACK_TYPES[type.weakTo].icon} {ATTACK_TYPES[type.weakTo].name}.
      </p>

      <div class="flex flex-col gap-1">
        <p class="rounded border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-xs">
          <strong>{ULTIMATES[def.attackType].name}</strong> · Ultimate<br />
          {ULTIMATES[def.attackType].description} Triggers every third personal action, or every second with an army cadence bonus.
        </p>
        {#each def.traits as trait, traitIndex (trait)}
          {@const syn = TRAIT_SYNERGIES[trait]}
          {@const isActive = activeTraits.includes(trait)}
          {@const nonAscTraits = def.traits.filter(t => t !== "ascendant") as string[]}
          {@const posInRegular = nonAscTraits.indexOf(trait)}
          {@const gateLabel = trait === "ascendant" ? null : posInRegular === 1 ? "6★" : posInRegular === 2 ? "8★" : null}
          <div class="rounded border px-2 py-1 text-xs {isActive ? 'border-border/60' : 'border-border/30 opacity-50'}">
            <div class="flex items-center justify-between">
              <span class={trait === "ascendant" ? "font-bold text-yellow-300" : "font-semibold"}>
                {syn.name}
                {#if gateLabel && !isActive}
                  <span class="ml-1 text-[10px] text-muted-foreground">🔒 {gateLabel}</span>
                {/if}
              </span>
              <span class="text-[10px] text-muted-foreground">{syn.description}</span>
            </div>
            {#each syn.tiers as bonus, index}
              {@const active = isActive && tierFor(trait, traitCounts.get(trait) ?? 0) === index + 1}
              <p class={active ? "text-[10px] text-amber-300 font-semibold" : "text-[10px] text-muted-foreground"}>
                {syn.thresholds[index]}: {bonus}{active ? " · Active" : ""}
              </p>
            {/each}
          </div>
        {/each}
      </div>

      {#if !readOnly}
        {#if promotionCost}
          <div class="rounded border border-border/40 bg-muted/50 px-2 py-1.5 text-xs">
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
            <Button size="sm" variant="outline" disabled={locked} onclick={() => { onRemoveFromParty?.(); onClose(); }}>Remove from party</Button>
          {:else}
            <Button size="sm" disabled={partyFull || locked} onclick={() => { onAddToParty?.(); onClose(); }}>
              {partyFull ? "Party full" : "Add to party"}
            </Button>
          {/if}
          <Button
            size="sm"
            variant={canPromoteNow ? "default" : "outline"}
            class={canPromoteNow ? "bg-yellow-500 text-black hover:bg-yellow-400" : ""}
            disabled={!canPromoteNow}
            onclick={() => onPromote?.()}
            title={card.stars >= MAX_STARS
              ? "Already at max stars"
              : canPromoteNow
                ? `Promote ${card.stars}★ → ${card.stars + 1}★`
                : "Missing copies or resources"}
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
