<script lang="ts">
  import {
    ATTACK_TYPES,
    ENEMY_ARCHETYPES,
    UNITS,
    getTypeMultiplier,
    type Encounter,
    type UnitCard as UnitCardT,
  } from "$lib/combatData";
  import UnitCard from "./UnitCard.svelte";
  import { cn } from "$lib/utils";

  let {
    encounter,
    partyCards,
    tutorialSeen,
    onDismissTutorial,
  }: {
    encounter: Encounter;
    partyCards: UnitCardT[];
    tutorialSeen: boolean;
    onDismissTutorial: () => void;
  } = $props();

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
  {#if !tutorialSeen}
    <div class="flex items-start justify-between gap-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs">
      <div class="flex flex-col gap-1">
        <p class="font-semibold text-sky-300">How to win fights</p>
        <p>
          Every unit is <b>⚔ Melee</b>, <b>🏹 Ranged</b> or <b>✨ Magic</b>.
          ⚔ beats 🏹, 🏹 beats ✨, ✨ beats ⚔. Strong hits deal <b>×1.5</b> (shown with a red ▲), weak hits deal ×0.75.
        </p>
        <p>
          Scout the enemy army below, then build a party that counters it. If you lose, the same army waits — change your composition and try again.
        </p>
      </div>
      <button class="shrink-0 text-muted-foreground hover:text-foreground" onclick={onDismissTutorial} title="Got it">✕</button>
    </div>
  {/if}

  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <span
      class="rounded-md px-2 py-0.5 text-sm font-bold"
      style:background-color="color-mix(in oklch, var(--destructive) 25%, transparent)"
    >
      {enemyType.icon} {arch.name}
    </span>
    <span class="text-xs text-muted-foreground">{arch.blurb}</span>
  </div>
  <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
    <span><span class="text-green-400">Strength:</span> {arch.strengths}</span>
    <span><span class="text-red-400">Weakness:</span> {arch.weakness}</span>
  </div>

  <div class="flex flex-wrap gap-2">
    {#each encounter.cards as card (card.id)}
      <UnitCard unitId={card.unitId} stars={card.stars} size="sm" />
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
