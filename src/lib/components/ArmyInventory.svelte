<script lang="ts">
  import { UNITS, canMerge, type UnitCard as UnitCardT } from "$lib/combatData";
  import { Button } from "$lib/components/ui/button";
  import UnitCard from "./UnitCard.svelte";
  import { cn } from "$lib/utils";

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
    onSummon,
    onOpenPack,
  }: {
    cards: UnitCardT[];
    partyIds: Set<string>;
    gold: number;
    rollCost: number;
    packCost: number;
    maxStars?: number;
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

  let mergeable = $derived.by(() => {
    const set = new Set<string>();
    for (const a of cards) {
      if (set.has(a.id)) continue;
      if (cards.some((b) => canMerge(a, b))) set.add(a.id);
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
  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
    <div class="flex items-center gap-2">
      <h3 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Army ({cards.length})
      </h3>
      {#if dropActive}
        <span class="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
          Drop here to remove from party
        </span>
      {:else if mergeable.size > 0}
        <span class="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-300" title="Cards with a merge partner">
          ⇈ {mergeable.size} mergeable
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-1.5">
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
      <Button size="sm" disabled={locked || gold < rollCost} onclick={onSummon} class="ml-1">
        🎲 Summon ({rollCost} ⚔)
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={locked || gold < packCost}
        onclick={onOpenPack}
        title="Open 10 cards at once"
      >
        🎁 Open 10 ({packCost} ⚔)
      </Button>
      {#if maxStars < 5}
        <span
          class="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
          title="Build the War Forge (Smithing) to unlock higher stars"
        >
          Max {maxStars}★
        </span>
      {/if}
    </div>
  </div>

  <div class="max-h-80 overflow-y-auto px-3 pb-3">
    {#if sorted.length === 0}
      <p class="py-6 text-center text-sm text-muted-foreground">
        No units yet — summon one with Tribute.{gold < rollCost ? " Win battles to earn more." : ""}
      </p>
    {:else}
      <div class="flex flex-wrap gap-2">
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
            title={`${UNITS[card.unitId].name} — drag to a party slot`}
          >
            <UnitCard unitId={card.unitId} stars={card.stars} size="tile" />
            {#if inParty}
              <span class="absolute -top-1 -left-1 rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground">P</span>
            {/if}
            {#if mergeable.has(card.id)}
              <span class="absolute -right-1 -bottom-1 rounded-full bg-green-500 px-1 text-[9px] font-bold text-black" title="Merge available">⇈</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
