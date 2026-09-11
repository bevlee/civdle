import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RESOURCES, SKILLS, SkillId } from "@/lib/gameData";
import { GameState, computeActionResult, xpForLevel } from "@/lib/gameEngine";

export function TrainingView({
  skillId,
  state,
  level,
  ageIndex,
  progress,
  onStart,
  onStop,
  onSelectRecipe,
}: {
  skillId: SkillId;
  state: GameState;
  level: number;
  ageIndex: number;
  progress: number;
  onStart: () => void;
  onStop: () => void;
  onSelectRecipe: (recipeId: string) => void;
}) {
  const def = SKILLS[skillId];
  const skillState = state.skills[skillId];
  const isTraining = state.activeSkill === skillId;
  const isCrafting = def.category === "crafting" || def.recipes.length > 1;

  const xpBase = xpForLevel(level);
  const xpNext = xpForLevel(Math.min(level + 1, 99));
  const xpSpan = Math.max(1, xpNext - xpBase);
  const xpPct = level >= 99 ? 100 : Math.min(100, ((skillState.xp - xpBase) / xpSpan) * 100);

  const result = computeActionResult(skillId, level, skillState.upgrades, ageIndex, skillState.selectedRecipeId);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">{def.name}</h2>
        <p className="text-sm text-muted-foreground">Level {level} / 99</p>
        <div className="mt-2 flex items-center gap-2">
          <Progress value={xpPct} className="h-2 max-w-sm" />
          <span className="text-xs text-muted-foreground">
            {Math.floor(skillState.xp - xpBase)} / {xpSpan} XP
          </span>
        </div>
      </div>

      {isCrafting && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Recipe</h3>
          <div className="flex flex-wrap gap-2">
            {def.recipes.map((recipe) => {
              const locked = recipe.requiredLevel > level;
              const selected = skillState.selectedRecipeId === recipe.id;
              return (
                <button
                  key={recipe.id}
                  disabled={locked}
                  onClick={() => onSelectRecipe(recipe.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    selected ? "border-primary bg-accent" : "border-border"
                  } ${locked ? "cursor-not-allowed opacity-40" : "hover:bg-accent"}`}
                >
                  {recipe.name}
                  {locked && <span className="ml-1 text-xs text-muted-foreground">(Lv {recipe.requiredLevel})</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Action</h3>
        {result ? (
          <div className="flex flex-col gap-1 text-sm">
            {result.inputs.length > 0 && (
              <p>
                <span className="text-muted-foreground">Consumes: </span>
                {result.inputs.map((i) => `${i.amount} ${RESOURCES[i.resource].name}`).join(", ")}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Produces: </span>
              {result.outputs.map((o) => `${formatAmount(o.amount)} ${RESOURCES[o.resource].name}`).join(", ")}
            </p>
            <p className="text-muted-foreground">Time: {result.time.toFixed(2)}s</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Recipe locked at this level.</p>
        )}

        <div className="mt-2 max-w-sm">
          <Progress value={isTraining ? progress * 100 : 0} className="h-3" />
        </div>

        <div className="flex gap-2">
          {isTraining ? (
            <Button variant="destructive" onClick={onStop}>
              Stop
            </Button>
          ) : (
            <Button onClick={onStart} disabled={!result}>
              Train
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatAmount(amount: number): string {
  const whole = Math.floor(amount);
  const frac = amount - whole;
  const pct = Math.round(frac * 100);
  if (pct === 0) return String(whole);
  if (whole === 0) return `${pct}%`;
  return `${whole} + ${pct}%`;
}
