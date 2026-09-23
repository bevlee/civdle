<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { AGES, RESOURCES, SKILLS, type Recipe, type SkillId } from "$lib/gameData";
  import { cn } from "$lib/utils";

  let {
    skillId,
    ageIndex,
    onDismiss,
  }: {
    skillId: SkillId;
    ageIndex: number;
    onDismiss: () => void;
  } = $props();

  let visible = $state(false);
  let dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    const frame = requestAnimationFrame(() => (visible = true));
    return () => cancelAnimationFrame(frame);
  });

  onDestroy(() => {
    if (dismissTimeout !== null) clearTimeout(dismissTimeout);
  });

  const def = $derived(SKILLS[skillId]);
  const recipes = $derived(def.recipes);
  const prereqs = $derived(def.prereqs);

  // Each output once, tagged with the age it arrives in when that's still ahead.
  function describeOutputs(recipe: Recipe): string {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const o of recipe.outputs) {
      if (seen.has(o.resource)) continue;
      seen.add(o.resource);
      const age = o.ageRequired ? AGES.find((a) => a.id === o.ageRequired) : undefined;
      const later = age && AGES.indexOf(age) > ageIndex;
      labels.push(later ? `${RESOURCES[o.resource].name} (${age.name})` : RESOURCES[o.resource].name);
    }
    return labels.join(", ");
  }

  function handleDismiss() {
    if (dismissTimeout !== null) return;
    visible = false;
    dismissTimeout = setTimeout(onDismiss, 200);
  }
</script>

<div
  class="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-6 sm:items-start sm:justify-end sm:p-8"
>
  <div
    class={cn(
      "pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border border-border bg-background shadow-2xl transition-all duration-300",
      visible
        ? "translate-y-0 scale-100 opacity-100"
        : "translate-y-4 scale-95 opacity-0",
    )}
  >
    <div class="bg-primary/10 px-5 py-4">
      <p class="text-xs font-semibold uppercase tracking-widest text-primary">
        Skill Discovered
      </p>
      <h3 class="mt-1 text-xl font-bold tracking-tight">{def.name}</h3>
      <Badge variant="secondary" class="mt-1.5 text-xs">
        {def.category === "gathering" ? "Gathering" : def.category === "combat" ? "Combat" : "Crafting"}
      </Badge>
    </div>
    <div class="flex flex-col gap-4 px-5 py-4">
      <p class="text-sm italic leading-relaxed text-muted-foreground">
        &ldquo;{def.description}&rdquo;
      </p>
      <div>
        <p
          class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Unlocks
        </p>
        <div class="flex flex-col gap-2">
          {#each recipes as recipe (recipe.id)}
            <div
              class="flex items-start gap-3 rounded-lg bg-muted/50 px-3 py-2"
            >
              <span class="mt-0.5 text-sm font-medium">{recipe.name}</span>
              <span class="ml-auto text-xs text-muted-foreground">
                {#if recipe.inputs.length > 0}
                  {recipe.inputs
                    .map((i) => RESOURCES[i.resource].name)
                    .join(", ")} →
                {/if}
                {describeOutputs(recipe)}
              </span>
            </div>
          {/each}
        </div>
      </div>
      {#if prereqs.length > 0}
        <div>
          <p
            class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Achieved
          </p>
          <p class="text-xs text-muted-foreground">
            {prereqs
              .map((p) => `${SKILLS[p.skill].name} Level ${p.level}`)
              .join(", ")}
          </p>
        </div>
      {/if}
      <Button variant="secondary" onclick={handleDismiss} class="w-full">
        Continue
      </Button>
    </div>
  </div>
</div>
