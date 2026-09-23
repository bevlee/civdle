<script lang="ts">
  import { UNITS, type UnitCard as UnitCardT } from "$lib/combatData";
  import { Button } from "$lib/components/ui/button";
  import UnitCard from "./UnitCard.svelte";
  import { cn } from "$lib/utils";
  import { BASE_RATES, FEAST_HALL_RATES, GRAND_FEAST_RATES, ROYAL_FEAST_RATES, EMPERORS_BANQUET_RATES, HEROIC_TRIBUTE_RATES, DIVINE_SUMMONS_RATES, type RollRate } from "$lib/settlementData";
  import { rarityColor, RARITY_NAMES } from "$lib/rarity";

  type SortKey = "rarity" | "stars" | "trait" | "name";

  let {
    cards,
    partyIds,
    gold,
    rollCost,
    packCost,
    locked = false,
    draggingId = null,
    dropActive = false,
    dragOver = false,
    onDragStart,
    onDragEnd,
    onDragOverChange,
    onDrop,
    onSelect,
    maxStars = 5,
    rollRates = BASE_RATES,
    hasCelestialAltar = false,
    glory = 0,
    legendaryPackCost = 100,
    legendarySingleCost = 10,
    onSummon,
    onOpenPack,
    onOpenLegendaryPack,
    onLegendarySummon,
  }: {
    cards: UnitCardT[];
    partyIds: Set<string>;
    gold: number;
    rollCost: number;
    packCost: number;
    maxStars?: number;
    rollRates?: RollRate[];
    hasCelestialAltar?: boolean;
    /** Glory from the Conquest skill — the only currency for 5★-only summons. */
    glory?: number;
    legendaryPackCost?: number;
    legendarySingleCost?: number;
    locked?: boolean;
    /** Card currently being dragged anywhere on the screen. */
    draggingId?: string | null;
    /** True when the dragged card is in the party, so dropping here removes it. */
    dropActive?: boolean;
    /** True while a party card is hovering over this panel. */
    dragOver?: boolean;
    onDragStart: (e: DragEvent, cardId: string) => void;
    onDragEnd: () => void;
    onDragOverChange: (over: boolean) => void;
    onDrop: (cardId: string) => void;
    onSelect: (cardId: string) => void;
    onSummon: () => void;
    onOpenPack: () => void;
    onOpenLegendaryPack?: () => void;
    onLegendarySummon?: () => void;
  } = $props();

  function handleDragOver(e: DragEvent) {
    if (!dropActive || locked) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    onDragOverChange(true);
  }

  function handleDragLeave(e: DragEvent) {
    // Ignore leave events fired when moving between children of the panel.
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget instanceof Node && e.currentTarget.contains(next)) return;
    onDragOverChange(false);
  }

  function handleDrop(e: DragEvent) {
    if (!dropActive || locked) return;
    e.preventDefault();
    const id = draggingId ?? e.dataTransfer?.getData("text/plain");
    if (id) onDrop(id);
  }

  let sortKey = $state<SortKey>("stars");
  let sortDesc = $state(true);
  let showRates = $state(false);

  const RATE_TIERS = [
    { label: "Base", rates: BASE_RATES },
    { label: "Feast Hall", rates: FEAST_HALL_RATES },
    { label: "Grand Feast", rates: GRAND_FEAST_RATES },
    { label: "Royal Feast", rates: ROYAL_FEAST_RATES },
    { label: "Emperor's Banquet", rates: EMPERORS_BANQUET_RATES },
    { label: "Heroic Tribute", rates: HEROIC_TRIBUTE_RATES },
    { label: "Divine Summons", rates: DIVINE_SUMMONS_RATES },
  ] as const;
  let activeTierLabel = $derived(RATE_TIERS.find(t => t.rates === rollRates)?.label ?? "Base");

  const SORT_LABELS: Record<SortKey, string> = {
    rarity: "Rarity",
    stars: "Stars",
    trait: "Trait",
    name: "Name",
  };

  function compare(a: UnitCardT, b: UnitCardT): number {
    const da = UNITS[a.unitId];
    const db = UNITS[b.unitId];
    let c = 0;
    switch (sortKey) {
      case "rarity":
        c = da.baseStars - db.baseStars || a.stars - b.stars;
        break;
      case "stars":
        c = a.stars - b.stars || da.baseStars - db.baseStars;
        break;
      case "trait":
        c = da.traits[0].localeCompare(db.traits[0]) || a.stars - b.stars;
        break;
      case "name":
        c = da.name.localeCompare(db.name) || a.stars - b.stars;
        break;
    }
    if (c === 0) c = da.name.localeCompare(db.name);
    return sortDesc ? -c : c;
  }

  let sorted = $derived([...cards].sort(compare));

  let promotable = $derived.by(() => {
    const set = new Set<string>();
    for (const a of cards) {
      if (a.stars >= 10) continue;
      if (cards.some((b) => b.id !== a.id && b.unitId === a.unitId)) set.add(a.id);
    }
    return set;
  });
</script>

