<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import FloatingText from "./FloatingText.svelte";
  import { AGES, RESOURCES, type ResourceId, SKILLS, type SkillId } from "$lib/gameData";
  import { describeAgeBonus, describeAgeReward, type AgeAdvanceStatus, type AgeBonus } from "$lib/gameEngine";
  import type { AgeAdvanceEventData } from "$lib/gameState.svelte";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import { cn } from "$lib/utils";

  let {
    ageIndex,
    ageBonus,
    skillPoints,
    warSpoils,
    levels,
    resources,
    ageAdvanceStatus,
    onAdvance,
    events,
    onDismissEvent,
  }: {
    ageIndex: number;
    ageBonus: AgeBonus;
    skillPoints: number;
    warSpoils: number;
    levels: Record<SkillId, number>;
    resources: Partial<Record<ResourceId, number>>;
    ageAdvanceStatus: AgeAdvanceStatus;
    onAdvance: () => void;
    events: QueuedEvent[];
    onDismissEvent: (id: string) => void;
  } = $props();

  let age = $derived(AGES[ageIndex]);
  let bonusText = $derived(describeAgeBonus(ageBonus));
  let nextReward = $derived(ageAdvanceStatus.nextAge ? describeAgeReward(ageAdvanceStatus.nextAge) : []);
  let nextBonusText = $derived.by(() => {
    const next = ageAdvanceStatus.nextAge;
    return next ? describeAgeBonus({ flatTimeReduction: next.bonus.flatTime, outputMult: next.bonus.outputMult }) : "";
  });

  let skillPointEvents = $derived(
    events.filter(
      (e): e is QueuedEvent<{ amount: number }> => e.type === "skillPoint",
    ),
  );

  let spoilsEvents = $derived(
    events.filter(
      (e): e is QueuedEvent<{ amount: number }> => e.type === "spoilsGain",
    ),
  );

  let ageAdvanceEvents = $derived(
    events.filter(
      (e): e is QueuedEvent<AgeAdvanceEventData> =>
        e.type === "ageAdvance",
    ),
  );

  let checklist = $derived.by(() => {
    const { nextAge, cost } = ageAdvanceStatus;
    if (!nextAge) return [];
    return [
      ...nextAge.condition.map((c) => ({
        label: `${SKILLS[c.skill].name} Lv ${c.level}`,
        current: levels[c.skill] ?? 0,
        required: c.level,
        met: (levels[c.skill] ?? 0) >= c.level,
      })),
      ...cost.map((c) => ({
        label: RESOURCES[c.resource].name,
        current: Math.floor(resources[c.resource] ?? 0),
        required: c.amount,
        met: (resources[c.resource] ?? 0) >= c.amount,
      })),
    ];
  });

  let disabledReason = $derived.by(() => {
    const { skillsMet, resourcesMet } = ageAdvanceStatus;
    if (skillsMet && resourcesMet) return undefined;
    const missing = checklist
      .filter((c) => !c.met)
      .map((c) => `${c.label} (${c.current}/${c.required})`);
    return `Still needed: ${missing.join(", ")}`;
  });
</script>

<header class="flex flex-col gap-3 border-b border-border px-6 py-4">
  <div class="flex items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <h1 class="text-lg font-bold tracking-tight">Civdle</h1>
      <Badge variant="secondary" class="text-sm">{age.name}</Badge>
      {#if bonusText}
        <span class="text-xs text-muted-foreground">{bonusText}</span>
      {/if}
      {#each ageAdvanceEvents as event (event.id)}
        <FloatingText
          id={event.id}
          text={event.data.bonusText}
          class="text-sm text-amber-400"
          duration={1400}
          onDone={onDismissEvent}
        />
      {/each}
    </div>
    <div class="flex items-center gap-4">
      <div class="relative flex items-center gap-2" title="Tribute — earned in combat, spent on summons">
        <span class="text-sm text-muted-foreground">⚔ Tribute</span>
        <Badge variant="secondary" class="text-sm tabular-nums">
          {warSpoils}
        </Badge>
        {#each spoilsEvents as event (event.id)}
          <FloatingText
            id={event.id}
            text={`+${event.data.amount} ⚔`}
            class="right-0 left-auto text-sm text-emerald-400"
            onDone={onDismissEvent}
          />
        {/each}
      </div>
      <div class="relative flex items-center gap-2">
        <span class="text-sm text-muted-foreground">Skill Points</span>
        <Badge class="text-sm">{skillPoints}</Badge>
        {#each skillPointEvents as event (event.id)}
          <FloatingText
            id={event.id}
            text={`+${event.data.amount} SP`}
            class="right-0 left-auto text-sm text-emerald-400"
            onDone={onDismissEvent}
          />
        {/each}
      </div>
    </div>
  </div>
  {#if ageAdvanceStatus.nextAge}
    <div class="flex flex-wrap items-center gap-3">
      <Button
        onclick={onAdvance}
        disabled={!ageAdvanceStatus.canAdvance}
        title={disabledReason}
        variant={ageAdvanceStatus.canAdvance ? "default" : "secondary"}
        class={cn(ageAdvanceStatus.canAdvance && "animate-pulse-glow")}
      >
        Advance to {ageAdvanceStatus.nextAge.name}
      </Button>
      <div class="flex flex-wrap gap-2">
        {#each checklist as item (item.label)}
          <span
            class={cn(
              "rounded-md border px-2 py-1 text-xs",
              item.met
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-border text-muted-foreground",
            )}
          >
            {item.met ? "✓ " : ""}{item.label}{!item.met
              ? ` (${item.current}/${item.required})`
              : ""}
          </span>
        {/each}
      </div>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="font-semibold text-amber-300">Reward</span>
        {#each [nextBonusText, ...nextReward].filter(Boolean) as reward (reward)}
          <span class="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-300">
            {reward}
          </span>
        {/each}
      </div>
    </div>
  {/if}
</header>
