<script lang="ts">
  import SkillRow from "./SkillRow.svelte";
  import { SKILL_ORDER, type SkillId } from "$lib/gameData";
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

  let unlocked = $derived(SKILL_ORDER.filter((id) => game.skills[id].unlocked));
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
  <h2
    class="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
  >
    Skills
  </h2>
  {#each unlocked as id (id)}
    {@render row(id)}
  {/each}
</nav>
