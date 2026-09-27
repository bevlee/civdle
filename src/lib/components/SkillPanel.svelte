<script lang="ts">
  import SkillRow from "./SkillRow.svelte";
  import { SKILL_ORDER, type SkillId } from "$lib/gameData";
  import { type GameState, xpForLevel } from "$lib/gameEngine";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import { cn } from "$lib/utils";

  let {
    state: game,
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

  let unlocked = $derived(SKILL_ORDER.filter((id) => game.skills[id].unlocked));

  // Phones: the strip only fits a few skills, so this opens all of them as a grid.
  let showAll = $state(false);

  function select(id: SkillId) {
    showAll = false;
    onSelect(id);
  }
</script>

{#snippet row(id: SkillId, compact: boolean, className?: string)}
  {@const skillState = game.skills[id]}
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
    isActive={game.activeSkill === id}
    isSelected={selectedSkill === id}
    onSelect={select}
    {events}
    {onDismissEvent}
    {compact}
    class={className}
  />
{/snippet}

{#if horizontal}
  <div aria-label="Skills" role="navigation" class={cn("shrink-0 border-b border-border", className)}>
    <div class="flex items-stretch gap-1 p-2">
      {#if showAll}
        <p class="flex flex-1 items-center px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Skills · {unlocked.length}
        </p>
      {:else}
        <div class="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {#each unlocked as id (id)}
            {@render row(id, true)}
          {/each}
        </div>
      {/if}
      <button
        class="flex w-12 shrink-0 flex-col items-center justify-center rounded-md border border-border text-[10px] text-muted-foreground hover:bg-accent {showAll ? 'bg-accent text-foreground' : ''}"
        aria-expanded={showAll}
        aria-label={showAll ? "Close skill list" : `Show all ${unlocked.length} skills`}
        onclick={() => (showAll = !showAll)}
      >
        <span class="text-base leading-none" aria-hidden="true">{showAll ? "✕" : "▦"}</span>
        {showAll ? "Close" : `All ${unlocked.length}`}
      </button>
    </div>
    {#if showAll}
      <div class="grid max-h-[55dvh] grid-cols-2 gap-1 overflow-y-auto px-2 pb-2">
        {#each unlocked as id (id)}
          {@render row(id, true, "w-auto")}
        {/each}
      </div>
    {/if}
  </div>
{:else}

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
    {@render row(id, false)}
  {/each}
</nav>
{/if}
