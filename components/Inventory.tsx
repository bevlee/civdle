import { Card, CardContent } from "@/components/ui/card";
import { RESOURCES, ResourceId } from "@/lib/gameData";

export function Inventory({ resources }: { resources: Partial<Record<ResourceId, number>> }) {
  const entries = (Object.keys(RESOURCES) as ResourceId[])
    .map((id) => ({ id, amount: Math.floor(resources[id] ?? 0) }))
    .filter((r) => r.amount > 0);

  if (entries.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No resources yet — start training a skill.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {entries.map(({ id, amount }) => (
        <Card key={id} className="gap-0 py-2">
          <CardContent className="flex items-center justify-between px-3 py-0 text-sm">
            <span className="text-muted-foreground">{RESOURCES[id].name}</span>
            <span className="font-mono font-semibold">{amount.toLocaleString()}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
