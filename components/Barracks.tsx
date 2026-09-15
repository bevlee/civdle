import { BARRACKS_RECIPES, UNITS } from "@/lib/combatData";
import { RESOURCES, ResourceId } from "@/lib/gameData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const UNIT_COLOR: Record<string, string> = {
  swordsman: "bg-amber-500",
  spearman: "bg-blue-500",
  archer: "bg-green-600",
};

export function Barracks({
  resources,
  onCraft,
}: {
  resources: Partial<Record<ResourceId, number>>;
  onCraft: (unitId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted-foreground">Barracks</h3>
      <div className="flex flex-col gap-2">
        {BARRACKS_RECIPES.map((recipe) => {
          const owned = Math.floor(resources[UNITS[recipe.unitId].resource] ?? 0);
          const canAfford = recipe.inputs.every(
            (inp) => (resources[inp.resource] ?? 0) >= inp.amount
          );

          return (
            <div
              key={recipe.unitId}
              className="flex items-center gap-3 rounded-md border border-border p-2"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                  UNIT_COLOR[recipe.unitId]
                )}
              >
                {recipe.name[0]}
              </span>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{recipe.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    Owned: {owned}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {recipe.inputs.map((inp) => {
                    const have = Math.floor(resources[inp.resource] ?? 0);
                    const enough = have >= inp.amount;
                    return (
                      <span key={inp.resource} className={enough ? "" : "text-red-400"}>
                        {inp.amount} {RESOURCES[inp.resource].name}
                        <span className="ml-0.5 tabular-nums">({have})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!canAfford}
                onClick={() => onCraft(recipe.unitId)}
              >
                Train
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
