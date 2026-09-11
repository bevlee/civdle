import { Badge } from "@/components/ui/badge";
import { AGES } from "@/lib/gameData";
import { AgeBonus } from "@/lib/gameEngine";

export function AgeDisplay({
  ageIndex,
  ageBonus,
  skillPoints,
}: {
  ageIndex: number;
  ageBonus: AgeBonus;
  skillPoints: number;
}) {
  const age = AGES[ageIndex];
  const timeReductionPct = Math.round((1 - ageBonus.timeMult) * 100);
  const outputBonusPct = Math.round((ageBonus.outputMult - 1) * 100);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight">Civdle</h1>
        <Badge variant="secondary" className="text-sm">
          {age.name}
        </Badge>
        {ageIndex > 0 && (
          <span className="text-xs text-muted-foreground">
            -{timeReductionPct}% time, +{outputBonusPct}% output
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Skill Points</span>
        <Badge className="text-sm">{skillPoints}</Badge>
      </div>
    </header>
  );
}
