<script lang="ts">
  import { SKILLS, type SkillId } from "$lib/gameData";
  import { xpForLevel } from "$lib/gameEngine";
  import { shortAgeName } from "$lib/view/ageChecklist";
  import { cn } from "$lib/utils";

  /**
   * The phone's top bar: the current age and progress toward the next (tap for the
   * age sheet) on the left, and what is training (tap to open it, ■ to stop) on the right.
   */
  let {
    ageName,
    nextAgeName,
    met,
    total,
    activeSkill,
    level,
    xp,
    onOpenAge,
    onOpenTrain,
    onStop,
    class: className,
  }: {
    ageName: string;
    /** Null at the final age. */
    nextAgeName: string | null;
    met: number;
    total: number;
    activeSkill: SkillId | null;
    /** Level and total XP of the active skill. */
    level: number;
    xp: number;
    onOpenAge: () => void;
    onOpenTrain: () => void;
    onStop: () => void;
    class?: string;
  } = $props();

  let agePct = $derived(total > 0 ? (met / total) * 100 : 0);
  let xpPct = $derived.by(() => {
    if (level >= 99) return 100;
    const base = xpForLevel(level);
    const span = Math.max(1, xpForLevel(level + 1) - base);
    return Math.max(0, Math.min(100, ((xp - base) / span) * 100));
  });
</script>

<header
  class={cn(
    "flex shrink-0 items-center gap-2.5 border-b border-border bg-background px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2.5",
    className,
  )}
>
  {#if nextAgeName}
    <button
      class="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-1.5 text-left"
      aria-haspopup="dialog"
      aria-label={`${ageName}. Next: ${nextAgeName}, ${met} of ${total} requirements met`}
      onclick={onOpenAge}
    >
      <span class="flex min-w-0 items-baseline gap-2">
        <span class="shrink-0 text-xl leading-tight font-bold tracking-tight whitespace-nowrap">{ageName}</span>
        <span class="flex min-w-0 text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">
          <span class="min-w-0 truncate">→ {shortAgeName(nextAgeName)}</span>
          <span class="shrink-0">&nbsp;· {met}/{total} ▾</span>
        </span>
      </span>
      <span class="block h-[3px] w-full max-w-52 overflow-hidden rounded-full bg-muted">
        <span class="block h-full rounded-full bg-amber-400 transition-[width] duration-300" style:width="{agePct}%"></span>
      </span>
    </button>
  {:else}
    <div class="flex min-h-11 min-w-0 flex-1 items-center">
      <span class="truncate text-xl leading-tight font-bold tracking-tight">{ageName}</span>
    </div>
  {/if}

  {#if activeSkill}
    <button
      class="flex min-h-11 min-w-0 shrink-0 flex-col items-end justify-center gap-1.5 leading-tight"
      aria-label={`Training ${SKILLS[activeSkill].name}, level ${level}. Open training`}
      onclick={onOpenTrain}
    >
      <span class="flex max-w-full min-w-0 items-center gap-1.5">
        <span class="size-[7px] shrink-0 rounded-full bg-green-500" aria-hidden="true"></span>
        <span class="max-w-[130px] truncate text-[15px] font-semibold">{SKILLS[activeSkill].name}</span>
      </span>
      <span class="flex items-center gap-1.5" aria-hidden="true">
        <span class="block h-[3px] w-10 overflow-hidden rounded-full bg-muted">
          <span class="block h-full rounded-full bg-emerald-400" style:width="{xpPct}%"></span>
        </span>
        <span class="text-xs whitespace-nowrap text-muted-foreground tabular-nums">Lv {level}</span>
      </span>
    </button>
    <button
      class="-mr-3 flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors active:bg-accent"
      aria-label="Stop training"
      onclick={onStop}
    >
      <span class="size-3 rounded-[2px] bg-foreground" aria-hidden="true"></span>
    </button>
  {:else}
    <button
      class="flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-muted-foreground"
      onclick={onOpenTrain}
    >
      <span class="size-[7px] rounded-full border-[1.5px] border-muted-foreground" aria-hidden="true"></span>
      Idle · Train ›
    </button>
  {/if}
</header>
