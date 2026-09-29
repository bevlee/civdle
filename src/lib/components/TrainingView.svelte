<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Progress } from "$lib/components/ui/progress";
  import BuffTooltip from "./BuffTooltip.svelte";
  import {
    RESOURCES,
    SKILLS,
    type ResourceId,
    type SkillId,
  } from "$lib/gameData";
  import {
    type GameState,
    computeActionResult,
    getLockedOutputs,
    xpForLevel,
  } from "$lib/gameEngine";
  import { resourceSource } from "$lib/view/resourceSource";
  import { cn } from "$lib/utils";

  /**
   * The Train tab's skill detail. Recipe chips only change which recipe is viewed;
   * training changes through Train/Stop here (desktop) or the phone's action bar.
   */
  let {
    skillId,
    viewedRecipeId,
    state,
    level,
    ageIndex,
    progress,
    onStart,
    onStop,
    onViewRecipe,
    onJump,
  }: {
    skillId: SkillId;
    viewedRecipeId: string;
    state: GameState;
    level: number;
    ageIndex: number;
    progress: number;
    onStart: () => void;
    onStop: () => void;
    onViewRecipe: (recipeId: string) => void;
    /** Opens the skill and recipe that make an input. */
    onJump: (skillId: SkillId, recipeId: string) => void;
  } = $props();

  let def = $derived(SKILLS[skillId]);
  let skillState = $derived(state.skills[skillId]);
  let isTraining = $derived(state.activeSkill === skillId);
  // The running recipe is the skill's selected one; the viewed one may differ.
  let viewingActive = $derived(isTraining && viewedRecipeId === skillState.selectedRecipeId);
  let isCrafting = $derived(
    def.category === "crafting" || def.recipes.length > 1,
  );
  let viewedRecipe = $derived(
    def.recipes.find((r) => r.id === viewedRecipeId) ?? def.recipes[0],
  );

  let xpBase = $derived(xpForLevel(level));
  let xpNext = $derived(xpForLevel(Math.min(level + 1, 99)));
  let xpSpan = $derived(Math.max(1, xpNext - xpBase));
  let xpPct = $derived(
    level >= 99
      ? 100
      : Math.min(100, ((skillState.xp - xpBase) / xpSpan) * 100),
  );

  let result = $derived(
    computeActionResult(
      skillId,
      level,
      skillState.upgrades,
      ageIndex,
      viewedRecipeId,
      state.globalUpgrades,
    ),
  );

  // Outputs the player has never produced here stay a mystery ("???") until
  // unlocked; extra rolls of a resource they already make keep their name.
  let lockedOutputs = $derived.by(() => {
    if (!result) return [];
    const known = new Set([
      ...result.outputs.map((o) => o.resource),
      ...result.chancedOutputs.map((o) => o.resource),
    ]);
    return getLockedOutputs(result.recipe, level, ageIndex).map((o) =>
      known.has(o.resource) ? o : { ...o, label: "???" },
    );
  });

  let uses = $derived(
    (result?.inputs ?? []).map((input) => {
      const have = state.resources[input.resource] ?? 0;
      const source = resourceSource(input.resource);
      const jumpable = source !== null && state.skills[source.skillId].unlocked;
      const sourceLabel = !source
        ? ""
        : source.skillId === skillId
          ? (def.recipes.find((r) => r.id === source.recipeId)?.name ?? def.name)
          : SKILLS[source.skillId].name;
      return {
        ...input,
        have,
        short: have < input.amount,
        source: jumpable ? source : null,
        sourceLabel,
      };
    }),
  );

  // An expected (average) amount splits into the guaranteed whole number and the
  // chance of one more: 1.25 is "×1" with "+25%", 0.3 is just "30%".
  let makes = $derived.by(() => {
    if (!result) return [];
    const rows = result.outputs.map((o) => {
      const base = Math.floor(o.amount + 1e-9);
      const chance = Math.round((o.amount - base) * 100);
      return {
        resource: o.resource,
        base,
        chance: chance > 0 ? (base > 0 ? `+${chance}%` : `${chance}%`) : "",
      };
    });
    for (const c of result.chancedOutputs) {
      rows.push({
        resource: c.resource,
        base: Math.max(1, Math.round(c.amount)),
        chance: formatPct(c.chance),
      });
    }
    return rows;
  });

  let doubleNote = $derived.by(() => {
    if (!result || result.doubleChance <= 0) return "";
    const which = result.doubleResources
      ? result.doubleResources.map((r) => RESOURCES[r].name).join(", ")
      : "outputs";
    return `${formatPct(result.doubleChance)} chance to double ${which}`;
  });

  const have = (resource: ResourceId) =>
    Math.floor(state.resources[resource] ?? 0).toLocaleString();

  function formatPct(chance: number): string {
    return `${Math.round(chance * 100)}%`;
  }

  const formatTime = (t: number) => `${t.toFixed(2)}s`;
  const formatXp = (xp: number) => `+${xp} XP`;

  const sectionLabel = "text-xs font-semibold tracking-wide text-muted-foreground uppercase";
