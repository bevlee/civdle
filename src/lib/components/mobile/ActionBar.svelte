<script lang="ts">
  import { SKILLS, type SkillId } from "$lib/gameData";
  import { computeActionResult, type GameState } from "$lib/gameEngine";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { ActionGainEventData } from "$lib/gameState.svelte";
  import { actionBarState, stillTrainingLine } from "$lib/view/actionBar";
  import { gainLine } from "$lib/view/gainLine";
  import { cn } from "$lib/utils";

  /**
   * The phone Train tab's sticky bar: the viewed recipe with a Train / Switch / Stop
   * button, the latest gains while it runs, and a way back to whatever else is running.
   */
  let {
    skillId,
    recipeId,
    state: game,
    level,
    ageIndex,
    progress,
    events,
    onTrain,
    onStop,
    onBack,
    class: className,
  }: {
    skillId: SkillId;
    recipeId: string;
    state: GameState;
    level: number;
    ageIndex: number;
    progress: number;
    events: QueuedEvent[];
    onTrain: () => void;
    onStop: () => void;
    /** Shows the skill and recipe that are training. */
    onBack: () => void;
    class?: string;
  } = $props();

  let recipe = $derived(
    SKILLS[skillId].recipes.find((r) => r.id === recipeId) ?? SKILLS[skillId].recipes[0],
  );
  let activeSkill = $derived(game.activeSkill);
  let activeRecipeId = $derived(activeSkill ? game.skills[activeSkill].selectedRecipeId : null);
  let viewingActive = $derived(activeSkill === skillId && activeRecipeId === recipe.id);

  let result = $derived(
    computeActionResult(
      skillId,
      level,
      game.skills[skillId].upgrades,
      ageIndex,
      recipe.id,
      game.globalUpgrades,
    ),
  );

  let bar = $derived(
    actionBarState({
      viewedSkill: skillId,
      viewedRecipeId: recipe.id,
      viewedLevel: level,
      activeSkill,
      activeRecipeId,
      resources: game.resources,
      secondsLeft: result ? Math.max(0, (1 - progress) * result.time) : 0,
      timeText: result ? `${result.time.toFixed(2)}s` : "",
      xpText: result ? `+${result.xp} XP` : "",
    }),
  );

  // Gain events are short-lived (the desktop toasts dismiss them), so remember the
  // newest one rather than reading it from the queue each time.
  let lastGain = $state<{ id: string; skillId: SkillId; recipeId: string; text: string } | null>(null);
  $effect(() => {
    const latest = events.findLast(
      (e): e is QueuedEvent<ActionGainEventData> => e.type === "actionGain",
    );
    if (!latest || latest.id === lastGain?.id) return;
    const { skillId, recipeId, gains, spent } = latest.data;
    lastGain = { id: latest.id, skillId, recipeId, text: gainLine(gains, spent) };
  });

  let sub = $derived.by(() => {
    if (bar.kind === "stop") {
      const gain =
        lastGain && lastGain.skillId === skillId && lastGain.recipeId === recipe.id
          ? lastGain.text
          : null;
      return { text: gain ?? (result ? `+${result.xp} XP` : ""), tone: "text-emerald-400" };
    }
    if (bar.kind === "locked") return { text: "", tone: "" };
    return {
      text: bar.sub,
      tone: bar.kind === "short" ? "text-destructive" : "text-muted-foreground",
    };
  });

  let enabled = $derived(bar.kind === "train" || bar.kind === "switch" || bar.kind === "stop");

  function act() {
    if (bar.kind === "stop") onStop();
    else if (bar.kind === "train" || bar.kind === "switch") onTrain();
  }
</script>

<section
  aria-label="Training"
  class={cn("flex shrink-0 flex-col gap-2.5 border-t border-border bg-background px-4 pt-2.5 pb-3", className)}
>
  {#if activeSkill && activeRecipeId && !viewingActive}
    <button
      class="flex h-10 items-center gap-2 rounded-[10px] border border-green-500/30 bg-green-500/8 px-3 text-left"
      onclick={onBack}
    >
      <span class="size-[7px] shrink-0 rounded-full bg-green-500" aria-hidden="true"></span>
      <span class="min-w-0 truncate text-sm font-semibold">
        Still training {stillTrainingLine(activeSkill, activeRecipeId)}
      </span>
      <span class="flex-1"></span>
      <span class="shrink-0 text-[13px] font-semibold text-muted-foreground">Back ›</span>
    </button>
  {/if}

  <div class="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
    <div class="h-full bg-primary" style:width="{viewingActive ? progress * 100 : 0}%"></div>
  </div>

  <div class="flex items-center gap-3">
    <div class="flex min-w-0 flex-1 flex-col leading-tight">
      <span class="truncate text-[15px] font-semibold">{recipe.name}</span>
      {#if sub.text}
        <span class={cn("truncate text-xs tabular-nums", sub.tone)} aria-live="polite">{sub.text}</span>
      {/if}
    </div>
    <button
      class={cn(
        "h-12 w-[55%] shrink-0 truncate rounded-xl px-3 text-base font-semibold tabular-nums transition-colors",
        bar.kind === "stop"
          ? "bg-destructive/20 text-destructive"
          : enabled
            ? "bg-primary text-primary-foreground"
            : "bg-accent text-muted-foreground",
      )}
      disabled={!enabled}
      onclick={act}
    >
      {bar.label}
    </button>
  </div>
</section>
