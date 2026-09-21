<script lang="ts">
  import {
    SETTLEMENT_UPGRADES,
    SETTLEMENT_UPGRADE_ORDER,
    type SettlementUpgradeId,
  } from "$lib/settlementData";
  import { RESOURCES, SKILLS } from "$lib/gameData";
  import { canBuySettlementUpgrade, getSkillLevels, type GameState } from "$lib/gameEngine";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";

  let {
    state,
    onBuy,
  }: {
    state: GameState;
    onBuy: (upgradeId: SettlementUpgradeId) => void;
  } = $props();

  let levels = $derived(getSkillLevels(state));
  let owned = $derived(new Set(state.settlementUpgrades));
</script>

<div class="flex flex-col gap-4 p-4">
  <div class="flex flex-col gap-1">
    <h2 class="text-lg font-bold">Settlement</h2>
    <p class="text-sm text-muted-foreground">
      Invest resources from your skills to unlock combat upgrades. Each upgrade is permanent.
    </p>
  </div>

  <div class="flex flex-col gap-3">
    {#each SETTLEMENT_UPGRADE_ORDER as upgradeId (upgradeId)}
      {@const def = SETTLEMENT_UPGRADES[upgradeId]}
      {@const isOwned = owned.has(upgradeId)}
      {@const canBuy = canBuySettlementUpgrade(state, upgradeId)}
      {@const prereqChainMet = !def.requires || owned.has(def.requires)}
      {@const skillsMet = def.prereqs.every((p) => (levels[p.skill] ?? 0) >= p.level)}
      {@const locked = !prereqChainMet || !skillsMet}

      <div
        class={cn(
          "flex flex-col gap-2 rounded-lg border p-3 transition-colors",
          isOwned && "border-emerald-500/40 bg-emerald-500/10",
          !isOwned && canBuy && "border-primary/60 bg-primary/5",
          !isOwned && !canBuy && !locked && "border-border bg-muted/20",
          locked && "border-border/50 bg-muted/10 opacity-60",
        )}
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">{def.icon}</span>
            <h3 class="font-semibold">{def.name}</h3>
            {#if isOwned}
              <span class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">BUILT</span>
            {/if}
          </div>
          {#if !isOwned}
            <Button
              size="sm"
              disabled={!canBuy}
              onclick={() => onBuy(upgradeId)}
            >
              {canBuy ? "Build" : locked ? "Locked" : "Need Resources"}
            </Button>
          {/if}
        </div>

        <p class="text-sm text-muted-foreground">{def.description}</p>

        {#if !isOwned}
          <div class="flex flex-col gap-1.5 text-xs">
            {#if def.requires}
              {@const reqDef = SETTLEMENT_UPGRADES[def.requires]}
              <div class="flex items-center gap-1.5">
                <span class="text-muted-foreground">Requires:</span>
                <span
                  class={cn(
                    "rounded px-1.5 py-0.5",
                    prereqChainMet ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-300",
                  )}
                >
                  {prereqChainMet ? "✓" : "✗"} {reqDef.name}
                </span>
              </div>
            {/if}

            {#if def.prereqs.length > 0}
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-muted-foreground">Skills:</span>
              {#each def.prereqs as prereq (prereq.skill + prereq.level)}
                {@const met = (levels[prereq.skill] ?? 0) >= prereq.level}
                <span
                  class={cn(
                    "rounded px-1.5 py-0.5",
                    met ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-300",
                  )}
                >
                  {met ? "✓" : "✗"} {SKILLS[prereq.skill].name} Lv {prereq.level}
                  {#if !met}
                    <span class="text-muted-foreground">({levels[prereq.skill] ?? 0})</span>
                  {/if}
                </span>
              {/each}
            </div>
            {/if}

            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-muted-foreground">Cost:</span>
              {#each def.cost as cost (cost.resource)}
                {@const have = Math.floor(state.resources[cost.resource] ?? 0)}
                {@const enough = have >= cost.amount}
                <span
                  class={cn(
                    "rounded px-1.5 py-0.5",
                    enough ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-300",
                  )}
                >
                  {enough ? "✓" : "✗"} {cost.amount} {RESOURCES[cost.resource].name}
                  {#if !enough}
                    <span class="text-muted-foreground">({have})</span>
                  {/if}
                </span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
