<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Progress } from "$lib/components/ui/progress";
  import { Separator } from "$lib/components/ui/separator";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import BuffTooltip from "./BuffTooltip.svelte";
  import {
    RESOURCES,
    SKILLS,
    type SkillId,
  } from "$lib/gameData";
  import {
    type GameState,
    computeActionResult,
    xpForLevel,
  } from "$lib/gameEngine";

  let {
    skillId,
    state,
    level,
    ageIndex,
    progress,
    onStart,
    onStop,
    onSelectRecipe,
  }: {
    skillId: SkillId;
    state: GameState;
    level: number;
    ageIndex: number;
    progress: number;
    onStart: () => void;
    onStop: () => void;
    onSelectRecipe: (recipeId: string) => void;
  } = $props();

  let def = $derived(SKILLS[skillId]);
  let skillState = $derived(state.skills[skillId]);
  let isTraining = $derived(state.activeSkill === skillId);
  let isCrafting = $derived(
    def.category === "crafting" || def.recipes.length > 1,
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
      skillState.selectedRecipeId,
      state.globalUpgrades,
    ),
  );

  // Describes an expected (average) amount as the guaranteed whole number plus
  // the chance of one more, e.g. "1 Wood (+1 at 10%)" or "Clay (30%)".
  function describeOutput(resource: keyof typeof RESOURCES, expected: number): string {
    const name = RESOURCES[resource].name;
    const base = Math.floor(expected + 1e-9);
    const chance = Math.round((expected - base) * 100);
    const notes: string[] = [];
    if (base === 0) {
      notes.push(`${chance}%`);
    } else if (chance > 0) {
      notes.push(`+1 at ${chance}%`);
    }
    if (
      result &&
      result.doubleChance > 0 &&
      (result.doubleResources === null || result.doubleResources.includes(resource))
    ) {
      notes.push(`×2 at ${Math.round(result.doubleChance * 100)}%`);
    }
    const label = base === 0 ? name : `${base} ${name}`;
    return notes.length > 0 ? `${label} (${notes.join(", ")})` : label;
  }

  function formatPct(chance: number): string {
    return `${Math.round(chance * 100)}%`;
  }

  const formatTime = (t: number) => `${t.toFixed(2)}s`;
  const formatXp = (xp: number) => `+${xp} XP`;
</script>

<div class="flex flex-1 flex-col gap-6 p-6">
  <div>
    <h2 class="text-2xl font-bold">{def.name}</h2>
    <p class="mt-1 text-sm italic leading-relaxed text-muted-foreground">&ldquo;{def.description}&rdquo;</p>
    <p class="text-sm text-muted-foreground">Level {level} / 99</p>
    <div class="mt-2 flex items-center gap-2">
      <Progress value={xpPct} class="h-2 max-w-sm" />
      <span class="text-xs text-muted-foreground">
        {Math.floor(skillState.xp - xpBase)} / {xpSpan} XP
      </span>
    </div>
  </div>

  {#if isCrafting}
    <div>
      <h3 class="mb-2 text-sm font-semibold text-muted-foreground">Recipe</h3>
      <div class="flex flex-wrap gap-2">
        {#each def.recipes as recipe (recipe.id)}
          {@const locked = recipe.requiredLevel > level}
          {@const selected = skillState.selectedRecipeId === recipe.id}
          <button
            disabled={locked}
            onclick={() => onSelectRecipe(recipe.id)}
            class={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              selected ? "border-primary bg-accent" : "border-border"
            } ${locked ? "cursor-not-allowed opacity-40" : "hover:bg-accent"}`}
          >
            {recipe.name}
            {#if locked}
              <span class="ml-1 text-xs text-muted-foreground">
                (Lv {recipe.requiredLevel})
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <Separator />

  <div class="flex flex-col gap-3">
    <h3 class="text-sm font-semibold text-muted-foreground">Action</h3>
    {#if result}
      <div class="flex flex-col gap-1 text-sm">
        {#if result.inputs.length > 0}
          <p>
            <span class="text-muted-foreground">Consumes: </span>
            {result.inputs
              .map((i) => `${i.amount} ${RESOURCES[i.resource].name}`)
              .join(", ")}
          </p>
        {/if}
        <p>
          <span class="text-muted-foreground">Produces: </span>
          {result.outputs
            .map((o) => describeOutput(o.resource, o.amount))
            .join(", ")}
          {#each result.chancedOutputs as bonus (bonus.resource)}
            <span class="text-muted-foreground">
              · {formatPct(bonus.chance)} chance of
            </span>
            {describeOutput(bonus.resource, bonus.amount)}
          {/each}
        </p>
        {#if result.refundChance > 0}
          <p class="text-xs text-muted-foreground">
            {formatPct(result.refundChance)} chance to keep materials
          </p>
        {/if}
        <Tooltip.Provider>
          <p class="flex items-center gap-3 text-muted-foreground">
            <span>
              Time:
              <BuffTooltip
                label="time"
                base={result.baseTime}
                final={result.time}
                modifiers={result.timeModifiers}
                format={formatTime}
              >
                <span class="text-foreground">{formatTime(result.time)}</span>
              </BuffTooltip>
            </span>
            <span>
              XP:
              <BuffTooltip
                label="XP"
                base={result.baseXp}
                final={result.xp}
                modifiers={result.xpModifiers}
                format={formatXp}
              >
                <span class="text-foreground">{formatXp(result.xp)}</span>
              </BuffTooltip>
            </span>
          </p>
        </Tooltip.Provider>
      </div>
    {:else}
      <p class="text-sm text-muted-foreground">
        Recipe locked at this level.
      </p>
    {/if}
    <div class="mt-2 max-w-sm">
      <Progress value={isTraining ? progress * 100 : 0} class="h-3" />
    </div>
    <div class="flex gap-2">
      {#if isTraining}
        <Button variant="destructive" onclick={onStop}>Stop</Button>
      {:else}
        <Button onclick={onStart} disabled={!result}>Train</Button>
      {/if}
    </div>
  </div>
</div>
