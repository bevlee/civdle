<script lang="ts">
  import { type UnitId, UNITS, ENEMIES, GRID_COLUMNS } from "$lib/combatData";
  import type { GridCell, ActiveEnemy } from "$lib/combatEngine";
  import { cn } from "$lib/utils";

  const UNIT_BADGE: Record<UnitId, { letter: string; className: string }> = {
    swordsman: { letter: "S", className: "bg-amber-500 text-white" },
    spearman: { letter: "P", className: "bg-blue-500 text-white" },
    archer: { letter: "A", className: "bg-green-600 text-white" },
  };
  const ALL_UNIT_IDS: UnitId[] = ["swordsman", "spearman", "archer"];

  let {
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
  } = $props();

  let picker = $state<[number, number] | null>(null);

  let availMap = $derived(
    new Map(availableUnits.map((u) => [u.unitId, u.count])),
  );

  function handleCellClick(lane: number, col: number) {
    if (isPlaying) return;
    const cell = grid[lane]?.[col];
    if (cell) {
      onRemove(lane, col);
      picker = null;
    } else {
      picker =
        picker && picker[0] === lane && picker[1] === col
          ? null
          : [lane, col];
    }
  }

  function handlePickUnit(unitId: UnitId) {
    if (!picker) return;
    onPlace(picker[0], picker[1], unitId);
    picker = null;
  }
</script>

<div class="relative select-none">
  <div class="grid max-w-lg grid-cols-5 grid-rows-3 gap-1">
    {#each grid as laneRow, lane}
      {#each laneRow as cell, col}
        {@const showPicker =
          !isPlaying &&
          picker !== null &&
          picker[0] === lane &&
          picker[1] === col &&
          !cell}
        <div
          class={cn(
            "relative flex aspect-square items-center justify-center rounded border border-border",
            !isPlaying && !cell && "group cursor-pointer hover:bg-accent/40",
          )}
          onclick={() => handleCellClick(lane, col)}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleCellClick(lane, col);
          }}
        >
          {#if !cell && !isPlaying}
            <span
              class="text-lg font-light text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
            >
              +
            </span>
          {/if}
          {#if cell}
            <div class="flex w-full flex-col items-center gap-0.5 px-1">
              <span
                class={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  UNIT_BADGE[cell.unitId].className,
                )}
              >
                {UNIT_BADGE[cell.unitId].letter}
              </span>
              <div class="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full bg-green-500 transition-all"
                  style="width: {Math.max(0, (cell.hp / cell.maxHp) * 100)}%"
                ></div>
              </div>
            </div>
          {/if}
          {#if showPicker}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="absolute top-full left-1/2 z-20 mt-1 -translate-x-1/2 rounded-md border border-border bg-popover p-1 shadow-md"
              onclick={(e) => e.stopPropagation()}
            >
              <div class="flex gap-1">
                {#each ALL_UNIT_IDS as uid (uid)}
                  {@const count = availMap.get(uid) ?? 0}
                  {@const badge = UNIT_BADGE[uid]}
                  <button
                    disabled={count <= 0}
                    class={cn(
                      "flex h-8 w-8 items-center justify-center rounded text-xs font-bold transition-colors",
                      count > 0
                        ? cn(badge.className, "hover:opacity-80")
                        : "cursor-not-allowed bg-muted text-muted-foreground opacity-50",
                    )}
                    title={`${UNITS[uid].name} (${count})`}
                    onclick={() => handlePickUnit(uid)}
                  >
                    {badge.letter}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    {/each}
  </div>

  {#if enemies.length > 0}
    <div
      class="pointer-events-none absolute inset-0 grid grid-rows-3 gap-1"
    >
      {#each grid as _, lane}
        <div class="relative">
          {#each enemies.filter((e) => e.lane === lane && e.hp > 0) as enemy (enemy.id)}
            {@const pct = (enemy.position / GRID_COLUMNS) * 100}
            {@const enemyDef = ENEMIES[enemy.enemyId]}
            <div
              class="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style="left: {Math.max(0, Math.min(100, pct))}%"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white"
              >
                {enemyDef.name[0]}
              </span>
              <div class="h-0.5 w-5 overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full bg-red-500"
                  style="width: {Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>
