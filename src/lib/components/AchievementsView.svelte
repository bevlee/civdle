<script lang="ts">
  import { Progress } from "$lib/components/ui/progress";
  import Hint from "./Hint.svelte";
  import {
    ACHIEVEMENTS,
    CATEGORY_LABELS,
    CATEGORY_ORDER,
    SKILL_MILESTONE_LEVELS,
    skillMilestoneId,
    type AchievementCategory,
    type AchievementDef,
  } from "$lib/achievements";
  import { SKILL_ORDER, SKILLS, type SkillId } from "$lib/gameData";
  import type { GameState } from "$lib/gameEngine";
  import { cn } from "$lib/utils";

  let {
    state,
    levels,
  }: {
    state: GameState;
    levels: Record<SkillId, number>;
  } = $props();

  let unlockedCount = $derived(Object.keys(state.achievements).length);
  let total = ACHIEVEMENTS.length;

  let byCategory = $derived.by(() => {
    const map = new Map<AchievementCategory, AchievementDef[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const def of ACHIEVEMENTS) map.get(def.category)!.push(def);
    return map;
  });

  // Skill milestones render as a compact chip grid; the other "skills"
  // entries (combos) render as ordinary cards.
  let skillCombos = $derived(
    (byCategory.get("skills") ?? []).filter((d) => !d.id.startsWith("skill.")),
  );

  function isUnlocked(id: string): boolean {
    return state.achievements[id] !== undefined;
  }

  function unlockedAt(id: string): string {
    const ts = state.achievements[id];
    return ts === undefined ? "" : new Date(ts).toLocaleDateString();
  }

  function categoryCount(cat: AchievementCategory): { done: number; total: number } {
    const defs = byCategory.get(cat) ?? [];
    return { done: defs.filter((d) => isUnlocked(d.id)).length, total: defs.length };
  }

  function formatNum(n: number): string {
    return n.toLocaleString();
  }
</script>

<div class="flex flex-col gap-6 p-4">
  <header class="flex flex-col gap-2">
    <div class="flex items-baseline justify-between">
      <h2 class="text-lg font-semibold">Achievements</h2>
      <span class="text-sm tabular-nums text-muted-foreground">
        {unlockedCount} / {total}
      </span>
    </div>
    <Progress value={unlockedCount} max={total} class="h-2" />
  </header>

  <!-- Skill milestones grid -->
  {#if true}
    {@const count = categoryCount("skills")}
    <section class="flex flex-col gap-2">
      <div class="flex items-baseline justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {CATEGORY_LABELS.skills}
        </h3>
        <span class="text-xs tabular-nums text-muted-foreground">{count.done} / {count.total}</span>
      </div>
      <div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
        {#each SKILL_ORDER as skillId (skillId)}
          {@const level = levels[skillId]}
          <div
            class="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{SKILLS[skillId].name}</p>
              <p class="text-xs tabular-nums text-muted-foreground">Lv {level}</p>
            </div>
            <div class="flex shrink-0 gap-1">
              {#each SKILL_MILESTONE_LEVELS as milestone (milestone)}
                {@const done = isUnlocked(skillMilestoneId(skillId, milestone))}
                <Hint text={`${done ? "✓ " : ""}Reach level ${milestone} in ${SKILLS[skillId].name}`}>
                  <span
                    class={cn(
                      "cursor-help rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums transition-colors",
                      done
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground/60",
                    )}
                  >
                    {milestone}
                  </span>
                </Hint>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      <div class="mt-1 grid grid-cols-1 gap-2 md:grid-cols-2">
        {#each skillCombos as def (def.id)}
          {@render achievementCard(def)}
        {/each}
      </div>
    </section>
  {/if}

  {#each CATEGORY_ORDER.filter((c) => c !== "skills") as cat (cat)}
    {@const defs = byCategory.get(cat) ?? []}
    {@const count = categoryCount(cat)}
    <section class="flex flex-col gap-2">
      <div class="flex items-baseline justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {CATEGORY_LABELS[cat]}
        </h3>
        <span class="text-xs tabular-nums text-muted-foreground">{count.done} / {count.total}</span>
      </div>
      <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
        {#each defs as def (def.id)}
          {@render achievementCard(def)}
        {/each}
      </div>
    </section>
  {/each}
</div>

{#snippet achievementCard(def: AchievementDef)}
  {@const done = isUnlocked(def.id)}
  {@const secret = def.hidden && !done}
  {@const progress = !done && !secret ? def.progress?.(state, levels) : undefined}
  <div
    class={cn(
      "flex gap-3 rounded-md border px-3 py-2 transition-colors",
      done
        ? "border-amber-400/60 bg-amber-400/10"
        : "border-border bg-card",
    )}
    data-achievement={def.id}
    data-unlocked={done}
  >
    <div
      class={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md text-2xl",
        done ? "bg-amber-400/20" : "bg-muted grayscale opacity-50",
      )}
    >
      {secret ? "❓" : def.icon}
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex items-baseline justify-between gap-2">
        <p class={cn("text-sm font-medium leading-tight", !done && "text-muted-foreground")}>
          {secret ? "???" : def.name}
        </p>
        {#if done}
          <span class="shrink-0 text-[10px] text-amber-400/80">{unlockedAt(def.id)}</span>
        {/if}
      </div>
      <p class="text-xs text-muted-foreground">
        {secret ? "Hidden achievement. Keep playing to find out." : def.description}
      </p>
      {#if progress}
        <div class="flex items-center gap-2">
          <Progress value={progress.current} max={progress.target} class="h-1 flex-1" />
          <span class="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {formatNum(progress.current)} / {formatNum(progress.target)}
          </span>
        </div>
      {/if}
    </div>
  </div>
{/snippet}
