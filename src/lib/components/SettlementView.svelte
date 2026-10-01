<script lang="ts">
  import { RESOURCES, type SkillId } from "$lib/gameData";
  import { getTreasuryMultiplier, type GameState } from "$lib/gameEngine";
  import { rarityColor } from "$lib/rarity";
  import { SETTLEMENT_UPGRADES, SETTLEMENT_UPGRADE_ORDER, type RollRate, type SettlementUpgradeId } from "$lib/settlementData";
  import { cn } from "$lib/utils";
  import { settlementGroups, type BuildingView } from "$lib/view/settlementGroups";
  import { oddsSource, theAge } from "$lib/view/summonBanners";
  import { ageNameForStars, displayOdds } from "$lib/view/summonOdds";
  import { costJump, lockedOddsNote, missingLabel } from "$lib/view/townView";

  /** Settlement buildings, grouped by what is next, with the summon odds they improve. */
  let {
    state: gameState,
    levels,
    rollRates,
    maxSummonStars,
    onBuy,
    onJump,
  }: {
    state: GameState;
    levels: Record<SkillId, number>;
    rollRates: RollRate[];
    maxSummonStars: number;
    onBuy: (upgradeId: SettlementUpgradeId) => void;
    /** Open Train on the skill (and recipe, when it may be shown) that makes a missing material. */
    onJump: (skillId: SkillId, recipeId: string | null) => void;
  } = $props();

  const GATHERING_PREVIEW = 2;

  let groups = $derived(settlementGroups(gameState, levels));
  let showAllGathering = $state(false);

  let odds = $derived(displayOdds(rollRates, maxSummonStars, ageNameForStars));
  let lockedNote = $derived(lockedOddsNote(odds));
  let source = $derived(oddsSource(new Set(gameState.settlementUpgrades)));
  let tributeMul = $derived(getTreasuryMultiplier(gameState));

  let gatheringShown = $derived(
    showAllGathering ? groups.gathering : groups.gathering.slice(0, GATHERING_PREVIEW),
  );

  const unlocked = (id: SkillId) => gameState.skills[id].unlocked;
</script>

