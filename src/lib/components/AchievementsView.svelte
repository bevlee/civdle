<script lang="ts">
  import { Progress } from "$lib/components/ui/progress";
  import {
    ACHIEVEMENTS,
    CATEGORY_LABELS,
    CATEGORY_ORDER,
    type AchievementCategory,
    type AchievementDef,
    unlockedCount,
  } from "$lib/achievements";
  import type { SkillId } from "$lib/gameData";
  import type { GameState } from "$lib/gameEngine";
  import { cn } from "$lib/utils";

  let {
    state,
    levels,
  }: {
    state: GameState;
    levels: Record<SkillId, number>;
  } = $props();

  let unlocked = $derived(unlockedCount(state));
  let total = ACHIEVEMENTS.length;

  let byCategory = $derived.by(() => {
    const map = new Map<AchievementCategory, AchievementDef[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const def of ACHIEVEMENTS) map.get(def.category)!.push(def);
    return map;
  });

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
        {unlocked} / {total}
      </span>
    </div>
    <Progress value={unlocked} max={total} class="h-2" />
  </header>

  {#each CATEGORY_ORDER as cat (cat)}
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
