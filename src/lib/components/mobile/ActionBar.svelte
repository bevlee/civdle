<script lang="ts">
  import { SKILLS, type SkillId } from "$lib/gameData";
  import { computeActionResult, type GameState } from "$lib/gameEngine";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import type { ActionGainEventData } from "$lib/gameState.svelte";
  import { actionBarState } from "$lib/view/actionBar";
  import { gainLine } from "$lib/view/gainLine";
  import { cn } from "$lib/utils";

  /**
   * The phone Train tab's sticky bar: the viewed recipe with a Train / Switch / Stop
   * button (Switch says what it stops), and the latest gains while it runs.
   */
  let {
    skillId,
    recipeId,
    state: game,
    level,
    ageIndex,
    events,
    onTrain,
    onStop,
    class: className,
  }: {
    skillId: SkillId;
    recipeId: string;
    state: GameState;
    level: number;
    ageIndex: number;
    events: QueuedEvent[];
    onTrain: () => void;
    onStop: () => void;
    class?: string;
  } = $props();

  let recipe = $derived(
    SKILLS[skillId].recipes.find((r) => r.id === recipeId) ?? SKILLS[skillId].recipes[0],
  );
  let activeSkill = $derived(game.activeSkill);
  let activeRecipeId = $derived(activeSkill ? game.skills[activeSkill].selectedRecipeId : null);

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
    }),
  );

  // Gain events are short-lived (the desktop toasts dismiss them), so remember the
  // newest one rather than reading it from the queue each time. The seen id is plain,
  // so the effect only reruns when the events change.
  let lastGain = $state<{ skillId: SkillId; recipeId: string; text: string } | null>(null);
  let lastGainId: string | null = null;
  $effect(() => {
    const latest = events.findLast(
      (e): e is QueuedEvent<ActionGainEventData> => e.type === "actionGain",
    );
    if (!latest || latest.id === lastGainId) return;
    lastGainId = latest.id;
    const { skillId, recipeId, gains, spent } = latest.data;
    lastGain = { skillId, recipeId, text: gainLine(gains, spent) };
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

  <div class="flex items-center gap-3">
    <div class="flex min-w-0 flex-1 flex-col leading-tight">
      <!-- A recipe above the skill's level stays a mystery, as in the recipe chips. -->
      <span class="truncate text-[15px] font-semibold">{bar.kind === "locked" ? "???" : recipe.name}</span>
      {#if sub.text}
        <span class={cn("truncate text-xs tabular-nums", sub.tone)}>{sub.text}</span>
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
