<script lang="ts">
  import { UNITS, ATTACK_TYPES, type Trait, type UnitCard as UnitCardT } from "$lib/combatData";
  import { Button } from "$lib/components/ui/button";
  import { tick } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import Hint from "./Hint.svelte";
  import UnitCard from "./UnitCard.svelte";
  import { cn } from "$lib/utils";
  import { RARITY_NAMES } from "$lib/rarity";
  import { dragPlace, type DragState, type DropResult } from "$lib/dragPlace";
  import {
    NO_FILTER,
    SORT_LABELS,
    activeFilterLabel,
    filterArmy,
    isFiltered,
    ownedTraits,
    promotableIds,
    sortArmy,
    starCounts,
    starLabel,
    traitLabel,
    typeCounts,
    typeLabel,
    type ArmyFilter,
    type SortKey,
    type StarFilter,
    type TypeFilter,
  } from "$lib/view/armyFilter";

  let {
    cards,
    partyIds,
    locked = false,
    draggingId = null,
    onTap,
    onDrop,
    onDragState,
    onOpenSummon,
    covering = $bindable(false),
  }: {
    cards: UnitCardT[];
    partyIds: Set<string>;
    locked?: boolean;
    /** Card currently being dragged anywhere on the screen. */
    draggingId?: string | null;
    /** A card was tapped: show its details. */
    onTap: (cardId: string) => void;
    /** A card was dragged onto the board. */
    onDrop: (result: DropResult) => void;
    onDragState: (state: DragState | null) => void;
    /** Opens the summon panel. */
    onOpenSummon: () => void;
    /** Phone: the expanded view is showing over the board (the rest should be inert). */
    covering?: boolean;
  } = $props();

  // Phones get a slim dock with an expandable filter view; wider screens keep the panel.
  const wide = new MediaQuery("(min-width: 48rem)");

  let sortKey = $state<SortKey>("stars");
  let sortDesc = $state(true);
  // What the player picked; `filter` drops a trait whose last card was promoted away.
  let picked = $state<ArmyFilter>({ ...NO_FILTER });

  // Phone: the filter view over the board, and whether a drag started from its grid.
  let expanded = $state(false);
  let gridDrag = $state(false);

  // Only offer traits the player actually owns.
  let traits = $derived(ownedTraits(cards));
  let filter = $derived(picked.trait !== null && !traits.includes(picked.trait) ? { ...picked, trait: null } : picked);

  let filtered = $derived(isFiltered(filter));
  let shown = $derived(sortArmy(filterArmy(cards, filter), sortKey, sortDesc));
  let starRows = $derived(starCounts(cards, filter));
  let typeRows = $derived(typeCounts(cards, filter));
  let filterLabel = $derived(activeFilterLabel(filter));
  let countLabel = $derived(filtered ? `${shown.length}/${cards.length}` : `${cards.length}`);
  let promotable = $derived(promotableIds(cards));

  const clearFilters = () => (picked = { ...NO_FILTER });
  const setStars = (stars: StarFilter) => (picked = { ...filter, stars });
  const setType = (type: TypeFilter) => (picked = { ...filter, type });
  const setTrait = (trait: Trait | null) => (picked = { ...filter, trait });
  const toggleTrait = (trait: Trait) => setTrait(filter.trait === trait ? null : trait);

  let toggleButton = $state<HTMLElement | null>(null);
  let doneButton = $state<HTMLElement | null>(null);
  let expandedView = $state<HTMLElement | null>(null);

  $effect(() => {
    covering = expanded && !gridDrag;
  });

  async function openExpanded() {
    expanded = true;
    await tick();
    doneButton?.focus();
  }

  async function closeExpanded() {
    // Hand focus back to the toggle unless it already moved somewhere else on purpose.
    const active = document.activeElement;
    const hadFocus = !active || active === document.body || !!expandedView?.contains(active);
    expanded = false;
    await tick();
    if (hadFocus) toggleButton?.focus();
  }

  // Dragging from the expanded grid hides it so the board is free to drop on. It stays
  // mounted (the card holds the pointer capture). A hero placed closes it; a cancelled
  // drag (Esc, a lost pointer, a drop that placed nothing) comes back to the grid.
  let gridPlaced = false;
  function gridDrop(result: DropResult) {
    gridPlaced = true;
    onDrop(result);
  }
  function gridDragState(state: DragState | null) {
    if (state && !gridDrag) {
      gridDrag = true;
      gridPlaced = false;
    }
    if (!state && gridDrag) {
      gridDrag = false;
      if (gridPlaced) void closeExpanded();
    }
    onDragState(state);
  }

  $effect(() => {
    if (wide.current) expanded = false;
  });

  function handleKeydown(e: KeyboardEvent) {
    // An Esc meant for a sheet or dialog on top (hero details) leaves the army open.
    const inDialog = e.target instanceof Element && e.target.closest("[role='dialog']");
    if (e.key === "Escape" && expanded && !gridDrag && !inDialog) void closeExpanded();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet cardButton(card: UnitCardT, variant: "strip" | "grid" | "panel")}
  {@const inParty = partyIds.has(card.id)}
  {@const name = UNITS[card.unitId].name}
  <button
    class={cn(
      "relative shrink-0 rounded-lg transition-transform select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-touch-callout:none]",
      variant === "strip" ? "touch-pan-x" : "touch-pan-y",
      variant === "panel" && "hover:scale-105",
      variant === "grid" && "w-full",
      !locked && "cursor-grab active:cursor-grabbing",
      inParty && "ring-2 ring-primary ring-offset-1 ring-offset-background",
      draggingId === card.id && "opacity-40",
    )}
    use:dragPlace={{
      source: { type: "card", cardId: card.id },
      locked,
      onTap: () => onTap(card.id),
      onDrop: variant === "grid" ? gridDrop : onDrop,
      onDragState: variant === "grid" ? gridDragState : onDragState,
    }}
    aria-label={`${name}, ${card.stars} stars${inParty ? ", deployed" : ""}`}
    title={`${name} — drag onto the battlefield, or click for details`}
  >
    <UnitCard
      unitId={card.unitId}
      stars={card.stars}
      ascended={card.ascended}
      size="tile"
      class={cn(
        "rounded-md border",
        variant === "strip" && "h-[72px] w-16",
        variant === "grid" && "h-[76px] w-full",
        variant === "panel" && "h-24 w-24",
      )}
    />
    {#if inParty}
      <span class="absolute -top-1 -left-1 rounded bg-primary px-1 text-[12px] leading-[18px] font-bold text-primary-foreground md:text-[14px]">P</span>
    {/if}
    {#if promotable.has(card.id)}
      <span
        class="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-green-500 text-[14px] leading-none font-black text-white shadow ring-2 ring-background md:size-6 md:text-[17px]"
        title="Copies available for promotion">+</span
      >
    {/if}
  </button>
{/snippet}

{#snippet emptyFiltered(cls: string)}
  <div class={cls}>
    No heroes match these filters.
    <button class="h-9 rounded-[10px] border border-border px-3.5 text-sm font-semibold text-foreground" onclick={clearFilters}>
      Clear filters
    </button>
  </div>
{/snippet}

{#if wide.current}
  <div role="group" aria-label="Army inventory" class="flex flex-col gap-2 rounded-lg border border-border bg-muted/20">
    <div class="flex flex-wrap items-center justify-between gap-2 px-3 pt-2">
      <div class="flex items-center gap-2">
        <h3 class="text-[17px] font-semibold tracking-wider text-muted-foreground uppercase">Army ({countLabel})</h3>
        {#if promotable.size > 0}
          <Hint text="Cards with enough copies to promote. Open one to promote it.">
            <span class="cursor-help rounded bg-green-500/20 px-1.5 py-0.5 text-[15px] text-green-300">
              <span class="font-black">+</span> {promotable.size} promotable
            </span>
          </Hint>
        {/if}
      </div>
      <Button size="sm" class="h-8 px-3 text-[15px]" aria-haspopup="dialog" onclick={onOpenSummon}>Summon</Button>
    </div>

    {#if cards.length > 0}
      <div class="flex flex-wrap items-center gap-1.5 px-3">
        <div class="flex overflow-hidden rounded border border-border" role="group" aria-label="Filter by attack type">
          {#each typeRows as row (row.type)}
            <button
              class={cn("px-1.5 py-0.5 text-[16px] transition-colors", filter.type === row.type ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent")}
              aria-pressed={filter.type === row.type}
              title={row.type === "all" ? "All attack types" : ATTACK_TYPES[row.type].name}
              onclick={() => setType(row.type)}
            >
              {row.type === "all" ? "All" : `${ATTACK_TYPES[row.type].icon} ${typeLabel(row.type)}`}
              <span class="text-[13px] tabular-nums opacity-70">{row.n}</span>
            </button>
          {/each}
        </div>
        <div class="flex overflow-hidden rounded border border-border" role="group" aria-label="Filter by rarity">
          {#each starRows as row (row.stars)}
            <button
              class={cn(
                "px-1.5 py-0.5 text-[16px] transition-colors",
                filter.stars === row.stars ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent",
                row.n === 0 && filter.stars !== row.stars && "opacity-40",
              )}
              aria-pressed={filter.stars === row.stars}
              title={row.stars === 0 ? "Any rarity" : `${RARITY_NAMES[row.stars]} heroes`}
              onclick={() => setStars(row.stars)}
            >
              {starLabel(row.stars)}
              <span class="text-[13px] tabular-nums opacity-70">{row.n}</span>
            </button>
          {/each}
        </div>
        <select
          class={cn("rounded border bg-muted px-1.5 py-0.5 text-[16px]", filter.trait === null ? "border-border" : "border-primary")}
          aria-label="Filter by trait"
          value={filter.trait ?? "all"}
          onchange={(e) => setTrait(e.currentTarget.value === "all" ? null : (e.currentTarget.value as Trait))}
        >
          <option value="all">All traits</option>
          {#each traits as t (t)}
            <option value={t}>{traitLabel(t)}</option>
          {/each}
        </select>
        {#if filtered}
          <button class="text-[15px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onclick={clearFilters}>Clear</button>
        {/if}
        <div class="ml-auto flex items-center gap-1.5">
          <label class="text-[15px] text-muted-foreground" for="army-sort">Sort</label>
          <select id="army-sort" class="rounded border border-border bg-muted px-1.5 py-0.5 text-[16px]" bind:value={sortKey}>
            {#each Object.entries(SORT_LABELS) as [key, label] (key)}
              <option value={key}>{label}</option>
            {/each}
          </select>
          <button class="rounded border border-border bg-muted px-1.5 py-0.5 text-[16px] hover:bg-accent" title={sortDesc ? "Descending" : "Ascending"}
            onclick={() => (sortDesc = !sortDesc)}>{sortDesc ? "▼" : "▲"}</button>
        </div>
      </div>
    {/if}

    <div class="max-h-[26rem] overflow-y-auto px-3 pb-1" data-drag-scroll="y">
      {#if cards.length > 0 && shown.length === 0}
        {@render emptyFiltered("flex flex-col items-center gap-2 py-6 text-center text-[17px] text-muted-foreground")}
      {:else if shown.length === 0}
        <p class="py-6 text-center text-[19px] text-muted-foreground">No units yet — summon one with Tribute.</p>
      {:else}
        <div class="flex flex-wrap gap-2 pt-1.5">
          {#each shown as card (card.id)}
            {@render cardButton(card, "panel")}
          {/each}
        </div>
      {/if}
    </div>
    <p class="px-3 pb-2 text-[15px] text-muted-foreground">{locked ? "Your formation is locked until the battle finishes." : "Drag a unit onto the battlefield, or click it for details."}</p>
  </div>
{:else}
  <!-- Phone dock: one header row and one strip of cards that scrolls sideways; a vertical
       drag lifts a card onto the board. Filters and sorting live in the expanded view. -->
  <div role="group" aria-label="Army" class="flex flex-col" inert={covering}>
    <div class="flex min-w-0 items-center gap-2">
      <button
        bind:this={toggleButton}
        class="flex h-9 shrink-0 items-center gap-1.5"
        aria-expanded={expanded}
        aria-controls="army-expanded"
        aria-label={expanded ? "Collapse army" : `Expand army, ${countLabel} heroes`}
        onclick={() => (expanded ? closeExpanded() : openExpanded())}
      >
        <span class="text-[15px] font-bold whitespace-nowrap tabular-nums">Army · {countLabel}</span>
        <span class="flex size-6 items-center justify-center rounded-[7px] bg-accent text-[13px] text-muted-foreground" aria-hidden="true">{expanded ? "▾" : "▴"}</span>
      </button>
      {#if filtered}
        <button
          class="flex h-7 min-w-0 items-center gap-1.5 rounded-lg border border-foreground/30 bg-card pr-1.5 pl-2.5 text-xs font-semibold"
          aria-label={`Clear filters: ${filterLabel}`}
          onclick={clearFilters}
        >
          <span class="truncate">{filterLabel}</span><span class="text-sm text-muted-foreground" aria-hidden="true">×</span>
        </button>
      {:else if promotable.size > 0}
        <span class="rounded-md bg-green-500/15 px-2 py-[3px] text-xs font-semibold whitespace-nowrap text-green-400" title="Heroes with a spare copy to promote. Tap one to promote it.">
          +{promotable.size} promotable
        </span>
      {/if}
      <span class="flex-1"></span>
      <button class="h-9 shrink-0 rounded-[10px] bg-primary px-3 text-sm font-semibold whitespace-nowrap text-primary-foreground" aria-haspopup="dialog" onclick={onOpenSummon}>
        Summon ›
      </button>
    </div>
    <div class="flex min-h-[84px] gap-2 overflow-x-auto overscroll-x-contain px-1.5 pt-1.5 pb-1.5 [scrollbar-width:none]" data-drag-scroll="x">
      {#if cards.length === 0}
        <p class="self-center text-[13px] text-muted-foreground">No heroes yet — summon some with Tribute.</p>
      {:else if shown.length === 0}
        <p class="self-center text-[13px] whitespace-nowrap text-muted-foreground">
          No heroes match. <button class="font-semibold text-foreground underline underline-offset-2" onclick={clearFilters}>Clear filters</button>
        </p>
      {:else}
        {#each shown as card (card.id)}
          {@render cardButton(card, "strip")}
        {/each}
      {/if}
    </div>
  </div>

  {#if expanded || gridDrag}
    <!-- Covers the battle area above the nav; hidden (but mounted) while a card from it is dragged. -->
    <button class={cn("absolute inset-0 z-30 bg-black/50", gridDrag && "invisible")} aria-label="Close army" tabindex="-1" onclick={closeExpanded}></button>
  {/if}
  <!-- Always in the DOM (empty and hidden when closed) so the toggle's aria-controls resolves. -->
  <div
    bind:this={expandedView}
    id="army-expanded"
    role="region"
    aria-label="Army"
    hidden={!expanded && !gridDrag}
    class={cn(
      "absolute inset-x-0 bottom-0 z-30 flex h-[88%] flex-col gap-2.5 rounded-t-[18px] border-t border-foreground/10 bg-background pt-3 shadow-[0_-12px_32px_rgb(0_0_0/0.55)]",
      gridDrag && "invisible",
    )}
  >
    {#if expanded || gridDrag}
      <div class="flex shrink-0 items-center gap-2 px-3">
        <span class="text-[17px] font-bold whitespace-nowrap tabular-nums">Army · {countLabel}</span>
        {#if filtered}
          <button class="h-7 px-2 text-[13px] text-muted-foreground underline underline-offset-2" onclick={clearFilters}>Clear</button>
        {/if}
        <span class="flex-1"></span>
        <label class="sr-only" for="army-sort-phone">Sort by</label>
        <select id="army-sort-phone" class="h-9 rounded-[10px] border border-border bg-card px-2 text-[13px]" bind:value={sortKey}>
          {#each Object.entries(SORT_LABELS) as [key, label] (key)}
            <option value={key}>{label}</option>
          {/each}
        </select>
        <button class="h-9 w-9 rounded-[10px] border border-border text-[12px] text-muted-foreground" aria-label={sortDesc ? "Sorted descending" : "Sorted ascending"}
          onclick={() => (sortDesc = !sortDesc)}>{sortDesc ? "▼" : "▲"}</button>
        <button bind:this={doneButton} class="h-9 rounded-[10px] border border-border px-3.5 text-sm font-semibold" onclick={closeExpanded}>Done</button>
      </div>

      <div class="mx-3 flex shrink-0 gap-0.5 rounded-[11px] bg-card p-[3px]" role="group" aria-label="Filter by attack type">
        {#each typeRows as row (row.type)}
          {@const on = filter.type === row.type}
          <button
            class={cn("flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold", on ? "bg-accent text-foreground" : "text-muted-foreground")}
            aria-pressed={on}
            onclick={() => setType(row.type)}
          >
            {typeLabel(row.type)}<span class="text-[11px] font-medium text-muted-foreground tabular-nums">{row.n}</span>
          </button>
        {/each}
      </div>
      <div class="mx-3 flex shrink-0 gap-0.5 rounded-[11px] bg-card p-[3px]" role="group" aria-label="Filter by rarity">
        {#each starRows as row (row.stars)}
          {@const on = filter.stars === row.stars}
          <button
            class={cn("flex h-[34px] min-w-0 flex-1 flex-col items-center justify-center gap-px rounded-lg", on && "bg-accent", row.n === 0 && !on && "opacity-40")}
            aria-pressed={on}
            aria-label={`${row.stars === 0 ? "Any rarity" : `${row.stars} star`}, ${row.n}`}
            onclick={() => setStars(row.stars)}
          >
            <span class={cn("text-[13px] leading-none font-semibold", on ? "text-foreground" : "text-muted-foreground")}>{starLabel(row.stars)}</span>
            <span class="text-[10px] leading-none text-muted-foreground tabular-nums">{row.n}</span>
          </button>
        {/each}
      </div>
      {#if traits.length > 0}
        <div class="flex shrink-0 gap-1.5 overflow-x-auto px-3 [scrollbar-width:none]" role="group" aria-label="Filter by trait">
          {#each traits as t (t)}
            {@const on = filter.trait === t}
            <button
              class={cn(
                "h-8 shrink-0 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground",
              )}
              aria-pressed={on}
              onclick={() => toggleTrait(t)}
            >
              {traitLabel(t)}
            </button>
          {/each}
        </div>
      {/if}

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2 pb-3" data-drag-scroll="y">
        {#if cards.length > 0 && shown.length === 0}
          {@render emptyFiltered("flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground")}
        {:else if cards.length === 0}
          <p class="py-8 text-center text-sm text-muted-foreground">No heroes yet — summon some with Tribute.</p>
        {:else}
          <div class="grid grid-cols-4 gap-x-2.5 gap-y-3">
            {#each shown as card (card.id)}
              <div class="flex min-w-0 flex-col items-center gap-1">
                {@render cardButton(card, "grid")}
                <span class="max-w-full truncate text-[11px] leading-tight text-muted-foreground">{UNITS[card.unitId].name}</span>
              </div>
            {/each}
          </div>
        {/if}
        <p class="pt-3.5 text-center text-xs text-muted-foreground">
          <!-- The grid scrolls vertically, so a card lifts on a sideways drag (then goes anywhere). -->
          {locked ? "Formation locked until the battle ends · tap for details" : "Drag a hero sideways to lift it · tap for details"}
        </p>
      </div>
    {/if}
  </div>
{/if}
