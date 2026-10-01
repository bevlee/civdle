<script lang="ts">
  import { RESOURCES, type ResourceId } from "$lib/gameData";
  import { cn } from "$lib/utils";

  const RESOURCE_SECTIONS: { label: string; resources: ResourceId[] }[] = [
    {
      label: "Raw Materials",
      resources: [
        "food", "plantFibres", "clay", "wood", "logs", "stone", "rawHides",
        "rawFish", "copperOre", "ironOre", "coal", "grain", "vegetables",
        "wool", "milk",
      ],
    },
    {
      label: "Refined",
      resources: [
        "cordage", "thread", "cloth", "planks", "copperBar", "ironBar",
        "steelBar", "bricks", "preparedHides",
      ],
    },
    {
      label: "Food & Drink",
      resources: ["cookedFish", "preparedMeal", "ale", "mead"],
    },
    {
      label: "Tools & Equipment",
      resources: [
        "tools", "copperTools", "ironTools", "steelTools", "bow", "baskets",
        "potteryVessel",
      ],
    },
    {
      label: "Goods",
      resources: ["clothing", "fineClothing", "furniture", "shelter"],
    },
  ];

  let {
    resources,
    highlightedResources,
  }: {
    resources: Partial<Record<ResourceId, number>>;
    highlightedResources?: Set<ResourceId>;
  } = $props();

  let hasAny = $derived(
    Object.values(resources).some((v) => (v ?? 0) >= 1),
  );

</script>

{#if !hasAny}
  <p class="p-4 text-sm text-muted-foreground">
    No resources yet — start training a skill.
  </p>
{:else}
  <!-- Phones get the roomier rows of the Items tab; the sidebar stays compact. -->
  <div class="flex flex-col gap-[18px] p-4 md:gap-3 md:p-3">
    {#each RESOURCE_SECTIONS as section (section.label)}
      {@const entries = section.resources
        .map((id) => ({ id, amount: Math.floor(resources[id] ?? 0) }))
        .filter((r) => r.amount > 0)}
      {#if entries.length > 0}
        <section class="flex flex-col gap-2 md:gap-1.5" aria-label={section.label}>
          <h3
            class="text-xs font-semibold tracking-[.06em] text-muted-foreground uppercase md:tracking-wider md:text-muted-foreground/70"
          >
            {section.label}
          </h3>
          <ul class="grid grid-cols-2 gap-2 md:gap-1.5">
            {#each entries as { id, amount } (id)}
              {@const highlighted = highlightedResources?.has(id)}
              <li
                class={cn(
                  "flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-transparent bg-card px-3 py-1.5 text-[15px] leading-tight transition-colors",
                  "md:min-h-8 md:rounded-lg md:border-border md:px-2.5 md:text-sm",
                  highlighted && "border-amber-500/60 bg-amber-500/10 md:border-amber-500/60",
                )}
              >
                <span class={cn("min-w-0 md:text-muted-foreground", highlighted && "text-amber-300 md:text-amber-300")}>
                  {RESOURCES[id].name}
                </span>
                <span class="shrink-0 font-semibold tabular-nums">
                  {amount.toLocaleString()}
                </span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {/each}
  </div>
{/if}
