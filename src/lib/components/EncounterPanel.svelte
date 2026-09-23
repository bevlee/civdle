<script lang="ts">
  import {
    FACTIONS,
    regionForLevel,
    flavorForLevel,
    isBossLevel,
    type Encounter,
    type UnitCard as UnitCardT,
  } from "$lib/combatData";
  import type { BattleMode } from "$lib/combatEngine";
  import { isFrontRow, indexToPosition } from "$lib/position";
  import UnitCard from "./UnitCard.svelte";
  import Hint from "./Hint.svelte";
  import { cn } from "$lib/utils";

  let {
    encounter,
    mode = "story",
    level = 1,
    onSelectEnemy,
  }: {
    encounter: Encounter;
    mode?: BattleMode;
    level?: number;
    onSelectEnemy?: (card: UnitCardT) => void;
  } = $props();

  let boss = $derived(encounter.bossId ? encounter.cards.find((c) => c.id === encounter.bossId) ?? null : null);
  let statBonusPct = $derived(Math.round(((encounter.statMult ?? 1) - 1) * 100));

  let region = $derived(mode === "story" ? regionForLevel(level) : null);
  let factionDef = $derived(FACTIONS[encounter.faction]);
  let flavor = $derived(
    mode === "story"
      ? isBossLevel(level) && region
        ? region.bossLine
        : flavorForLevel(level)
      : "The darkness deepens. Something stirs below.",
  );
</script>

<div class="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    {#if boss}
      <span class="rounded-md bg-red-600 px-2 py-0.5 text-sm font-black tracking-wider text-white">BOSS</span>
    {/if}
    {#if region}
      <span
        class="rounded-md px-2 py-0.5 text-sm font-bold"
        style:background-color="color-mix(in oklch, {factionDef.color} 30%, transparent)"
        style:color={factionDef.color}
      >
        {region.name}
      </span>
    {/if}
    {#if statBonusPct > 0}
      <Hint text={mode === "depths"
        ? "The Abyss scales every enemy's HP, ATK and DEF a little more each level"
        : "Boss armies fight with a stat bonus"}>
        <span class="cursor-help rounded-md bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-red-300">
          +{statBonusPct}% stats
        </span>
      </Hint>
    {/if}
  </div>
  <p class="text-xs italic text-muted-foreground">{flavor}</p>

  <div class="flex flex-col gap-1">
    {#each encounter.cards as card, idx (card.id)}
      {@const pos = indexToPosition(idx)}
      {@const front = isFrontRow(pos)}
      {@const isBoss = card.id === encounter.bossId}
      <div class="flex items-center gap-2">
        <span
          class={cn(
            "w-7 shrink-0 rounded px-1 py-0.5 text-center text-[10px] font-bold",
            front
              ? "bg-destructive/25 text-red-300"
              : "bg-muted text-muted-foreground",
          )}
          title={front ? `Position ${pos} — Front row (targeted first)` : `Position ${pos} — Back row`}
        >
          {pos}{front ? "F" : ""}
        </span>
        <button
          class="relative rounded transition-transform hover:scale-105"
          onclick={() => onSelectEnemy?.({ id: card.id, unitId: card.unitId, stars: card.stars })}
          title="Click to view stats"
        >
          {#if isBoss}
            <span class="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded bg-red-600 px-1.5 text-[9px] font-black tracking-wider text-white shadow">BOSS</span>
          {/if}
          <UnitCard unitId={card.unitId} stars={card.stars} ascended={card.ascended} size="sm" />
        </button>
        {#if front}
          <span class="text-[10px] text-red-400/70">front row</span>
        {/if}
      </div>
    {/each}
  </div>
</div>
