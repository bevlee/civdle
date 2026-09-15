import { UnitId, UNITS, ENEMIES, generateWave } from "@/lib/combatData";
import { CombatState } from "@/lib/combatEngine";
import { ResourceId } from "@/lib/gameData";
import { Barracks } from "./Barracks";
import { CombatGrid } from "./CombatGrid";
import { Button } from "@/components/ui/button";

const ENEMY_ICON: Record<string, string> = {
  raider: "⚔️",
  pikeman: "🛡️",
  scout: "🏹",
};

const ALL_UNIT_IDS: UnitId[] = ["swordsman", "spearman", "archer"];

export function CombatView({
  combat,
  resources,
  ageIndex,
  onPlace,
  onRemove,
  onSendWave,
  onCraftUnit,
}: {
  combat: CombatState;
  resources: Partial<Record<ResourceId, number>>;
  ageIndex: number;
  onPlace: (lane: number, col: number, unitId: UnitId) => void;
  onRemove: (lane: number, col: number) => void;
  onSendWave: () => void;
  onCraftUnit: (unitId: string) => void;
}) {
  const isPlaying = combat.activeWave?.status === "playing";
  const wavePreview = generateWave(combat.waveNumber);
  const warSpoils = combat.loot["warSpoils"] ?? 0;

  // Compute available units from resources
  const availableUnits = ALL_UNIT_IDS.map((unitId) => {
    const resourceId = UNITS[unitId].resource;
    return { unitId, count: resources[resourceId] ?? 0 };
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Wave header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          Wave {combat.waveNumber}
        </span>
        <Button
          size="sm"
          disabled={isPlaying}
          onClick={onSendWave}
        >
          Send Wave
        </Button>
        <span className="text-sm text-muted-foreground">
          Loot: {warSpoils}
        </span>
      </div>

      {/* Wave preview */}
      <div className="rounded border border-border bg-muted/30 p-2 text-xs">
        {wavePreview.lanes.map((laneEnemies, lane) => (
          <div key={lane} className="flex items-center gap-1">
            <span className="w-14 text-muted-foreground">Lane {lane + 1}:</span>
            {laneEnemies.length === 0 ? (
              <span className="text-muted-foreground/50">--</span>
            ) : (
              laneEnemies.map((spawn, i) => (
                <span key={i} title={ENEMIES[spawn.enemyId].name}>
                  {ENEMY_ICON[spawn.enemyId] ?? "?"}
                </span>
              ))
            )}
          </div>
        ))}
      </div>

      {/* Combat grid */}
      <CombatGrid
        grid={combat.grid}
        enemies={combat.activeWave?.enemies ?? []}
        isPlaying={isPlaying}
        availableUnits={availableUnits}
        onPlace={onPlace}
        onRemove={onRemove}
      />

      {/* Barracks */}
      <Barracks resources={resources} onCraft={onCraftUnit} />

      {/* Result banner */}
      {combat.activeWave?.status === "won" && (
        <div className="rounded bg-green-600/20 border border-green-600/40 px-3 py-2 text-center text-sm font-medium text-green-400">
          Wave Won! +{combat.waveNumber - 1} War Spoils
        </div>
      )}
      {combat.activeWave?.status === "lost" && (
        <div className="rounded bg-red-600/20 border border-red-600/40 px-3 py-2 text-center text-sm font-medium text-red-400">
          Wave Lost — reinforce and retry
        </div>
      )}
    </div>
  );
}
