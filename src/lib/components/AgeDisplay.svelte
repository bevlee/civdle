<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import FloatingText from "./FloatingText.svelte";
  import Hint from "./Hint.svelte";
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

  const statClass =
    "cursor-help items-center gap-2 px-1.5 py-1 -mx-1.5 -my-1 transition-colors hover:bg-muted/60";

  let missing = $derived(checklist.filter((c) => !c.met));

  // On phones the requirements and rewards fold away behind a summary toggle.
  let detailsOpen = $state(false);
</script>

<header class="flex flex-col gap-2 border-b border-border px-3 py-2 sm:gap-3 sm:px-6 sm:py-4">
  <div class="flex items-center justify-between gap-2 sm:gap-4">
    <div class="flex min-w-0 items-center gap-2 sm:gap-3">
      <h1 class="text-base font-bold tracking-tight sm:text-lg">Civdle</h1>
      <Badge variant="secondary" class="text-xs sm:text-sm">{age.name}</Badge>
      {#if bonusText}
        <span class="hidden text-xs text-muted-foreground sm:inline">{bonusText}</span>
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
    <div class="flex shrink-0 items-center gap-3 sm:gap-4">
      <div class="relative flex items-center">
        <Hint side="bottom" class={statClass} title="⚔ Tribute" text="Earned by winning battles and from the Depths. Spend it on summons and card packs for your army.">
          <span class="text-sm text-muted-foreground">⚔ <span class="hidden sm:inline">Tribute</span></span>
          <Badge variant="secondary" class="text-sm tabular-nums">
            {warSpoils}
          </Badge>
        </Hint>
        {#each spoilsEvents as event (event.id)}
          <FloatingText
            id={event.id}
            text={`+${event.data.amount} ⚔`}
            class="right-0 left-auto text-sm text-emerald-400"
            onDone={onDismissEvent}
          />
        {/each}
      </div>
      <div class="relative flex items-center">
        <Hint side="bottom" class={statClass} title="Skill Points" text="Earned each time a skill levels up. Spend them in the Shop on permanent upgrades.">
          <span class="text-sm text-muted-foreground"><span class="sm:hidden">SP</span><span class="hidden sm:inline">Skill Points</span></span>
          <Badge class="text-sm tabular-nums">{skillPoints}</Badge>
        </Hint>
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
    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
      <Hint side="bottom" title="Still needed" disabled={missing.length === 0}>
        {#snippet content()}
          {#each missing as item (item.label)}
            <div class="flex justify-between gap-4">
              <span class="text-muted-foreground">{item.label}</span>
              <span class="tabular-nums">{item.current} / {item.required}</span>
            </div>
          {/each}
        {/snippet}
        <Button
          onclick={onAdvance}
          disabled={!ageAdvanceStatus.canAdvance}
          variant={ageAdvanceStatus.canAdvance ? "default" : "secondary"}
          class={cn(ageAdvanceStatus.canAdvance && "animate-pulse-glow")}
        >
          Advance to {ageAdvanceStatus.nextAge.name}
        </Button>
      </Hint>
      <button
        class="ml-auto flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 sm:hidden"
        aria-expanded={detailsOpen}
        aria-controls="age-advance-details"
        onclick={() => (detailsOpen = !detailsOpen)}
      >
        <span class={cn("tabular-nums", missing.length === 0 && "text-emerald-400")}>
          {checklist.length - missing.length}/{checklist.length} met
        </span>
        <span aria-hidden="true" class={cn("transition-transform", detailsOpen && "rotate-180")}>▾</span>
      </button>
      <div
        id="age-advance-details"
        class={cn("w-full flex-col gap-2 sm:contents", detailsOpen ? "flex" : "hidden")}
      >
        {#if bonusText}
          <span class="text-xs text-muted-foreground sm:hidden">Current bonus: {bonusText}</span>
        {/if}
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
    </div>
  {/if}
</header>