{#snippet header(label: string, count: string)}
  <div class="flex items-baseline justify-between gap-3">
    <h3 class="min-w-0 flex-1 text-xs font-semibold tracking-[.06em] text-muted-foreground uppercase">{label}</h3>
    <span class="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">{count}</span>
  </div>
{/snippet}

{#snippet card(b: BuildingView)}
  {@const def = SETTLEMENT_UPGRADES[b.id]}
  {@const missing = b.cost.filter((c) => c.short).length}
  <article
    class={cn(
      "flex flex-col gap-3 rounded-[14px] border px-3.5 py-3",
      b.built && "border-emerald-500/30 bg-emerald-500/[.06]",
      !b.built && b.ready && "border-primary/45 bg-card",
      !b.built && !b.ready && "border-border bg-card",
    )}
    data-building={b.id}
  >
    <div class="flex items-start gap-3">
      <span
        class={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-accent text-xl",
          b.lockedReason && "opacity-60 grayscale",
        )}
        aria-hidden="true">{def.icon}</span
      >
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="flex items-center gap-2">
          <span class="text-[15px] font-semibold">{def.name}</span>
          {#if b.built}
            <span class="rounded-[5px] bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-bold tracking-[.04em] text-emerald-400">
              BUILT
            </span>
          {/if}
        </span>
        <span class="text-[13px] leading-snug text-pretty text-muted-foreground">{def.description}</span>
      </span>
    </div>

    {#if !b.built}
      <!-- Phones space wrapped rows apart so the jump chips' 44px hit areas don't overlap. -->
      <div class="flex flex-wrap gap-1.5 max-md:gap-y-3">
        {#each b.cost as c (c.resource)}
          {@const jump = c.short ? costJump(c.resource, levels, unlocked) : null}
          {@const chipClass = cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px]",
            c.short
              ? "border-red-500/35 bg-red-500/10 text-red-300"
              : "border-emerald-500/30 bg-emerald-500/[.08] text-emerald-400",
          )}
          {#if jump}
            <button
              class={cn(chipClass, "tap-target hover:bg-red-500/20")}
              aria-label={`${RESOURCES[c.resource].name}: ${c.have.toLocaleString()} of ${c.need.toLocaleString()}. Train it in ${jump.label}`}
              onclick={() => onJump(jump.skillId, jump.recipeId)}
            >
              <span>{RESOURCES[c.resource].name}</span>
              <span class="font-semibold tabular-nums">{c.have.toLocaleString()}/{c.need.toLocaleString()}</span>
              <span class="font-semibold" aria-hidden="true">›</span>
            </button>
          {:else}
            <span class={chipClass}>
              <span>{RESOURCES[c.resource].name}</span>
              <span class="font-semibold tabular-nums">{c.have.toLocaleString()}/{c.need.toLocaleString()}</span>
            </span>
          {/if}
        {/each}
      </div>

      {#if b.lockedReason}
        <p class="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-accent/50 text-sm font-medium text-muted-foreground">
          <span aria-hidden="true">🔒</span>{b.lockedReason}
        </p>
      {:else if b.ready}
        <button
          class="h-11 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
          onclick={() => onBuy(b.id)}
        >
          Build {def.name}
        </button>
      {:else}
        <button class="h-11 rounded-xl bg-accent text-[15px] font-semibold text-muted-foreground" disabled>
          {missingLabel(missing)}
        </button>
      {/if}
    {/if}
  </article>
{/snippet}

<div class="flex flex-col gap-5">
  <p class="text-sm leading-normal text-pretty text-muted-foreground">
    Spend what your skills produce on permanent upgrades for your army.
  </p>

  <section class="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-3.5" aria-label="Summon odds">
    <div class="flex items-baseline justify-between gap-2">
      <h3 class="text-[15px] font-semibold">Summon odds</h3>
      <span class="text-xs text-muted-foreground">{source}</span>
    </div>
    <div class="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
      {#each odds as row (row.stars)}
        {#if row.pct > 0}
          <span
            class="h-full transition-[width] duration-500"
            style:width={`${row.pct}%`}
            style:background-color={rarityColor(row.stars)}
          ></span>
        {/if}
      {/each}
    </div>
    <dl class="grid grid-cols-5">
      {#each odds as row (row.stars)}
        <div class="flex flex-col items-center gap-px">
          <dt
            class={cn("text-[11px] font-semibold", row.lockedUntil && "text-muted-foreground")}
            style:color={row.lockedUntil ? undefined : rarityColor(row.stars)}
          >
            {row.stars}★
          </dt>
          <dd class="text-sm font-semibold tabular-nums">
            {#if row.lockedUntil}
              <span aria-hidden="true">🔒</span><span class="sr-only">Locked until {theAge(row.lockedUntil)}</span>
            {:else}
              {row.pct}%
            {/if}
          </dd>
        </div>
      {/each}
    </dl>
    {#if lockedNote}
      <p class="-mt-1 text-center text-xs text-muted-foreground">{lockedNote}</p>
    {/if}
    <div class="flex justify-between border-t border-border pt-2.5 text-sm">
      <span class="text-muted-foreground">Abyss tribute</span>
      <span class="font-semibold tabular-nums">×{tributeMul}</span>
    </div>
  </section>

  {#if groups.ready.length > 0}
    <section class="flex flex-col gap-2">
      {@render header("Ready to build", `${groups.ready.length}`)}
      {#each groups.ready as b (b.id)}{@render card(b)}{/each}
    </section>
  {/if}

  {#if groups.gathering.length > 0}
    <section class="flex flex-col gap-2">
      {@render header("Gathering materials", `${groups.gathering.length}`)}
      {#each gatheringShown as b (b.id)}{@render card(b)}{/each}
      {#if groups.gathering.length > GATHERING_PREVIEW}
        <button
          class="h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground"
          aria-expanded={showAllGathering}
          onclick={() => (showAllGathering = !showAllGathering)}
        >
          {showAllGathering ? "Show fewer" : `Show ${groups.gathering.length - GATHERING_PREVIEW} more`}
        </button>
      {/if}
    </section>
  {/if}

  {#if groups.locked.length > 0}
    <section class="flex flex-col gap-2">
      {@render header("Locked", `${groups.locked.length}`)}
      {#each groups.locked as b (b.id)}{@render card(b)}{/each}
    </section>
  {/if}

  {#if groups.built.length > 0}
    <section class="flex flex-col gap-2">
      {@render header("Built", `${groups.built.length}/${SETTLEMENT_UPGRADE_ORDER.length}`)}
      {#each groups.built as b (b.id)}{@render card(b)}{/each}
    </section>
  {/if}
</div>
