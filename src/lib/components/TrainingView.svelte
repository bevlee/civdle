<script lang="ts">
  import { nice } from "$lib/utils";
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
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import { actionBarState } from "$lib/view/actionBar";
  import { latestLevelUp, type LevelUpFlash } from "$lib/view/levelUp";
  import { resourceSource } from "$lib/view/resourceSource";
  import { usesJump } from "$lib/view/usesJump";
  import { xpProgressPct } from "$lib/view/xpProgress";
  import { cn } from "$lib/utils";

  /**
   * The Train tab's skill detail. Recipe chips only change which recipe is viewed;
   * training changes through Train/Switch/Stop here (desktop) or the phone's action bar.
   */
  let {
    skillId,
    viewedRecipeId,
    state: game,
    levels,
    level,
    ageIndex,
    progress,
    events,
    onStart,
    onStop,
    onViewRecipe,
    onJump,
  }: {
    skillId: SkillId;
    viewedRecipeId: string;
    state: GameState;
    levels: Record<SkillId, number>;
    level: number;
    ageIndex: number;
    progress: number;
    events: QueuedEvent[];
    onStart: () => void;
    onStop: () => void;
    onViewRecipe: (recipeId: string) => void;
    /** Opens the skill that makes an input, on its recipe when one is given. */
    onJump: (skillId: SkillId, recipeId: string | null) => void;
  } = $props();

  const formatTime = (t: number) => `${t.toFixed(2)}s`;
  const formatXp = (xp: number) => `+${xp.toLocaleString()} XP`;

  let def = $derived(SKILLS[skillId]);
  let skillState = $derived(game.skills[skillId]);
  let isTraining = $derived(game.activeSkill === skillId);
  let isCrafting = $derived(
    def.category === "crafting" || def.recipes.length > 1,
  );
  let viewedRecipe = $derived(
    def.recipes.find((r) => r.id === viewedRecipeId) ?? def.recipes[0],
  );

  let xpBase = $derived(xpForLevel(level));
  let xpSpan = $derived(Math.max(1, xpForLevel(Math.min(level + 1, 99)) - xpBase));
  let xpPct = $derived(xpProgressPct(skillState.xp, level));

  let result = $derived(
    computeActionResult(
      skillId,
      level,
      skillState.upgrades,
      ageIndex,
      viewedRecipeId,
      game.globalUpgrades,
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
      const have = game.resources[input.resource] ?? 0;
      const jump = usesJump(resourceSource(input.resource), {
        viewedSkill: skillId,
        levels,
        unlocked: (id) => game.skills[id].unlocked,
      });
      return { ...input, have, short: have < input.amount, jump };
    }),
  );

  // Desktop Train / Switch / Stop, decided the same way as the phone's action bar.
  let activeSkill = $derived(game.activeSkill);
  let activeRecipeId = $derived(activeSkill ? game.skills[activeSkill].selectedRecipeId : null);
  let bar = $derived(
    actionBarState({
      viewedSkill: skillId,
      viewedRecipeId: viewedRecipe.id,
      viewedLevel: level,
      activeSkill,
      activeRecipeId,
      resources: game.resources,
    }),
  );

  // Phones have no skill list to flash, so the header shows a level-up briefly.
  // Events are dismissed elsewhere; the seen id is plain so this only reruns on new events.
  let levelFlash = $state<LevelUpFlash | null>(null);
  let lastLevelUpId: string | null = null;
  $effect(() => {
    const latest = latestLevelUp(events);
    if (!latest || latest.id === lastLevelUpId) return;
    lastLevelUpId = latest.id;
    levelFlash = latest;
  });
  $effect(() => {
    if (!levelFlash) return;
    const timeout = setTimeout(() => (levelFlash = null), 1500);
    return () => clearTimeout(timeout);
  });
  let flash = $derived(levelFlash?.skillId === skillId ? levelFlash : null);

  // An expected (average) amount splits into the guaranteed whole number and the
  // chance of one more, per action: 1.25 is "+1" with "+25%", 0.3 is just "30%".
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
    Math.floor(game.resources[resource] ?? 0).toLocaleString();

  function formatPct(chance: number): string {
    return `${Math.round(chance * 100)}%`;
  }


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
      <span class="relative shrink-0 text-xl font-bold tabular-nums">
        {#if flash}
          {#key flash.id}
            <span
              class="animate-flash-gold pointer-events-none absolute -inset-x-1.5 inset-y-0 rounded-md bg-amber-400/35 md:hidden"
              aria-hidden="true"
            ></span>
          {/key}
        {/if}
        <span class={cn("relative transition-colors duration-300", flash && "max-md:text-amber-300")}>Lv {nice(level)}</span><span
          class="relative text-[13px] font-medium text-muted-foreground"> / 99</span
        >
      </span>
    </div>
    <div class="flex items-center gap-2.5">
      <Progress value={xpPct} class="h-1.5 flex-1" />
      {#if flash}
        <span class="shrink-0 text-xs font-semibold text-amber-300 tabular-nums md:hidden">
          Level up! Lv {flash.newLevel}
        </span>
      {/if}
      <span class={cn("shrink-0 text-xs text-muted-foreground tabular-nums", flash && "max-md:hidden")}>
        {Math.floor(skillState.xp - xpBase).toLocaleString()} / {xpSpan.toLocaleString()} XP
      </span>
    </div>
    <span class="sr-only md:hidden" aria-live="polite">{flash ? `Level up! ${def.name} is level ${flash.newLevel}` : ""}</span>
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
                "flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-px rounded-xl border px-1.5 py-1.5 text-sm font-semibold transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground",
                locked ? "cursor-not-allowed opacity-40" : !selected && "hover:bg-accent",
              )}
            >
              <!-- Long names wrap to a second line rather than being cut off. -->
              <span class="line-clamp-2 max-w-full text-center leading-tight">{locked ? "???" : recipe.name}</span>
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
              {#if input.jump}
                {@const jump = input.jump}
                {@const chip = cn(
                  "flex h-8 items-center rounded-lg border px-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                  input.short
                    ? "border-transparent bg-destructive/20 text-destructive"
                    : "border-border text-muted-foreground group-hover:text-foreground",
                )}
                {#if jump.recipeId === null && jump.skillId === skillId}
                  <!-- Made by a recipe of this skill that isn't reached yet: nothing to jump to. -->
                  <span class={chip}>???</span>
                {:else}
                  <!-- The 44px button is the hit area; the chip inside keeps its compact look. -->
                  <button
                    class="group flex min-h-11 items-center"
                    aria-label="Go to {jump.label}"
                    onclick={() => onJump(jump.skillId, jump.recipeId)}
                  >
                    <span class={chip}>{jump.label} ›</span>
                  </button>
                {/if}
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
              {out.base > 0 ? `+${out.base}` : ""}
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

    <!-- Desktop train/switch/stop, as on the phone's action bar (stopping from anywhere
         else is in the header). -->
    <div class="hidden flex-col gap-3 md:flex">
      <Progress value={bar.kind === "stop" ? progress * 100 : 0} class="h-3 max-w-sm" />
      <div class="flex items-center gap-3">
        {#if bar.kind === "stop"}
          <Button variant="destructive" onclick={onStop}>Stop</Button>
        {:else}
          <Button onclick={onStart} disabled={bar.kind === "locked" || bar.kind === "short"}>
            {bar.label}
          </Button>
          {#if bar.kind !== "locked" && bar.sub}
            <span class="text-sm {bar.kind === 'short' ? 'text-destructive' : 'text-muted-foreground'}">{bar.sub}</span>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>