</script>

<div class="flex flex-1 flex-col md:gap-5 md:p-6">
  <!-- Sticks to the top of the Train tab's scroller on phones. -->
  <header
    class="sticky top-0 z-10 flex flex-col gap-2 border-b border-border bg-background px-4 py-3 shadow-[0_6px_12px_-6px_rgb(0_0_0/0.6)] md:static md:max-w-xl md:border-0 md:p-0 md:shadow-none"
  >
    <div class="flex items-center justify-between gap-3">
      <span class="flex min-w-0 items-center gap-2">
        <h2 class="truncate text-2xl font-bold tracking-tight">{def.name}</h2>
        {#if isTraining}
          <span class="shrink-0 rounded-md bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
            Training
          </span>
        {/if}
      </span>
      <span class="shrink-0 text-xl font-bold tabular-nums">
        Lv {level}<span class="text-[13px] font-medium text-muted-foreground"> / 99</span>
      </span>
    </div>
    <div class="flex items-center gap-2.5">
      <Progress value={xpPct} class="h-1.5 flex-1" />
      <span class="shrink-0 text-xs text-muted-foreground tabular-nums">
        {Math.floor(skillState.xp - xpBase)} / {xpSpan} XP
      </span>
    </div>
  </header>

  <div class="flex flex-col gap-5 px-4 pt-3.5 pb-6 md:max-w-xl md:p-0">
    <p class="text-sm leading-relaxed text-pretty text-muted-foreground">{def.description}</p>

    {#if isCrafting}
      <div class="flex flex-col gap-2">
        <h3 class={sectionLabel}>Recipe</h3>
        <div class="grid grid-cols-3 gap-2">
          {#each def.recipes as recipe (recipe.id)}
            {@const locked = recipe.requiredLevel > level}
            {@const selected = viewedRecipe.id === recipe.id}
            {@const running = isTraining && skillState.selectedRecipeId === recipe.id}
            <button
              disabled={locked}
              aria-pressed={selected}
              onclick={() => onViewRecipe(recipe.id)}
              class={cn(
                "flex h-[52px] min-w-0 flex-col items-center justify-center gap-px rounded-xl border px-1.5 text-sm font-semibold transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground",
                locked ? "cursor-not-allowed opacity-40" : !selected && "hover:bg-accent",
              )}
            >
              <span class="max-w-full truncate">{locked ? "???" : recipe.name}</span>
              {#if locked}
                <span class="text-[11px] font-medium">Lv {recipe.requiredLevel}</span>
              {:else if running}
                <span class={cn("text-[11px] font-semibold", selected ? "text-emerald-700" : "text-emerald-400")}>
                  ● Training
                </span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if result}
      <div class="flex flex-col overflow-hidden rounded-[14px] border border-border bg-card">
        {#if uses.length > 0}
          <h3 class="px-3.5 pt-3 pb-0.5 {sectionLabel}">Uses</h3>
          {#each uses as input (input.resource)}
            <div class="flex min-h-11 items-center gap-2.5 pr-2 pl-3.5 text-[15px]">
              <span class="min-w-0 flex-1 truncate">{RESOURCES[input.resource].name}</span>
              <span class="text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">
                −{input.amount} · have
                <b class={cn("font-semibold", input.short ? "text-destructive" : "text-foreground")}>
                  {have(input.resource)}
                </b>
              </span>
              {#if input.source}
                {@const source = input.source}
                <button
                  class={cn(
                    "h-8 rounded-lg border px-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                    input.short
                      ? "border-transparent bg-destructive/20 text-destructive"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Go to {input.sourceLabel}"
                  onclick={() => onJump(source.skillId, source.recipeId)}
                >
                  {input.sourceLabel} ›
                </button>
              {/if}
            </div>
          {/each}
          <div class="mx-3.5 mt-1.5 h-px bg-border"></div>
        {/if}

        <div class="flex justify-between px-3.5 pt-3 pb-1 {sectionLabel}">
          <h3>Makes</h3>
          <span>Have</span>
        </div>
        {#each makes as out, i (i)}
          <div class="flex items-center gap-2.5 px-3.5 py-2 text-[15px]">
            <span class="flex min-w-0 flex-1 items-center gap-2">
              <span class="truncate">{RESOURCES[out.resource].name}</span>
              {#if out.chance}
                <span class="rounded-[5px] bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                  {out.chance}
                </span>
              {/if}
            </span>
            <span class="min-w-7 text-right text-sm text-emerald-400 tabular-nums">
              {out.base > 0 ? `×${out.base}` : ""}
            </span>
            <span class="min-w-14 text-right font-semibold tabular-nums">{have(out.resource)}</span>
          </div>
        {/each}

        {#if lockedOutputs.length > 0 || result.refundChance > 0 || doubleNote}
          <div class="flex flex-col gap-1 px-3.5 pt-1 text-xs text-muted-foreground">
            {#if doubleNote}<p>{doubleNote}</p>{/if}
            {#if result.refundChance > 0}
              <p>{formatPct(result.refundChance)} chance to keep materials</p>
            {/if}
            {#if lockedOutputs.length > 0}
              <p>
                Later:
                {#each lockedOutputs as o, i (i)}
                  {i > 0 ? ", " : ""}<span class="opacity-70">{o.label}</span>
                  <span class="rounded bg-muted px-1 py-0.5 text-[10px]">{o.requirement}</span>
                {/each}
              </p>
            {/if}
          </div>
        {/if}
        <div class="h-2"></div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-0.5 rounded-[14px] border border-border px-3.5 py-3">
          <span class="text-xs text-muted-foreground">Time per action</span>
          <span class="text-lg font-semibold tabular-nums">
            <BuffTooltip
              label="time"
              base={result.baseTime}
              final={result.time}
              modifiers={result.timeModifiers}
              format={formatTime}
            >
              {formatTime(result.time)}
            </BuffTooltip>
          </span>
        </div>
        <div class="flex flex-col gap-0.5 rounded-[14px] border border-border px-3.5 py-3">
          <span class="text-xs text-muted-foreground">XP per action</span>
          <span class="text-lg font-semibold tabular-nums">
            <BuffTooltip
              label="XP"
              base={result.baseXp}
              final={result.xp}
              modifiers={result.xpModifiers}
              format={formatXp}
            >
              {formatXp(result.xp)}
            </BuffTooltip>
          </span>
        </div>
      </div>
    {:else}
      <p class="rounded-[14px] border border-border bg-card px-3.5 py-3 text-sm text-muted-foreground">
        Unlocks at Lv {viewedRecipe.requiredLevel}.
      </p>
    {/if}

    <!-- Phones train from the sticky action bar instead. -->
    <div class="hidden flex-col gap-3 md:flex">
      <Progress value={viewingActive ? progress * 100 : 0} class="h-3 max-w-sm" />
      <div class="flex gap-2">
        {#if viewingActive}
          <Button variant="destructive" onclick={onStop}>Stop</Button>
        {:else}
          <Button onclick={onStart} disabled={!result}>Train</Button>
        {/if}
      </div>
    </div>
  </div>
</div>
