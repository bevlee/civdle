<script lang="ts">
  import SkillRow from "./SkillRow.svelte";
  import { SKILL_ORDER, type SkillId } from "$lib/gameData";
  import { type GameState, xpForLevel } from "$lib/gameEngine";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import { cn } from "$lib/utils";

  let {
    state,
    levels,
    selectedSkill,
    onSelect,
    events,
    onDismissEvent,
    horizontal = false,
    class: className,
  }: {
    state: GameState;
    levels: Record<SkillId, number>;
    selectedSkill: SkillId | null;
    onSelect: (id: SkillId) => void;
    events: QueuedEvent[];
    onDismissEvent: (id: string) => void;
    /** Compact scrolling strip, used above the training view on phones. */
    horizontal?: boolean;
    class?: string;
  } = $props();
</script>

<nav
  aria-label="Skills"
  class={cn(
    horizontal
      ? "flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 [scrollbar-width:none]"
      : "flex w-36 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-2 lg:w-44",
    className,
  )}
>
  {#if !horizontal}
    <h2
      class="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
    >
      Skills
    </h2>
  {/if}
  {#each SKILL_ORDER as id (id)}
    {@const skillState = state.skills[id]}
    {#if skillState.unlocked}
      {@const level = levels[id]}
      {@const xpBase = xpForLevel(level)}
      {@const xpNext = xpForLevel(Math.min(level + 1, 99))}
      {@const span = Math.max(1, xpNext - xpBase)}
      {@const pct =
        level >= 99
          ? 100
          : Math.min(100, ((skillState.xp - xpBase) / span) * 100)}
      <SkillRow
        {id}
        {level}
        {pct}
        isActive={state.activeSkill === id}
        isSelected={selectedSkill === id}
        {onSelect}
        {events}
        {onDismissEvent}
        compact={horizontal}
      />
    {/if}
  {/each}
</nav>
