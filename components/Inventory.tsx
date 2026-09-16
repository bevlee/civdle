import { Card, CardContent } from "@/components/ui/card";
import { FloatingText } from "@/components/FloatingText";
import { RESOURCES, ResourceId } from "@/lib/gameData";
import { QueuedEvent } from "@/lib/useEventQueue";
import { cn } from "@/lib/utils";

const RESOURCE_SECTIONS: { label: string; resources: ResourceId[] }[] = [
  {
    label: "Raw Materials",
    resources: [
      "food", "plantFibres", "clay", "wood", "logs", "stone",
      "rawHides", "rawFish", "copperOre", "ironOre", "coal",
      "grain", "vegetables", "wool", "milk",
    ],
  },
  {
    label: "Refined",
    resources: [
      "cordage", "thread", "cloth", "planks",
      "copperBar", "ironBar", "steelBar", "bricks", "preparedHides",
    ],
  },
  {
    label: "Food & Drink",
    resources: ["cookedFish", "preparedMeal", "ale", "mead"],
  },
  {
    label: "Tools & Equipment",
    resources: [
      "tools", "copperTools", "ironTools", "steelTools",
      "bow", "baskets", "potteryVessel",
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

interface ResourceGainData {
  resource: ResourceId;
  amount: number;
}

export function Inventory({
  resources,
  highlightedResources,
  events = [],
  onDismissEvent,
}: {
  resources: Partial<Record<ResourceId, number>>;
  highlightedResources?: Set<ResourceId>;
  events?: QueuedEvent[];
  onDismissEvent?: (id: string) => void;
}) {
  const gainEvents = events.filter(
    (e): e is QueuedEvent<ResourceGainData> => e.type === "resourceGain"
  );
  const hasAny = Object.values(resources).some((v) => (v ?? 0) >= 1);

  if (!hasAny) {
    return <p className="p-4 text-sm text-muted-foreground">No resources yet — start training a skill.</p>;
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {RESOURCE_SECTIONS.map((section) => {
        const entries = section.resources
          .map((id) => ({ id, amount: Math.floor(resources[id] ?? 0) }))
          .filter((r) => r.amount > 0);

        if (entries.length === 0) return null;

        return (
          <div key={section.label}>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {entries.map(({ id, amount }) => {
                const highlighted = highlightedResources?.has(id);
                const gainEvent = gainEvents.find((e) => e.data.resource === id);
                return (
                  <Card
                    key={id}
                    className={cn(
                      "relative gap-0 overflow-visible py-1.5 transition-colors",
                      highlighted && "border-amber-500/60 bg-amber-500/10"
                    )}
                  >
                    <CardContent className="flex items-center justify-between px-2.5 py-0 text-sm">
                      <span className={cn("text-muted-foreground", highlighted && "text-amber-300")}>
                        {RESOURCES[id].name}
                      </span>
                      <span className="font-mono font-semibold">{amount.toLocaleString()}</span>
                    </CardContent>
                    {gainEvent && onDismissEvent && (
                      <FloatingText
                        key={gainEvent.id}
                        id={gainEvent.id}
                        text={`+${formatGain(gainEvent.data.amount)}`}
                        className="text-xs text-emerald-400"
                        duration={900}
                        onDone={onDismissEvent}
                      />
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatGain(amount: number): string {
  const rounded = Math.round(amount * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
