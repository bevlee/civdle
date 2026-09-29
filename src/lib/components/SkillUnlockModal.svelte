<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import BottomSheet from "$lib/components/mobile/BottomSheet.svelte";
  import { AGES, RESOURCES, SKILLS, type Recipe, type SkillId } from "$lib/gameData";
  import { groupOf } from "$lib/view/skillGroups";
  import { cn } from "$lib/utils";

  /**
   * "New skill discovered": what it is, what it makes now, and a way to start it straight
   * away. A bottom sheet on phones; a card in the top-right corner on wider screens.
   */
  let {
    skillId,
    level,
    onStart,
    onLater,
  }: {
    skillId: SkillId;
    level: number;
    /** Start training the skill on this recipe (and close). */
    onStart: (recipeId: string) => void;
    /** Close without starting anything. */
    onLater: () => void;
  } = $props();

  const wide = new MediaQuery("(min-width: 48rem)");

  const def = $derived(SKILLS[skillId]);
  // Only what can be made now is named; the rest stays a mystery, matching the
  // "???" recipes in the training view.
  const available = $derived(def.recipes.filter((r) => r.requiredLevel <= level));
  const hiddenCount = $derived(def.recipes.length - available.length);
  const first = $derived(available[0] ?? null);
  const reached = $derived(
    [
      ...def.prereqs.map((p) => `${SKILLS[p.skill].name} Lv ${p.level}`),
      ...(def.ageRequired ? [AGES.find((a) => a.id === def.ageRequired)?.name ?? ""] : []),
    ].filter(Boolean),
  );

  const resourceNames = (items: { resource: keyof typeof RESOURCES }[]) =>
    items.map((i) => RESOURCES[i.resource]?.name ?? i.resource).join(", ");
  const recipeLine = (r: Recipe) =>
    r.inputs.length > 0 ? `${resourceNames(r.inputs)} → ${resourceNames(r.outputs)}` : resourceNames(r.outputs);

  // The desktop card and the phone sheet slide out before closing.
  let visible = $state(false);
  let closing = $state(false);
  let pending: (() => void) | null = null;
  let closeTimeout: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    const frame = requestAnimationFrame(() => (visible = true));
    return () => cancelAnimationFrame(frame);
  });

  // Removed mid-slide (another popup took over): still carry out the choice.
  onDestroy(() => {
    if (closeTimeout !== null) clearTimeout(closeTimeout);
    finishClose();
  });

  function finishClose() {
    const then = pending;
    pending = null;
    then?.();
  }

  function closeCard(then: () => void) {
    if (closing) return;
    closing = true;
    visible = false;
    pending = then;
    closeTimeout = setTimeout(finishClose, wide.current ? 200 : 220);
  }
</script>

{#snippet recipes()}
  {#if available.length > 0}
    <ul class="flex flex-col overflow-hidden rounded-xl bg-background">
      {#each available as recipe (recipe.id)}
        <li
          class="flex min-h-11 items-center justify-between gap-3 border-b border-border px-3.5 py-2 last:border-b-0"
        >
          <span class="text-[15px] font-semibold">{recipe.name}</span>
          <span class="truncate text-[13px] text-muted-foreground">{recipeLine(recipe)}</span>
        </li>
      {/each}
    </ul>
  {/if}
  {#if hiddenCount > 0}
    <p class="px-1 text-xs text-muted-foreground">
      +{hiddenCount} more {hiddenCount === 1 ? "recipe" : "recipes"} to discover as you level up
    </p>
  {/if}
{/snippet}

{#if wide.current}
  <div class="pointer-events-none fixed inset-0 z-50 flex items-start justify-end p-8">
    <div
      role="dialog"
      aria-labelledby="skill-unlock-title"
      class={cn(
        "pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-2xl transition-all duration-300",
        visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0",
      )}
    >
      <div class="bg-primary/10 px-5 py-4">
        <p class="text-xs font-semibold uppercase tracking-widest text-emerald-400">New skill discovered</p>
        <h3 id="skill-unlock-title" class="mt-1 text-xl font-bold tracking-tight">{def.name}</h3>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" class="text-xs">{groupOf(skillId)}</Badge>
          {#if reached.length > 0}
            <span class="text-xs text-muted-foreground">reached {reached.join(", ")}</span>
          {/if}
        </div>
      </div>
      <div class="flex flex-col gap-4 px-5 py-4">
        <p class="text-sm leading-relaxed text-muted-foreground">{def.description}</p>
        <div class="flex flex-col gap-2">
          {@render recipes()}
        </div>
        <div class="flex gap-2">
          <Button variant="outline" onclick={() => closeCard(onLater)}>Later</Button>
          {#if first}
            <Button class="flex-1" onclick={() => closeCard(() => onStart(first.id))}>
              Start {first.name}
            </Button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
  <BottomSheet open={!closing} onClose={() => closeCard(onLater)} title={`New skill discovered: ${def.name}`} hideTitle>
    <div class="flex flex-col gap-4 pt-1">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-semibold tracking-[0.08em] text-emerald-400 uppercase">New skill discovered</span>
        <span class="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span class="text-[26px] leading-tight font-bold tracking-tight">{def.name}</span>
          <span class="text-[13px] text-muted-foreground">
            {groupOf(skillId)} skill{#if reached.length > 0}&nbsp;· reached {reached.join(", ")}{/if}
          </span>
        </span>
      </div>
      <p class="text-[15px] leading-normal text-pretty text-muted-foreground">{def.description}</p>
      <div class="flex flex-col gap-2">
        {@render recipes()}
      </div>
      <div class="flex gap-2">
        <button
          class="h-[50px] shrink-0 rounded-xl border border-border px-[18px] text-[15px] font-semibold text-muted-foreground transition-colors active:bg-accent"
          onclick={() => closeCard(onLater)}
        >
          Later
        </button>
        {#if first}
          <button
            class="h-[50px] min-w-0 flex-1 truncate rounded-xl bg-primary px-3 text-base font-semibold text-primary-foreground transition-opacity active:opacity-80"
            onclick={() => closeCard(() => onStart(first.id))}
          >
            Start {first.name}
          </button>
        {/if}
      </div>
    </div>
  </BottomSheet>
{/if}
