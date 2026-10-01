<script lang="ts">
  import { SKILLS, type SkillId } from "$lib/gameData";
  import type { GameState } from "$lib/gameEngine";
  import { groupOf, nextDiscovery, skillGroups, type SkillGroupLabel } from "$lib/view/skillGroups";
  import { xpProgressPct } from "$lib/view/xpProgress";
  import { cn } from "$lib/utils";

  /**
   * The phone's skill picker on the Train tab: a Gathering and a Production button,
   * one of which opens a grid of that group's unlocked skills and a line on what to
   * do to discover the rest.
   */
  let {
    state: game,
    levels,
    selectedSkill,
    revealNonce = 0,
    onSelect,
    class: className,
  }: {
    state: GameState;
    levels: Record<SkillId, number>;
    selectedSkill: SkillId | null;
    /** Bump to reopen the selected skill's group even when the selection is unchanged. */
    revealNonce?: number;
    onSelect: (id: SkillId) => void;
    class?: string;
  } = $props();

  const uid = $props.id();

  let groups = $derived(skillGroups(game));

  // Follows the selected skill's group, so a selection made elsewhere (the header,
  // an unlock) opens its group; the buttons override it until the selection changes
  // or the page asks to reveal it again.
  let openGroup = $derived.by<SkillGroupLabel | null>(() => {
    void revealNonce;
    return selectedSkill ? groupOf(selectedSkill) : null;
  });

  let open = $derived(groups.find((g) => g.label === openGroup) ?? null);
  let unlocked = $derived(open ? open.skills.filter((c) => c.unlocked) : []);
  let lockedCount = $derived(open ? open.skills.length - unlocked.length : 0);
  let hint = $derived(open ? nextDiscovery(game, open.label) : null);
</script>

<section aria-label="Skills" class={cn("flex flex-col gap-2.5 px-4 py-3", className)}>
  <h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Skills</h2>

  <div class="grid grid-cols-2 gap-2">
    {#each groups as group (group.label)}
      {@const isOpen = openGroup === group.label}
      {@const running =
        game.activeSkill && groupOf(game.activeSkill) === group.label ? game.activeSkill : null}
      <button
        class={cn(
          "flex h-[52px] items-center gap-2 rounded-xl border pr-3 pl-3.5 text-left transition-colors",
          isOpen ? "border-primary/50 bg-accent" : "border-border bg-card",
        )}
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${uid}-grid` : undefined}
        onclick={() => (openGroup = isOpen ? null : group.label)}
      >
        <span class="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
          <span class="text-[15px] font-bold">{group.label}</span>
          {#if running}
            <span class="truncate text-xs font-medium text-emerald-400">● {SKILLS[running].name}</span>
          {/if}
        </span>
        <span
          class={cn(
            "w-4 text-center text-xs text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          aria-hidden="true">▾</span
        >
      </button>
    {/each}
  </div>

  {#if open}
    <ul id="{uid}-grid" aria-label="{open.label} skills" class="grid grid-cols-3 gap-2">
      {#each unlocked as chip (chip.id)}
        {@const selected = selectedSkill === chip.id}
        {@const level = levels[chip.id]}
        {@const pct = xpProgressPct(game.skills[chip.id].xp, level)}
        <li>
          <button
            class={cn(
              "flex h-[46px] w-full flex-col justify-center gap-1.5 rounded-[10px] border px-2.5 text-left transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground",
            )}
            aria-pressed={selected}
            onclick={() => onSelect(chip.id)}
          >
            <span class="flex w-full min-w-0 items-center gap-1.5 text-sm leading-none font-semibold">
              <span class="truncate">{SKILLS[chip.id].name}</span>
              {#if game.activeSkill === chip.id}
                <span class="size-[7px] shrink-0 rounded-full bg-green-500" aria-hidden="true"></span>
                <span class="sr-only">(training)</span>
              {/if}
            </span>
            <span class="flex w-full items-center gap-1.5">
              <span
                class={cn(
                  "block h-1 flex-1 overflow-hidden rounded-full",
                  selected ? "bg-primary-foreground/20" : "bg-accent",
                )}
              >
                <span
                  class={cn("block h-full", selected ? "bg-primary-foreground" : "bg-primary")}
                  style:width="{pct}%"
                ></span>
              </span>
              <span class="shrink-0 text-xs leading-none font-semibold tabular-nums opacity-75">{level}</span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
    {#if lockedCount > 0}
      <p class="px-1 text-xs text-muted-foreground">
        <span aria-hidden="true">🔒</span>
        {lockedCount} more to discover{#if hint}&nbsp;· Next: <span class="font-semibold text-foreground">{hint}</span>{/if}
      </p>
    {/if}
  {/if}
</section>
