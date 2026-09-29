<script lang="ts">
  import { Dialog } from "bits-ui";
  import { MediaQuery } from "svelte/reactivity";
  import { UNITS } from "$lib/combatData";
  import type { CivdleGame } from "$lib/gameState.svelte";
  import { rarityColor } from "$lib/rarity";
  import { cn } from "$lib/utils";
  import { ageNameForStars, displayOdds } from "$lib/view/summonOdds";
  import {
    bestPull,
    formatAmount,
    oddsSource,
    pulledCards,
    summonBanners,
    theAge,
    type BannerId,
    type PulledCard,
    type SummonOption,
  } from "$lib/view/summonBanners";
  import BottomSheet from "./mobile/BottomSheet.svelte";
  import UnitCard from "./UnitCard.svelte";

  /**
   * Summons: a bottom sheet on phones, a dialog on wider screens. While a summon's reveal
   * plays (a full-screen overlay) the panel steps aside, then comes back with the results.
   */
  let {
    game,
    open,
    locked = false,
    onClose,
    onOpenSettlement,
  }: {
    game: CivdleGame;
    open: boolean;
    /** A battle is on: summons wait until it ends. */
    locked?: boolean;
    onClose: () => void;
    /** Jump to the Settlement, where the buildings that unlock and improve summons are. */
    onOpenSettlement?: () => void;
  } = $props();

  const wide = new MediaQuery("(min-width: 48rem)");

  let selectedId = $state<BannerId>("standard");
  let results = $state<PulledCard[]>([]);

  let revealing = $derived(game.events.some((e) => e.type === "summon" || e.type === "summonPack"));
  let shown = $derived(open && !revealing);

  let tribute = $derived(game.state.gacha.gold);
  let glory = $derived(game.glory);
  let showGlory = $derived(glory > 0 || game.hasCelestialAltar || game.legendarySummonsUnlocked);
  let banners = $derived(
    summonBanners({
      tribute,
      glory,
      maxStars: game.maxSummonStars,
      ageIndex: game.state.ageIndex,
      hasCelestialAltar: game.hasCelestialAltar,
      hasHallOfLegends: game.hasHallOfLegends,
    }),
  );
  let banner = $derived(banners.find((b) => b.id === selectedId) ?? banners[0]);

  // Odds as rows: the standard banner's live rates (capped tiers locked), else a guaranteed 5★.
  let odds = $derived(
    banner.id === "standard"
      ? displayOdds(game.rollRates, game.maxSummonStars, ageNameForStars)
      : [{ stars: 5, pct: 100, lockedUntil: undefined }],
  );
  let maxPct = $derived(Math.max(1, ...odds.map((r) => r.pct)));
  let source = $derived(banner.id === "standard" ? oddsSource(new Set(game.state.settlementUpgrades)) : "Guaranteed");

  let best = $derived(bestPull(results));

  function close() {
    results = [];
    onClose();
  }

  function pick(id: BannerId) {
    selectedId = id;
    results = [];
  }

  function goToSettlement() {
    close();
    onOpenSettlement?.();
  }

  const affordable = (option: SummonOption) => !banner.locked && !locked && banner.balance >= option.cost;

  function optionSub(option: SummonOption): string {
    const price = `${formatAmount(option.cost)} ${banner.currency}`;
    if (banner.locked) return "Locked";
    if (locked) return "After the battle";
    return banner.balance >= option.cost ? price : `Need ${price}`;
  }

  function summon(option: SummonOption) {
    if (!affordable(option)) return;
    const before = game.state.gacha.cards;
    if (banner.id === "standard") {
      if (option.count === 1) game.rollCard();
      else game.rollPack();
    } else if (banner.id === "legendary") {
      if (option.count === 1) game.rollLegendarySingle();
      else game.rollLegendaryPack();
    } else {
      game.rollTributeLegendaryPack();
    }
    const pulls = pulledCards(before, game.state.gacha.cards);
    if (pulls.length > 0) results = pulls;
  }
</script>

