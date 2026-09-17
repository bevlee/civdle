<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import FloatingText from "./FloatingText.svelte";
  import { AGES, RESOURCES, type ResourceId, SKILLS, type SkillId } from "$lib/gameData";
  import type { AgeAdvanceStatus, AgeBonus } from "$lib/gameEngine";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import { cn } from "$lib/utils";

  let {
    ageIndex,
    ageBonus,
    skillPoints,
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
    levels: Record<SkillId, number>;
    resources: Partial<Record<ResourceId, number>>;
    ageAdvanceStatus: AgeAdvanceStatus;
    onAdvance: () => void;
    events: QueuedEvent[];
    onDismissEvent: (id: string) => void;
  } = $props();

  let age = $derived(AGES[ageIndex]);
  let timeReductionPct = $derived(Math.round((1 - ageBonus.timeMult) * 100));
  let outputBonusPct = $derived(Math.round((ageBonus.outputMult - 1) * 100));

  let skillPointEvents = $derived(
    events.filter(
      (e): e is QueuedEvent<{ amount: number }> => e.type === "skillPoint",
    ),
  );

  let ageAdvanceEvents = $derived(
    events.filter(
      (e): e is QueuedEvent<{ ageName: string; speedPct: number; outputPct: number }> =>
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
      {#if ageIndex > 0}
        <span class="text-xs text-muted-foreground">
          -{timeReductionPct}% time, +{outputBonusPct}% output
        </span>
      {/if}
      {#each ageAdvanceEvents as event (event.id)}
        <FloatingText
          id={event.id}
          text={`+${event.data.speedPct}% Speed`}
          class="text-sm text-amber-400"
          duration={1400}
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
    </div>
  {/if}
</header>
