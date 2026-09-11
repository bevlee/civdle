import { Progress } from "@/components/ui/progress";
import { SKILL_ORDER, SKILLS, SkillId } from "@/lib/gameData";
import { GameState, xpForLevel } from "@/lib/gameEngine";
import { cn } from "@/lib/utils";

export function SkillPanel({
  state,
  levels,
  selectedSkill,
  onSelect,
}: {
  state: GameState;
  levels: Record<SkillId, number>;
  selectedSkill: SkillId | null;
  onSelect: (id: SkillId) => void;
}) {
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border p-3">
      <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</h2>
      {SKILL_ORDER.map((id) => {
        const skillState = state.skills[id];
        if (!skillState.unlocked) return null;
        const level = levels[id];
        const xpBase = xpForLevel(level);
        const xpNext = xpForLevel(Math.min(level + 1, 99));
        const span = Math.max(1, xpNext - xpBase);
        const pct = level >= 99 ? 100 : Math.min(100, ((skillState.xp - xpBase) / span) * 100);
        const isActive = state.activeSkill === id;

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={cn(
              "flex flex-col gap-1 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
              selectedSkill === id && "bg-accent"
            )}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {SKILLS[id].name}
                {isActive && <span className="ml-1 text-green-500">●</span>}
              </span>
              <span className="text-muted-foreground">Lv {level}</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </button>
        );
      })}
    </nav>
  );
}
