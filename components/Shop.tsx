import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SKILL_ORDER, SKILLS, SkillId } from "@/lib/gameData";
import { GameState } from "@/lib/gameEngine";

const DEBUG_TOGGLES = [
  { id: "debugSpeed", name: "Hyperdrive", description: "Actions are 100x faster (debug)" },
];

export function Shop({
  state,
  onBuy,
  onToggleGlobal,
}: {
  state: GameState;
  onBuy: (skillId: SkillId, upgradeId: string) => void;
  onToggleGlobal: (upgradeId: string) => void;
}) {
  const unlockedSkills = SKILL_ORDER.filter((id) => state.skills[id].unlocked);

  return (
    <div className="flex flex-col gap-4 p-3">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-yellow-500">Debug Cheats</h3>
        <div className="flex flex-col gap-2">
          {DEBUG_TOGGLES.map((toggle) => {
            const isActive = state.globalUpgrades.includes(toggle.id);
            return (
              <div
                key={toggle.id}
                className="flex items-center justify-between gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{toggle.name}</p>
                  <p className="text-xs text-muted-foreground">{toggle.description}</p>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "destructive" : "default"}
                  onClick={() => onToggleGlobal(toggle.id)}
                >
                  {isActive ? "ON" : "OFF"}
                </Button>
              </div>
            );
          })}
        </div>
        <Separator className="mt-4" />
      </div>
      {unlockedSkills.map((skillId) => {
        const def = SKILLS[skillId];
        const owned = state.skills[skillId].upgrades;
        return (
          <div key={skillId}>
            <h3 className="mb-2 text-sm font-semibold">{def.name}</h3>
            <div className="flex flex-col gap-2">
              {def.upgrades.map((upgrade) => {
                const isOwned = owned.includes(upgrade.id);
                const canAfford = state.skillPoints >= upgrade.cost;
                return (
                  <div
                    key={upgrade.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{upgrade.name}</p>
                      <p className="text-xs text-muted-foreground">{upgrade.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={isOwned ? "secondary" : "default"}
                      disabled={isOwned || !canAfford}
                      onClick={() => onBuy(skillId, upgrade.id)}
                    >
                      {isOwned ? "Owned" : `${upgrade.cost} SP`}
                    </Button>
                  </div>
                );
              })}
            </div>
            <Separator className="mt-4" />
          </div>
        );
      })}
    </div>
  );
}