<div
  role="group"
  aria-label="Army inventory"
  class={cn(
    "flex flex-col gap-2 rounded-lg border bg-muted/20 transition-colors",
    dropActive && dragOver ? "border-primary bg-primary/10" : "border-border",
  )}
  ondragover={handleDragOver}
  ondragenter={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <div class="flex flex-wrap items-center justify-between gap-2 px-3 pt-2">
    <div class="flex items-center gap-2">
      <h3 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Army ({cards.length})
      </h3>
      {#if dropActive}
        <span class="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
          Drop here to remove from battlefield
        </span>
      {:else if promotable.size > 0}
        <span class="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-300" title="Cards with copies available for promotion">
          ⇈ {promotable.size} promotable
        </span>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-1.5">
      <label class="text-[10px] text-muted-foreground" for="army-sort">Sort</label>
      <select
        id="army-sort"
        class="rounded border border-border bg-muted px-1.5 py-0.5 text-xs"
        bind:value={sortKey}
      >
        {#each Object.entries(SORT_LABELS) as [key, label] (key)}
          <option value={key}>{label}</option>
        {/each}
      </select>
      <button
        class="rounded border border-border bg-muted px-1.5 py-0.5 text-xs hover:bg-accent"
        title={sortDesc ? "Descending" : "Ascending"}
        onclick={() => (sortDesc = !sortDesc)}
      >
        {sortDesc ? "▼" : "▲"}
      </button>
      <Button size="sm" disabled={locked || gold < rollCost} onclick={onSummon} class="ml-1 h-6 px-2 text-[10px]">
        Summon {rollCost} ⚔
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={locked || gold < packCost}
        onclick={onOpenPack}
        title="Open 10 cards at once"
        class="h-6 px-2 text-[10px]"
      >
        Open 10 · {packCost} ⚔
      </Button>
      {#if hasCelestialAltar && onLegendarySummon}
        <Button
          size="sm"
          variant="outline"
          disabled={locked || glory < legendarySingleCost}
          onclick={onLegendarySummon}
          title="1 guaranteed 5★ hero, paid in Glory ({glory} held)"
          class="h-6 border-yellow-500/40 px-2 text-[10px] text-yellow-300 hover:bg-yellow-500/10"
        >
          5★ · {legendarySingleCost} Glory
        </Button>
      {/if}
      {#if hasCelestialAltar && onOpenLegendaryPack}
        <Button
          size="sm"
          variant="outline"
          disabled={locked || glory < legendaryPackCost}
          onclick={onOpenLegendaryPack}
          title="10 guaranteed 5★ heroes, paid in Glory ({glory} held)"
          class="h-6 border-yellow-500/40 px-2 text-[10px] text-yellow-300 hover:bg-yellow-500/10"
        >
          10× 5★ · {legendaryPackCost} Glory
        </Button>
      {/if}
      {#if maxStars < 5}
        <span
          class="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
          title="Advance to the Iron Age for 4★ and Medieval for 5★ summons"
        >
          Max {maxStars}★
        </span>
      {/if}
      <button
        class="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
        onclick={() => showRates = !showRates}
        aria-expanded={showRates}
      >
        Rates
      </button>
    </div>
  </div>

  {#if showRates}
    <div class="mx-3 rounded-lg border border-border bg-muted/40 p-3">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Summon Rates</span>
        <button class="text-[10px] text-muted-foreground hover:text-foreground" onclick={() => showRates = false}>Close</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-[11px]">
          <thead>
            <tr class="text-left text-muted-foreground">
              <th class="pb-1 pr-3 font-medium">Rarity</th>
              {#each RATE_TIERS as tier}
                <th class="pb-1 pr-3 font-medium" class:text-foreground={tier.label === activeTierLabel}>
                  {tier.label}{tier.label === activeTierLabel ? " ✓" : ""}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each [5, 4, 3, 2, 1] as stars}
              <tr>
                <td class="py-0.5 pr-3 font-medium" style:color={rarityColor(stars)}>
                  {"★".repeat(stars)} {RARITY_NAMES[stars]}
                </td>
                {#each RATE_TIERS as tier}
                  {@const rate = tier.rates.find(r => r.stars === stars)?.rate ?? 0}
                  <td class="py-0.5 pr-3 tabular-nums" class:font-semibold={tier.label === activeTierLabel} class:text-foreground={tier.label === activeTierLabel}>
                    {(rate * 100).toFixed(0)}%
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if maxStars < 5}
        <p class="mt-2 text-[10px] text-muted-foreground">
          {maxStars < 4 ? "Advance to the Iron Age to unlock 4★ units, then Medieval for 5★." : "Advance to Medieval to unlock 5★ units."}
          Rates above max star are redistributed to lower tiers.
        </p>
      {/if}
    </div>
  {/if}

  <div class="max-h-60 overflow-y-auto px-3 pb-1">
    {#if sorted.length === 0}
      <p class="py-6 text-center text-sm text-muted-foreground">
        No units yet — summon one with Tribute.{gold < rollCost ? " Win battles to earn more." : ""}
      </p>
    {:else}
      <div class="flex flex-wrap gap-1.5 pt-1">
        {#each sorted as card (card.id)}
          {@const inParty = partyIds.has(card.id)}
          <button
            class={cn(
              "relative rounded-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !locked && "cursor-grab active:cursor-grabbing",
              inParty && "ring-2 ring-primary ring-offset-1 ring-offset-background",
              draggingId === card.id && "opacity-40",
            )}
            draggable={!locked}
            ondragstart={(e) => onDragStart(e, card.id)}
            ondragend={onDragEnd}
            onclick={() => onSelect(card.id)}
            aria-label={`${UNITS[card.unitId].name}, ${card.stars} stars${inParty ? ", deployed" : ""}`}
            title={`${UNITS[card.unitId].name} — drag onto the battlefield, or click for details`}
          >
            <UnitCard unitId={card.unitId} stars={card.stars} ascended={card.ascended} size="tile" class="h-14 w-14 rounded-md border" />
            {#if inParty}
              <span class="absolute -top-1 -left-1 rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground">P</span>
            {/if}
            {#if promotable.has(card.id)}
              <span class="absolute -right-1 -bottom-1 rounded-full bg-green-500 px-1 text-[9px] font-bold text-black" title="Copies available for promotion">⇈</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
  <p class="px-3 pb-2 text-[10px] text-muted-foreground">{locked ? "Your formation is locked until the battle finishes." : "Drag a unit onto the battlefield, or select an empty position and then a card."}</p>
</div>
