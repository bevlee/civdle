import { useState } from "react";
import { UnitId, UNITS, ENEMIES, GRID_COLUMNS } from "@/lib/combatData";
import { GridCell, ActiveEnemy } from "@/lib/combatEngine";
import { cn } from "@/lib/utils";

const UNIT_BADGE: Record<UnitId, { letter: string; className: string }> = {
  swordsman: { letter: "S", className: "bg-amber-500 text-white" },
  spearman: { letter: "P", className: "bg-blue-500 text-white" },
  archer: { letter: "A", className: "bg-green-600 text-white" },
};

const ALL_UNIT_IDS: UnitId[] = ["swordsman", "spearman", "archer"];

export function CombatGrid({
  grid,
  enemies,
  isPlaying,
  availableUnits,
  onPlace,
  onRemove,
}: {
  grid: GridCell[][];
  enemies: ActiveEnemy[];
  isPlaying: boolean;
  availableUnits: { unitId: UnitId; count: number }[];
  onPlace: (lane: number, col: number, unitId: UnitId) => void;
  onRemove: (lane: number, col: number) => void;
}) {
  const [picker, setPicker] = useState<[number, number] | null>(null);

  const availMap = new Map(availableUnits.map((u) => [u.unitId, u.count]));

  function handleCellClick(lane: number, col: number) {
    if (isPlaying) return;
    const cell = grid[lane]?.[col];
    if (cell) {
      onRemove(lane, col);
      setPicker(null);
    } else {
      setPicker(
        picker && picker[0] === lane && picker[1] === col
          ? null
          : [lane, col]
      );
    }
  }

  function handlePickUnit(unitId: UnitId) {
    if (!picker) return;
    onPlace(picker[0], picker[1], unitId);
    setPicker(null);
  }

  return (
    <div className="relative select-none">
      <div className="grid grid-cols-5 grid-rows-3 gap-1">
        {grid.map((laneRow, lane) =>
          laneRow.map((cell, col) => {
            const showPicker =
              !isPlaying &&
              picker !== null &&
              picker[0] === lane &&
              picker[1] === col &&
              !cell;

            return (
              <div
                key={`${lane}-${col}`}
                className={cn(
                  "relative aspect-square rounded border border-border",
                  "flex items-center justify-center",
                  !isPlaying && !cell && "cursor-pointer hover:bg-accent/40 group"
                )}
                onClick={() => handleCellClick(lane, col)}
              >
                {/* Empty cell: "+" hint on hover */}
                {!cell && !isPlaying && (
                  <span className="text-muted-foreground/50 text-lg font-light opacity-0 transition-opacity group-hover:opacity-100">
                    +
                  </span>
                )}

                {/* Placed unit */}
                {cell && (
                  <div className="flex flex-col items-center gap-0.5 w-full px-1">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                        UNIT_BADGE[cell.unitId].className
                      )}
                    >
                      {UNIT_BADGE[cell.unitId].letter}
                    </span>
                    {/* HP bar */}
                    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${Math.max(0, (cell.hp / cell.maxHp) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Unit picker popover */}
                {showPicker && (
                  <div
                    className="absolute top-full left-1/2 z-20 mt-1 -translate-x-1/2 rounded-md border border-border bg-popover p-1 shadow-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-1">
                      {ALL_UNIT_IDS.map((uid) => {
                        const count = availMap.get(uid) ?? 0;
                        const badge = UNIT_BADGE[uid];
                        return (
                          <button
                            key={uid}
                            disabled={count <= 0}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded text-xs font-bold transition-colors",
                              count > 0
                                ? cn(badge.className, "hover:opacity-80")
                                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                            )}
                            title={`${UNITS[uid].name} (${count})`}
                            onClick={() => handlePickUnit(uid)}
                          >
                            {badge.letter}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Enemy overlay: one row per lane */}
      {enemies.length > 0 && (
        <div className="pointer-events-none absolute inset-0 grid grid-rows-3 gap-1">
          {grid.map((_, lane) => (
            <div key={lane} className="relative">
              {enemies
                .filter((e) => e.lane === lane && e.hp > 0)
                .map((enemy) => {
                  const pct = (enemy.position / GRID_COLUMNS) * 100;
                  const enemyDef = ENEMIES[enemy.enemyId];
                  return (
                    <div
                      key={enemy.id}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                      style={{ left: `${Math.max(0, Math.min(100, pct))}%` }}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                        {enemyDef.name[0]}
                      </span>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
