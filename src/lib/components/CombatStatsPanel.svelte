<script lang="ts">
  import type { Fighter, FighterStats } from "$lib/combatEngine";
  import Sprite from "./Sprite.svelte";

  let { playerFighters, enemyFighters }: { playerFighters: Fighter[]; enemyFighters: Fighter[] } = $props();
  const metrics: { key: keyof FighterStats; label: string }[] = [
    { key: "damageDealt", label: "Damage" },
    { key: "healingDone", label: "Healing" },
    { key: "damageTaken", label: "Taken" },
  ];
  let metric = $state<keyof FighterStats>("damageDealt");
  let fighters = $derived([...playerFighters, ...enemyFighters].toSorted((a, b) => b.stats[metric] - a.stats[metric]));
  let maximum = $derived(Math.max(1, ...fighters.map(f => f.stats[metric])));
  let playerTotal = $derived(playerFighters.reduce((sum, f) => sum + f.stats[metric], 0));
  let enemyTotal = $derived(enemyFighters.reduce((sum, f) => sum + f.stats[metric], 0));
  const fmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
</script>

<section class="combat-stats" aria-label="Combat statistics">
  <div class="metric-tabs" aria-label="Statistic">
    {#each metrics as item}
      <button class:active={metric === item.key} aria-pressed={metric === item.key} onclick={() => metric = item.key}>{item.label}</button>
    {/each}
  </div>
  <p class="totals">You {fmt.format(playerTotal)} <span>·</span> Enemy {fmt.format(enemyTotal)}</p>
  {#if fighters.length > 0}
    <div class="stat-rows">
      {#each fighters as fighter (fighter.id)}
        <div class="stat-row" title={`${fighter.isEnemy ? "Enemy" : "Your army"} · ${fighter.name} · Position ${fighter.position}: ${fighter.stats[metric]}`}>
          <Sprite unitId={fighter.unitId} class="w-4" />
          <span class="stat-name">{fighter.name}</span>
          <div class="stat-track"><div class:enemy={fighter.isEnemy} style:width={`${100 * fighter.stats[metric] / maximum}%`}></div></div>
          <span class="stat-value">{fmt.format(fighter.stats[metric])}</span>
        </div>
      {/each}
    </div>
  {:else}
    <p class="empty">Damage, healing, and hits taken will appear here when battle begins.</p>
  {/if}
</section>

<style>
  .combat-stats { border: 1px solid var(--border); border-radius: 8px; padding: 10px; background: #ffffff02; }
  .metric-tabs { display: flex; gap: 4px; }
  .metric-tabs button { padding: 5px 8px; border-radius: 4px; font-size: 10px; color: var(--muted-foreground); cursor: pointer; }
  .metric-tabs button.active { background: #e4e4e4; color: #181818; font-weight: 600; }
  .totals { text-align: right; font-size: 9px; color: var(--muted-foreground); margin: 7px 0; font-variant-numeric: tabular-nums; }
  .totals span { padding: 0 3px; }
  .stat-rows { display: flex; flex-direction: column; gap: 6px; }
  .stat-row { display: grid; grid-template-columns: 16px minmax(0, 1fr) minmax(35px, 1fr) 25px; gap: 6px; align-items: center; font-size: 10px; }
  .stat-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .stat-track { background: #ffffff08; height: 7px; border-radius: 2px; overflow: hidden; }
  .stat-track > div { height: 100%; background: #f59b42; transition: width 250ms; border-radius: 2px; }
  .stat-track > div.enemy { background: #956461; }
  .stat-value { text-align: right; font-variant-numeric: tabular-nums; }
  .empty { font-size: 11px; line-height: 1.6; color: var(--muted-foreground); padding: 12px 0 4px; }
</style>
