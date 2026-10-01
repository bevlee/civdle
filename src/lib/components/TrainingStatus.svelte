<script lang="ts">
  import { SKILLS, type SkillId } from "$lib/gameData";
  import { xpProgressPct } from "$lib/view/xpProgress";
  import { cn } from "$lib/utils";

  /**
   * What is training, in the header on phones and desktop alike: the skill and its level
   * progress (tap to open it) and ■ to stop, or "Idle · Train ›".
   */
  let {
    activeSkill,
    level,
    xp,
    onOpenTrain,
    onStop,
    class: className,
  }: {
    activeSkill: SkillId | null;
    /** Level and total XP of the active skill. */
    level: number;
    xp: number;
    onOpenTrain: () => void;
    onStop: () => void;
    class?: string;
  } = $props();

  let xpPct = $derived(xpProgressPct(xp, level));
</script>

<div class={cn("flex shrink-0 items-center gap-2.5", className)}>
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
      class="flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors active:bg-accent"
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
</div>
