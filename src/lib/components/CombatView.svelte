<script lang="ts">
  import { type UnitId, UNITS, ENEMIES, generateWave } from "$lib/combatData";
  import type { CombatState } from "$lib/combatEngine";
  import type { ResourceId } from "$lib/gameData";
  import Barracks from "./Barracks.svelte";
  import CombatGrid from "./CombatGrid.svelte";
  import { Button } from "$lib/components/ui/button";

  const ENEMY_ICON: Record<string, string> = {
    raider: "⚔️",
    pikeman: "🛡️",
    scout: "🏹",
  };
  const ALL_UNIT_IDS: UnitId[] = ["swordsman", "spearman", "archer"];

  let {
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
  } = $props();

  let isPlaying = $derived(combat.activeWave?.status === "playing");
  let wavePreview = $derived(generateWave(combat.waveNumber));
  let warSpoils = $derived(combat.loot["warSpoils"] ?? 0);
  let availableUnits = $derived(
    ALL_UNIT_IDS.map((unitId) => {
      const resourceId = UNITS[unitId].resource;
      return { unitId, count: resources[resourceId] ?? 0 };
    }),
  );
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <span class="text-sm font-semibold">Wave {combat.waveNumber}</span>
    <Button size="sm" disabled={isPlaying} onclick={onSendWave}>
      Send Wave
    </Button>
    <span class="text-sm text-muted-foreground">Loot: {warSpoils}</span>
  </div>

  <div class="rounded border border-border bg-muted/30 p-2 text-xs">
    {#each wavePreview.lanes as laneEnemies, lane}
      <div class="flex items-center gap-1">
        <span class="w-14 text-muted-foreground">Lane {lane + 1}:</span>
        {#if laneEnemies.length === 0}
          <span class="text-muted-foreground/50">--</span>
        {:else}
          {#each laneEnemies as spawn, i}
            <span title={ENEMIES[spawn.enemyId].name}>
              {ENEMY_ICON[spawn.enemyId] ?? "?"}
            </span>
          {/each}
        {/if}
      </div>
    {/each}
  </div>

  <CombatGrid
    grid={combat.grid}
    enemies={combat.activeWave?.enemies ?? []}
    {isPlaying}
    {availableUnits}
    {onPlace}
    {onRemove}
  />

  <Barracks {resources} onCraft={onCraftUnit} />

  {#if combat.activeWave?.status === "won"}
    <div
      class="rounded border border-green-600/40 bg-green-600/20 px-3 py-2 text-center text-sm font-medium text-green-400"
    >
      Wave Won! +{combat.waveNumber - 1} War Spoils
    </div>
  {/if}
  {#if combat.activeWave?.status === "lost"}
    <div
      class="rounded border border-red-600/40 bg-red-600/20 px-3 py-2 text-center text-sm font-medium text-red-400"
    >
      Wave Lost — reinforce and retry
    </div>
  {/if}
</div>
