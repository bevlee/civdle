<script lang="ts">
  import type { Fighter } from "$lib/combatEngine";
  import { isFrontRow } from "$lib/position";

  let { playerFighters, enemyFighters }: { playerFighters: Fighter[]; enemyFighters: Fighter[] } = $props();

  let side = $state<"player" | "enemy">("player");

  let fighters = $derived(
    (side === "player" ? playerFighters : enemyFighters)
      .toSorted((a, b) => a.position - b.position),
  );

  const fmt = new Intl.NumberFormat();

  function formatStat(value: number): string {
    return value === 0 ? "—" : fmt.format(value);
  }

  function posLabel(f: Fighter): string {
    return `${f.position}${isFrontRow(f.position) ? "F" : ""}`;
  }
</script>

<div class="rounded border border-border/40 bg-muted/20 px-2 py-1.5">
  <!-- Toggle -->
  <div class="mb-1.5 flex gap-1">
    <button
      class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors {side === 'player' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}"
      onclick={() => (side = "player")}
    >
      Your Units
    </button>
    <button
      class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors {side === 'enemy' ? 'bg-destructive/20 text-red-300' : 'text-muted-foreground hover:text-foreground'}"
      onclick={() => (side = "enemy")}
    >
      Enemy Units
    </button>
  </div>

  <!-- Stats table -->
  <table class="w-full text-[11px] tabular-nums">
    <thead>
      <tr class="text-left text-muted-foreground">
        <th class="w-8 pb-0.5 font-medium">Pos</th>
        <th class="pb-0.5 font-medium">Unit</th>
        <th class="w-14 pb-0.5 text-right font-medium">Dmg</th>
        <th class="w-14 pb-0.5 text-right font-medium">Heal</th>
        <th class="w-14 pb-0.5 text-right font-medium">Taken</th>
      </tr>
    </thead>
    <tbody>
      {#each fighters as f (f.id)}
        {@const dead = f.hp <= 0}
        <tr class={dead ? "text-muted-foreground/50 line-through" : ""}>
          <td class={isFrontRow(f.position) ? "text-primary font-semibold" : "text-muted-foreground"}>
            {posLabel(f)}
          </td>
          <td class="truncate max-w-[8rem]">{f.name}</td>
          <td class="text-right text-orange-400">{formatStat(f.stats.damageDealt)}</td>
          <td class="text-right text-green-400">{formatStat(f.stats.healingDone)}</td>
          <td class="text-right text-red-400">{formatStat(f.stats.damageTaken)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
