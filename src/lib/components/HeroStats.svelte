<script lang="ts">
  import type { CardStats } from "$lib/combatData";
  let { stats, currentHp }: { stats: CardStats; currentHp?: number } = $props();
</script>

<div class="grid grid-cols-4 gap-1 text-center text-xs" aria-label="Hero attributes">
  {#each [{ label: "HP", value: currentHp === undefined ? stats.hp : `${currentHp}/${stats.hp}` }, { label: "ATK", value: stats.atk }, { label: "DEF", value: stats.def }, { label: "SPD", value: stats.spd }] as attribute}
    <div class="rounded bg-muted px-1 py-1"><div class="text-muted-foreground">{attribute.label}</div><div class="font-bold tabular-nums">{attribute.value}</div></div>
  {/each}
</div>
