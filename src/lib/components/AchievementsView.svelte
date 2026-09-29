<script lang="ts">
  import Hint from "./Hint.svelte";
  import { SKILLS, type SkillId } from "$lib/gameData";
  import type { GameState } from "$lib/gameEngine";
  import { cn } from "$lib/utils";
  import { achievementList, type AchievementFilter, type AchievementItem } from "$lib/view/achievementList";
  import { formatUnlockDate } from "$lib/view/townView";

  let {
    state: gameState,
    levels,
  }: {
    state: GameState;
    levels: Record<SkillId, number>;
  } = $props();

  let filter = $state<AchievementFilter>("all");
  let view = $derived(achievementList(gameState, levels, filter));

  let milestoneCount = $derived.by(() => {
    const pills = view.milestones.flatMap((m) => m.levels);
    return { done: pills.filter((p) => p.done).length, total: pills.length };
  });

  const fmt = (n: number) => n.toLocaleString();
  const pct = (done: number, total: number) => (total > 0 ? Math.min(100, (done / total) * 100) : 0);
</script>

{#snippet sectionHeader(label: string, done: number, total: number)}
  <div class="flex items-baseline justify-between gap-3">
    <h3 class="min-w-0 flex-1 text-xs font-semibold tracking-[.06em] text-muted-foreground uppercase">{label}</h3>
    <span class="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">{done}/{total}</span>
  </div>
{/snippet}

{#snippet card(a: AchievementItem)}
  <li
    class={cn(
      "flex gap-3 rounded-[14px] border p-3",
      a.done ? "border-amber-400/35 bg-amber-400/[.07]" : "border-border bg-card",
    )}
    data-achievement={a.id}
    data-unlocked={a.done}
  >
    <span
      class={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-[10px] text-xl",
        a.done ? "bg-amber-400/15" : "bg-accent opacity-50 grayscale",
      )}
      aria-hidden="true">{a.icon}</span
    >
    <span class="flex min-w-0 flex-1 flex-col gap-[3px]">
      <span class="flex items-baseline justify-between gap-2">
        <span class={cn("text-[15px] font-semibold", !a.done && "text-foreground/85")}>{a.name}</span>
        {#if a.done && a.unlockedAt !== undefined}
          <span class="shrink-0 text-[11px] text-amber-300">
            <span class="sr-only">Unlocked </span>{formatUnlockDate(a.unlockedAt)}
          </span>
        {/if}
      </span>
      <span class="text-[13px] leading-snug text-pretty text-muted-foreground">{a.description}</span>
      {#if a.progress}
        {@const current = Math.min(a.progress.current, a.progress.target)}
        <span class="mt-1 flex items-center gap-2">
          <span
            class="h-1 flex-1 overflow-hidden rounded-full bg-accent"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={a.progress.target}
            aria-valuenow={current}
            aria-label={`${a.name} progress`}
          >
            <span class="block h-full rounded-full bg-primary" style:width={`${pct(current, a.progress.target)}%`}></span>
          </span>
          <span class="shrink-0 text-xs text-muted-foreground tabular-nums">
            {fmt(current)} / {fmt(a.progress.target)}
          </span>
        </span>
      {/if}
    </span>
  </li>
{/snippet}

<!-- Grids follow this column's width (a container), not the window's: the side panels take a share on desktop. -->
<div class="@container mx-auto flex w-full max-w-5xl flex-col gap-[18px] px-4 pt-[18px] pb-6">
  <header class="flex flex-col gap-2.5">
    <div class="flex items-baseline justify-between">
      <h2 class="text-2xl font-bold tracking-[-.01em] md:text-xl">Achievements</h2>
      <span class="shrink-0 text-[15px] font-semibold whitespace-nowrap tabular-nums">
        {view.done}<span class="font-medium text-muted-foreground"> / {view.total}</span>
      </span>
    </div>
    <div
      class="h-1.5 overflow-hidden rounded-full bg-accent"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={view.total}
      aria-valuenow={view.done}
      aria-label="Achievements unlocked"
    >
      <div class="h-full bg-amber-400" style:width={`${pct(view.done, view.total)}%`}></div>
    </div>
  </header>

  <!-- Phones scroll the chips sideways; wider screens wrap them. -->
  <div
    role="group"
    aria-label="Filter achievements"
    class="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
  >
    {#each view.filters as f (f.id)}
      {@const on = filter === f.id}
      <button
        class={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold whitespace-nowrap transition-colors",
          on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-accent/50",
        )}
        aria-pressed={on}
        onclick={() => (filter = f.id)}
      >
        <span>{f.label}</span>
        <span class="text-xs tabular-nums opacity-65">{f.done}/{f.total}</span>
      </button>
    {/each}
  </div>

  {#if view.milestones.length > 0}
    <section class="flex flex-col gap-2" aria-label="Skill milestones">
      {@render sectionHeader("Skill milestones", milestoneCount.done, milestoneCount.total)}
      <!-- gap-px over a border-coloured backdrop draws the dividers in every column count. -->
      <ul class="grid gap-px overflow-hidden rounded-[14px] border border-border bg-border @xl:grid-cols-2 @4xl:grid-cols-3">
        {#each view.milestones as row (row.skillId)}
          {@const name = SKILLS[row.skillId].name}
          <li class="flex min-h-13 items-center gap-2.5 bg-card py-2 pr-3 pl-3.5">
            <span class="flex min-w-0 flex-1 flex-col gap-px leading-tight">
              <span class={cn("truncate text-[15px] font-semibold", !row.discovered && "text-muted-foreground")}>
                {row.discovered ? name : "???"}
              </span>
              <span class="text-xs text-muted-foreground tabular-nums">
                {row.discovered ? `Lv ${levels[row.skillId]}` : "Not discovered"}
              </span>
            </span>
            <span class="flex shrink-0 gap-1">
              {#each row.levels as m (m.level)}
                {@const pill = cn(
                  "flex h-[26px] w-[34px] items-center justify-center rounded-[7px] text-xs font-semibold tabular-nums",
                  m.done
                    ? "bg-primary text-primary-foreground"
                    : row.discovered
                      ? "bg-accent text-muted-foreground/60"
                      : "bg-accent/50 text-muted-foreground/35",
                )}
                {#if row.discovered}
                  <Hint text={`${m.done ? "✓ " : ""}Reach level ${m.level} in ${name}`}>
                    <span class={cn(pill, "cursor-help")}>{m.level}</span>
                  </Hint>
                {:else}
                  <span class={pill}>{m.level}</span>
                {/if}
              {/each}
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#each view.sections as sec (sec.category)}
    {#if sec.items.length > 0}
      <section class="flex flex-col gap-2" aria-label={sec.label}>
        {@render sectionHeader(sec.label, sec.items.filter((a) => a.done).length, sec.items.length)}
        <ul class="grid gap-2 @xl:grid-cols-2">
          {#each sec.items as a (a.id)}{@render card(a)}{/each}
        </ul>
      </section>
    {/if}
  {/each}
</div>
