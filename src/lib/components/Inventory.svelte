<script lang="ts">
  import { Card, CardContent } from "$lib/components/ui/card";
  import FloatingText from "./FloatingText.svelte";
  import { RESOURCES, type ResourceId } from "$lib/gameData";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
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
    {
      label: "Units",
      resources: ["unitSwordsman", "unitSpearman", "unitArcher"],
    },
  ];

  let {
    resources,
    highlightedResources,
    events = [],
    onDismissEvent,
  }: {
    resources: Partial<Record<ResourceId, number>>;
    highlightedResources?: Set<ResourceId>;
    events?: QueuedEvent[];
    onDismissEvent?: (id: string) => void;
  } = $props();

  let gainEvents = $derived(
    events.filter(
      (e): e is QueuedEvent<{ resource: ResourceId; amount: number }> =>
        e.type === "resourceGain",
    ),
  );

  let hasAny = $derived(
    Object.values(resources).some((v) => (v ?? 0) >= 1),
  );

  function formatGain(amount: number): string {
    const rounded = Math.round(amount * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }
</script>

{#if !hasAny}
  <p class="p-4 text-sm text-muted-foreground">
    No resources yet — start training a skill.
  </p>
{:else}
  <div class="flex flex-col gap-3 p-3">
    {#each RESOURCE_SECTIONS as section (section.label)}
      {@const entries = section.resources
        .map((id) => ({ id, amount: Math.floor(resources[id] ?? 0) }))
        .filter((r) => r.amount > 0)}
      {#if entries.length > 0}
        <div>
          <h4
            class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
          >
            {section.label}
          </h4>
          <div class="grid grid-cols-2 gap-1.5">
            {#each entries as { id, amount } (id)}
              {@const highlighted = highlightedResources?.has(id)}
              {@const gainEvent = gainEvents.find(
                (e) => e.data.resource === id,
              )}
              <Card
                class={cn(
                  "relative gap-0 overflow-visible py-1.5 transition-colors",
                  highlighted && "border-amber-500/60 bg-amber-500/10",
                )}
              >
                <CardContent
                  class="flex items-center justify-between px-2.5 py-0 text-sm"
                >
                  <span
                    class={cn(
                      "text-muted-foreground",
                      highlighted && "text-amber-300",
                    )}
                  >
                    {RESOURCES[id].name}
                  </span>
                  <span class="font-mono font-semibold">
                    {amount.toLocaleString()}
                  </span>
                </CardContent>
                {#if gainEvent && onDismissEvent}
                  <FloatingText
                    id={gainEvent.id}
                    text={`+${formatGain(gainEvent.data.amount)}`}
                    class="text-xs text-emerald-400"
                    duration={900}
                    onDone={onDismissEvent}
                  />
                {/if}
              </Card>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
{/if}
