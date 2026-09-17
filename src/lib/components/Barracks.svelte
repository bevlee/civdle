<script lang="ts">
  import { BARRACKS_RECIPES, UNITS } from "$lib/combatData";
  import { RESOURCES, type ResourceId } from "$lib/gameData";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";

  const UNIT_COLOR: Record<string, string> = {
    swordsman: "bg-amber-500",
    spearman: "bg-blue-500",
    archer: "bg-green-600",
  };

  let {
    resources,
    onCraft,
  }: {
    resources: Partial<Record<ResourceId, number>>;
    onCraft: (unitId: string) => void;
  } = $props();
</script>

<div class="flex flex-col gap-2">
  <h3 class="text-sm font-semibold text-muted-foreground">Barracks</h3>
  <div class="flex flex-col gap-2">
    {#each BARRACKS_RECIPES as recipe (recipe.unitId)}
      {@const owned = Math.floor(
        resources[UNITS[recipe.unitId].resource] ?? 0,
      )}
      {@const canAfford = recipe.inputs.every(
        (inp) => (resources[inp.resource] ?? 0) >= inp.amount,
      )}
      <div
        class="flex items-center gap-3 rounded-md border border-border p-2"
      >
        <span
          class={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
            UNIT_COLOR[recipe.unitId],
          )}
        >
          {recipe.name[0]}
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">{recipe.name}</span>
            <span class="text-xs tabular-nums text-muted-foreground">
              Owned: {owned}
            </span>
          </div>
          <div class="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {#each recipe.inputs as inp (inp.resource)}
              {@const have = Math.floor(resources[inp.resource] ?? 0)}
              {@const enough = have >= inp.amount}
              <span class={enough ? "" : "text-red-400"}>
                {inp.amount} {RESOURCES[inp.resource].name}
                <span class="ml-0.5 tabular-nums">({have})</span>
              </span>
            {/each}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!canAfford}
          onclick={() => onCraft(recipe.unitId)}
        >
          Train
        </Button>
      </div>
    {/each}
  </div>
</div>
