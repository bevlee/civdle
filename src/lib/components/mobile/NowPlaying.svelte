<script lang="ts">
  import { SKILLS, type SkillId } from "$lib/gameData";
  import { formatElapsed } from "$lib/view/elapsed";
  import { cn } from "$lib/utils";

  /**
   * What is training, pinned above the phone's bottom nav on the tabs that aren't Train:
   * the skill, how long it has been running, and the current action's progress.
   * Tap to jump back to it; ■ stops it.
   */
  let {
    skillId,
    level,
    startedAt,
    progress,
    onOpen,
    onStop,
    class: className,
  }: {
    skillId: SkillId;
    level: number;
    /** When this skill and recipe started training (ms); null hides the timer. */
    startedAt: number | null;
    /** The current action's progress, 0–1. */
    progress: number;
    onOpen: () => void;
    onStop: () => void;
    class?: string;
  } = $props();

  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });

  let name = $derived(SKILLS[skillId].name);
  let elapsed = $derived(startedAt === null ? null : formatElapsed(now - startedAt));
</script>

<div
  class={cn(
    "mx-2.5 mb-2 shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/40",
    className,
  )}
>
  <div class="h-[3px] bg-muted" aria-hidden="true">
    <div class="h-full bg-emerald-400" style:width="{Math.round(progress * 100)}%"></div>
  </div>
  <div class="flex items-center gap-3 py-1.5 pr-2 pl-3.5">
    <button
      class="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-left"
      aria-label={`Training ${name}, level ${level}. Open training`}
      onclick={onOpen}
    >
      <span class="size-2 shrink-0 rounded-full bg-green-500" aria-hidden="true"></span>
      <span class="flex min-w-0 items-baseline gap-1.5" aria-hidden="true">
        <span class="truncate text-[15px] font-semibold">{name}</span>
        <span class="shrink-0 text-xs text-muted-foreground tabular-nums">Lv {level}</span>
      </span>
      {#if elapsed}
        <span class="ml-auto shrink-0 text-sm whitespace-nowrap text-muted-foreground tabular-nums" aria-hidden="true">
          {elapsed}
        </span>
      {/if}
    </button>
    <button
      class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors active:bg-accent"
      aria-label="Stop training"
      onclick={onStop}
    >
      <span class="size-3 rounded-[2px] bg-foreground" aria-hidden="true"></span>
    </button>
  </div>
</div>
