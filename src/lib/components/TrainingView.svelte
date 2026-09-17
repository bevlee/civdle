<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Progress } from "$lib/components/ui/progress";
  import { Separator } from "$lib/components/ui/separator";
  import {
    CONSUMABLES,
    RESOURCES,
    type ResourceId,
    SKILLS,
    type SkillId,
  } from "$lib/gameData";
  import {
    type GameState,
    aggregateConsumableEffects,
    computeActionResult,
    getActiveConsumableDefs,
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
    onToggleConsumable,
  }: {
    skillId: SkillId;
    state: GameState;
    level: number;
    ageIndex: number;
    progress: number;
    onStart: () => void;
    onStop: () => void;
    onSelectRecipe: (recipeId: string) => void;
    onToggleConsumable: (resourceId: ResourceId) => void;
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

  let activeDefs = $derived(
    getActiveConsumableDefs(
      state.activeConsumables,
      state.resources,
      def.category,
    ),
  );
  let ce = $derived(aggregateConsumableEffects(activeDefs));
  let result = $derived(
    computeActionResult(
      skillId,
      level,
      skillState.upgrades,
      ageIndex,
      skillState.selectedRecipeId,
      state.globalUpgrades,
      ce,
    ),
  );

  let applicableConsumables = $derived(
    CONSUMABLES.filter((c) => !c.appliesTo || c.appliesTo === def.category),
  );

  function formatAmount(amount: number): string {
    return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
  }
</script>

<div class="flex flex-1 flex-col gap-6 p-6">
  <div>
    <h2 class="text-2xl font-bold">{def.name}</h2>
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
            .map((o) => `${formatAmount(o.amount)} ${RESOURCES[o.resource].name}`)
            .join(", ")}
        </p>
        <p class="text-muted-foreground">Time: {result.time.toFixed(2)}s</p>
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

  {#if applicableConsumables.length > 0}
    <Separator />
    <div class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold text-muted-foreground">Consumables</h3>
      <div class="flex flex-col gap-2">
        {#each applicableConsumables as c (c.resource)}
          {@const owned = Math.floor(state.resources[c.resource] ?? 0)}
          {@const isActive = state.activeConsumables.includes(c.resource)}
          {@const canActivate = owned >= 1}
          <button
            disabled={!canActivate && !isActive}
            onclick={() => onToggleConsumable(c.resource)}
            class={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
              isActive ? "border-primary bg-accent" : "border-border"
            } ${!canActivate && !isActive ? "cursor-not-allowed opacity-40" : "hover:bg-accent"}`}
          >
            <div class="flex flex-col items-start gap-0.5">
              <span class="font-medium">
                {RESOURCES[c.resource].name}
                {#if isActive}
                  <span class="ml-1 text-green-500">●</span>
                {/if}
              </span>
              <span class="text-xs text-muted-foreground">{c.description}</span>
            </div>
            <span class="text-xs tabular-nums text-muted-foreground">
              {owned.toLocaleString()}
            </span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