{#snippet balances()}
  <span class="flex justify-end gap-3.5">
    <span class="flex flex-col items-end gap-0.5 leading-[1.1]">
      <span class="text-base font-bold tabular-nums">{formatAmount(tribute)}</span>
      <span class="text-[10px] font-semibold tracking-[.04em] text-muted-foreground">TRIBUTE</span>
    </span>
    {#if showGlory}
      <span class="flex flex-col items-end gap-0.5 leading-[1.1]">
        <span class="text-base font-bold tabular-nums">{formatAmount(glory)}</span>
        <span class="text-[10px] font-semibold tracking-[.04em] text-muted-foreground">GLORY</span>
      </span>
    {/if}
  </span>
{/snippet}

{#snippet body()}
  <div class="flex flex-col gap-4 pt-3 pb-1">
    <div class="grid grid-cols-3 gap-2" role="group" aria-label="Banner">
      {#each banners as b (b.id)}
        {@const on = b.id === banner.id}
        <button
          class={cn(
            "flex min-h-[74px] min-w-0 flex-col items-start justify-between gap-1.5 rounded-xl border p-2.5 text-left transition-colors",
            on ? "border-primary bg-accent" : "border-border bg-card hover:bg-accent/50",
          )}
          aria-pressed={on}
          onclick={() => pick(b.id)}
        >
          <span class={cn("text-[11px] leading-none tracking-[-1px]", b.locked ? "text-muted-foreground/50" : "text-yellow-400")} aria-label={`${b.stars} stars`}>
            {"★".repeat(b.stars)}
          </span>
          <span class="flex w-full min-w-0 flex-col gap-0.5 leading-[1.15]">
            <span class={cn("text-sm font-bold whitespace-nowrap", b.locked ? "text-muted-foreground" : "text-foreground")}>{b.name}</span>
            <span class="truncate text-[11px] font-medium text-muted-foreground">{b.status}</span>
          </span>
        </button>
      {/each}
    </div>

    <div class="flex flex-col gap-1">
      <h3 class="text-xl font-bold tracking-[-.01em]">{banner.title}</h3>
      <p class="text-sm leading-normal text-pretty text-muted-foreground">{banner.description}</p>
    </div>

    {#if results.length > 0 && best}
      <div class="flex flex-col gap-3 rounded-[14px] border border-yellow-400/35 bg-yellow-400/5 p-3.5" aria-live="polite">
        <div class="flex items-baseline justify-between gap-3">
          <span class="min-w-0 flex-1 text-xs font-semibold tracking-[.06em] text-muted-foreground uppercase">You summoned</span>
          <span class="shrink-0 text-[13px] font-semibold whitespace-nowrap" style:color={rarityColor(UNITS[best.card.unitId].baseStars)}>
            Best · {UNITS[best.card.unitId].baseStars}★ {UNITS[best.card.unitId].name}
          </span>
        </div>
        <div class="grid grid-cols-4 gap-x-3 gap-y-2.5 md:grid-cols-5">
          {#each results as pull (pull.card.id)}
            <div class="flex min-w-0 flex-col items-center gap-1">
              <div class="relative w-full">
                <UnitCard unitId={pull.card.unitId} stars={pull.card.stars} size="tile" class="aspect-[52/66] h-auto w-full rounded-[10px]" />
                {#if pull.isNew}
                  <span class="absolute -top-[7px] -right-[5px] rounded-[5px] bg-yellow-400 px-[5px] py-0.5 text-[9px] font-bold tracking-[.04em] text-black">NEW</span>
                {/if}
              </div>
              <span class="max-w-full truncate text-[11px] font-semibold">{UNITS[pull.card.unitId].name}</span>
            </div>
          {/each}
        </div>
        <span class="text-[13px] text-muted-foreground">Added to your army.</span>
      </div>
    {/if}

    {#if banner.locked}
      <div class="flex flex-col overflow-hidden rounded-[14px] border border-border bg-card">
        <span class="px-3.5 pt-3 pb-1 text-xs font-semibold tracking-[.06em] text-muted-foreground uppercase">To unlock</span>
        {#each banner.requirements as req (req.label)}
          <div class="flex min-h-[52px] items-center gap-2.5 py-1 pr-2 pl-3.5">
            <span
              class={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                req.done ? "border-transparent bg-green-400 text-black" : "border-foreground/30",
              )}
              aria-hidden="true">{req.done ? "✓" : ""}</span
            >
            <span class="flex min-w-0 flex-1 flex-col gap-px leading-tight">
              <span class={cn("text-[15px] font-semibold", req.done ? "text-muted-foreground" : "text-foreground")}>
                {req.label}<span class="sr-only">{req.done ? " (done)" : " (not yet)"}</span>
              </span>
              <span class="text-xs text-muted-foreground">{req.sub}</span>
            </span>
            {#if req.settlement && !req.done && onOpenSettlement}
              <button class="tap-target h-8 shrink-0 rounded-lg border border-border px-2.5 text-[13px] font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground" onclick={goToSettlement}>
                Settlement ›
              </button>
            {/if}
          </div>
        {/each}
        <div class="h-1.5"></div>
      </div>
    {/if}

    <div class="flex flex-col gap-2.5 rounded-[14px] border border-border bg-card p-3.5">
      <div class="flex items-baseline justify-between gap-2">
        <span class="min-w-0 flex-1 text-[15px] font-semibold">Odds</span>
        <span class="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{source}</span>
      </div>
      {#each odds as row (row.stars)}
        <div class="flex min-h-5 items-center gap-2.5">
          <span class="w-7 shrink-0 text-[13px] font-semibold" style:color={row.lockedUntil ? undefined : rarityColor(row.stars)} class:text-muted-foreground={!!row.lockedUntil}>
            {row.stars}★
          </span>
          {#if row.lockedUntil}
            <span class="flex-1 text-xs text-muted-foreground/70">🔒 Unlocks in {theAge(row.lockedUntil)}</span>
          {:else}
            <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-accent">
              <span class="block h-full rounded-full" style:width={`${(row.pct / maxPct) * 100}%`} style:background-color={rarityColor(row.stars)}></span>
            </span>
            <span class="w-10 shrink-0 text-right text-[13px] font-semibold tabular-nums">{row.pct}%</span>
          {/if}
        </div>
      {/each}
      {#if banner.id === "standard" && onOpenSettlement}
        <button class="tap-target h-7 self-start text-[13px] font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground" onclick={goToSettlement}>
          Improve odds in Settlement ›
        </button>
      {/if}
    </div>

    <div class="flex flex-col overflow-hidden rounded-[14px] border border-border">
      <span class="px-3.5 pt-3 pb-1 text-xs font-semibold tracking-[.06em] text-muted-foreground uppercase">Cost</span>
      {#each banner.options as option (option.count)}
        <div class="flex min-h-10 items-center gap-2.5 px-3.5">
          <span class="min-w-0 flex-1 text-[15px]">{option.count === 1 ? "Single summon" : `${option.count} heroes`}</span>
          {#if option.save > 0}
            <span class="shrink-0 rounded-md bg-green-500/15 px-[7px] py-0.5 text-xs font-semibold text-green-400">Save {formatAmount(option.save)}</span>
          {/if}
          <span class="shrink-0 text-[15px] font-semibold whitespace-nowrap tabular-nums">{formatAmount(option.cost)} {banner.currency}</span>
        </div>
      {/each}
      <div class="h-1.5"></div>
    </div>
  </div>
{/snippet}

{#snippet buttons()}
  <div class="flex gap-2 border-t border-border px-4 pt-3 pb-4">
    {#each banner.options as option, i (option.count)}
      {@const can = affordable(option)}
      {@const primary = can && i === banner.options.length - 1}
      <button
        class={cn(
          "flex h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors disabled:cursor-not-allowed",
          primary ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90" : can ? "border-border bg-card text-foreground hover:bg-accent" : "border-border text-muted-foreground",
        )}
        disabled={!can}
        onclick={() => summon(option)}
      >
        <span class="text-base font-bold">Summon ×{option.count}</span>
        <span class="text-xs font-medium whitespace-nowrap tabular-nums opacity-75">{optionSub(option)}</span>
      </button>
    {/each}
  </div>
{/snippet}

{#if wide.current}
  <Dialog.Root
    open={shown}
    onOpenChange={(next) => {
      if (!next) close();
    }}
  >
    <Dialog.Portal>
      <Dialog.Overlay class="fixed inset-0 z-[90] bg-black/60" />
      <Dialog.Content
        class="fixed top-1/2 left-1/2 z-[90] flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none"
      >
        <div class="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
          <Dialog.Title class="flex-1 text-lg font-bold">Summon</Dialog.Title>
          {@render balances()}
          <Dialog.Close class="-mr-2 flex size-9 items-center justify-center rounded-lg text-lg text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">×</Dialog.Close>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-5">
          {@render body()}
        </div>
        {@render buttons()}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
{:else}
  <BottomSheet open={shown} onClose={close} title="Summon" hideTitle class="h-[92dvh] max-h-[92dvh]">
    {#snippet header()}
      <div class="flex shrink-0 items-center gap-2 border-b border-border pr-4 pb-3 pl-1.5">
        <button class="flex h-11 flex-1 items-center gap-1 px-2.5 text-left text-[15px] font-semibold text-muted-foreground" onclick={close}>
          <span class="text-[22px] leading-none" aria-hidden="true">‹</span>Battle
        </button>
        <span class="text-lg font-bold" aria-hidden="true">Summon</span>
        <span class="flex flex-1 justify-end">{@render balances()}</span>
      </div>
    {/snippet}
    {#snippet footer()}
      {@render buttons()}
    {/snippet}
    {@render body()}
  </BottomSheet>
{/if}
