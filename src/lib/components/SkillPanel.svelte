<script lang="ts">
  import SkillRow from "./SkillRow.svelte";
  import type { SkillId } from "$lib/gameData";
  import { nextDiscovery, skillGroups } from "$lib/view/skillGroups";
  import type { GameState } from "$lib/gameEngine";
  import { xpProgressPct } from "$lib/view/xpProgress";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import { cn } from "$lib/utils";

  let {
    state: game,
    levels,
    selectedSkill,
    onSelect,
    events,
    onDismissEvent,
    class: className,
  }: {
    state: GameState;
    levels: Record<SkillId, number>;
    selectedSkill: SkillId | null;
    onSelect: (id: SkillId) => void;
    events: QueuedEvent[];
    onDismissEvent: (id: string) => void;
    class?: string;
  } = $props();

  // Grouped as on the phone's picker, each with what's left to discover there.
  let groups = $derived(
    skillGroups(game).map((g) => ({
      label: g.label,
      unlocked: g.skills.filter((c) => c.unlocked).map((c) => c.id),
      locked: g.skills.filter((c) => !c.unlocked).length,
      hint: nextDiscovery(game, g.label),
    })),
  );
</script>

{#snippet row(id: SkillId)}
  {@const level = levels[id]}
  <SkillRow
    {id}
    {level}
    pct={xpProgressPct(game.skills[id].xp, level)}
    isActive={game.activeSkill === id}
    isSelected={selectedSkill === id}
    {onSelect}
    {events}
    {onDismissEvent}
  />
{/snippet}

<nav
  aria-label="Skills"
  class={cn(
    "flex w-36 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-2 lg:w-44",
    className,
  )}
>
  <h2 class="sr-only">Skills</h2>
  {#each groups as group (group.label)}
    <h3 class="mt-1 mb-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase first-of-type:mt-0">
      {group.label}
    </h3>
    {#each group.unlocked as id (id)}
      {@render row(id)}
    {/each}
    {#if group.locked > 0}
      <p class="mb-2 px-2 text-[11px] leading-snug text-muted-foreground">
        <span aria-hidden="true">🔒</span>
        {group.locked} more to discover{#if group.hint}<br />Next: <span class="font-semibold text-foreground">{group.hint}</span>{/if}
      </p>
    {/if}
  {/each}
</nav>
