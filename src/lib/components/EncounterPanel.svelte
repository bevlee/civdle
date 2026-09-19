<script lang="ts">
  import {
    ATTACK_TYPES,
    ENEMY_ARCHETYPES,
    UNITS,
    getTypeMultiplier,
    type Encounter,
    type UnitCard as UnitCardT,
  } from "$lib/combatData";
  import type { BattleMode } from "$lib/combatEngine";
  import { isFrontRow, indexToPosition } from "$lib/position";
  import UnitCard from "./UnitCard.svelte";
  import { cn } from "$lib/utils";

  let {
    encounter,
    partyCards,
    mode = "story",
  }: {
    encounter: Encounter;
    partyCards: UnitCardT[];
    mode?: BattleMode;
  } = $props();

  let boss = $derived(encounter.bossId ? encounter.cards.find((c) => c.id === encounter.bossId) ?? null : null);
  let minions = $derived(encounter.cards.filter((c) => c.id !== encounter.bossId));
  let statBonusPct = $derived(Math.round(((encounter.statMult ?? 1) - 1) * 100));

  let arch = $derived(ENEMY_ARCHETYPES[encounter.archetype]);
  let enemyType = $derived(ATTACK_TYPES[arch.attackType]);
  let counterType = $derived(ATTACK_TYPES[enemyType.weakTo]);

  let matchups = $derived(
    partyCards.map((card) => {
      const type = UNITS[card.unitId].attackType;
      const mult = getTypeMultiplier(type, arch.attackType);
      return { card, type, mult };
    }),
  );
  let strongCount = $derived(matchups.filter((m) => m.mult > 1).length);
  let weakCount = $derived(matchups.filter((m) => m.mult < 1).length);

  let verdict = $derived.by(() => {
    if (partyCards.length === 0) return { text: "Add units to your party to see the matchup.", tone: "muted" };
    if (strongCount === partyCards.length) return { text: "Perfect counter — every unit hits for ×1.5.", tone: "good" };
    if (strongCount >= 2) return { text: `${strongCount} of ${partyCards.length} units counter this army.`, tone: "good" };
    if (weakCount >= 2) return { text: `${weakCount} of ${partyCards.length} units are weak here — swap in ${counterType.name.toLowerCase()} units.`, tone: "bad" };
    if (strongCount === 1) return { text: `1 of ${partyCards.length} units counters this army. More ${counterType.name.toLowerCase()} would help.`, tone: "ok" };
    return { text: `No counters fielded. ${counterType.icon} ${counterType.name} units deal ×1.5 to ${enemyType.name.toLowerCase()}.`, tone: "bad" };
  });
</script>

<div class="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    {#if boss}
      <span class="rounded-md bg-red-600 px-2 py-0.5 text-sm font-black tracking-wider text-white">BOSS</span>
    {/if}
    <span
      class="rounded-md px-2 py-0.5 text-sm font-bold"
      style:background-color="color-mix(in oklch, var(--destructive) 25%, transparent)"
    >
      {enemyType.icon} {arch.name}
    </span>
    {#if statBonusPct > 0}
      <span
        class="rounded-md bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-red-300"
        title={mode === "depths"
          ? "The Depths scale every enemy's HP, ATK and DEF a little more each level"
          : "Boss armies fight with a stat bonus"}
      >
        +{statBonusPct}% stats
      </span>
    {/if}
    <span class="text-xs text-muted-foreground">
      {#if boss}
        {UNITS[boss.unitId].name} leads {minions.length} minion{minions.length === 1 ? "" : "s"}. {arch.blurb}
      {:else}
        {arch.blurb}
      {/if}
    </span>
  </div>
  <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
    <span><span class="text-green-400">Strength:</span> {arch.strengths}</span>
    <span><span class="text-red-400">Weakness:</span> {arch.weakness}</span>
  </div>

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
        <div class="relative">
          {#if isBoss}
            <span class="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded bg-red-600 px-1.5 text-[9px] font-black tracking-wider text-white shadow">BOSS</span>
          {/if}
          <UnitCard unitId={card.unitId} stars={card.stars} size="sm" />
        </div>
        {#if front}
          <span class="text-[10px] text-red-400/70">front row</span>
        {/if}
      </div>
    {/each}
  </div>

  <div class="flex flex-col gap-1 rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-xs">
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-semibold">Your matchup:</span>
      {#each matchups as m (m.card.id)}
        <span
          class={cn(
            "rounded px-1.5 py-0.5",
            m.mult > 1 && "bg-green-500/20 text-green-300",
            m.mult < 1 && "bg-red-500/20 text-red-300",
            m.mult === 1 && "bg-muted text-muted-foreground",
          )}
          title={`${UNITS[m.card.unitId].name} (${ATTACK_TYPES[m.type].name}) vs ${enemyType.name}`}
        >
          {ATTACK_TYPES[m.type].icon} {UNITS[m.card.unitId].name}
          {m.mult > 1 ? "▲ ×1.5" : m.mult < 1 ? "▼ ×0.75" : "×1"}
        </span>
      {/each}
    </div>
    <p
      class={cn(
        verdict.tone === "good" && "text-green-300",
        verdict.tone === "bad" && "text-red-300",
        verdict.tone === "ok" && "text-yellow-300",
        verdict.tone === "muted" && "text-muted-foreground",
      )}
    >
      {verdict.text}
    </p>
  </div>
</div>
