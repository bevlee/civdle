<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import {
    DEBUG_GLOBAL_UPGRADES,
    GLOBAL_UPGRADES,
    MAX_LEVEL,
    SKILL_ORDER,
    SKILLS,
    type SkillId,
  } from "$lib/gameData";
  import { type GameState, canBuyGlobalUpgrade, hasMaxedSkill } from "$lib/gameEngine";

  let {
    state,
    onBuy,
    onBuyGlobal,
  }: {
    state: GameState;
    onBuy: (skillId: SkillId, upgradeId: string) => void;
    onBuyGlobal: (upgradeId: string) => void;
  } = $props();

  let unlockedSkills = $derived(
    SKILL_ORDER.filter((id) => state.skills[id].unlocked),
  );
  let masteryUnlocked = $derived(hasMaxedSkill(state));
</script>

<div class="flex flex-col gap-4 p-3">
  <div>
    <h3 class="mb-2 text-sm font-semibold text-yellow-500">Debug Cheats</h3>
    <div class="flex flex-col gap-2">
      {#each DEBUG_GLOBAL_UPGRADES as upgrade (upgrade.id)}
        {@const isOwned = state.globalUpgrades.includes(upgrade.id)}
        <div
          class="flex items-center justify-between gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-sm"
        >
          <div>
            <p class="font-medium">{upgrade.name}</p>
            <p class="text-xs text-muted-foreground">{upgrade.description}</p>
          </div>
          <Button
            size="sm"
            variant={isOwned ? "secondary" : "default"}
            disabled={isOwned}
            onclick={() => onBuyGlobal(upgrade.id)}
          >
            {isOwned ? "Owned" : "Free"}
          </Button>
        </div>
      {/each}
    </div>
    <Separator class="mt-4" />
  </div>

  <div>
    <div class="mb-2 flex items-baseline justify-between gap-2">
      <h3 class="text-sm font-semibold text-amber-400">Mastery</h3>
      {#if !masteryUnlocked}
        <span class="text-[11px] text-muted-foreground">
          Reach Lv {MAX_LEVEL} in any skill
        </span>
      {/if}
    </div>
    <div class="flex flex-col gap-2">
      {#each GLOBAL_UPGRADES as upgrade (upgrade.id)}
        {@const isOwned = state.globalUpgrades.includes(upgrade.id)}
        {@const canBuy = canBuyGlobalUpgrade(state, upgrade.id)}
        <div
          class="flex items-center justify-between gap-2 rounded-md border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-sm {masteryUnlocked
            ? ''
            : 'opacity-50'}"
        >
          <div>
            <p class="font-medium">{upgrade.name}</p>
            <p class="text-xs text-muted-foreground">{upgrade.description}</p>
          </div>
          <Button
            size="sm"
            variant={isOwned ? "secondary" : "default"}
            disabled={!canBuy}
            title={masteryUnlocked ? undefined : `Unlocks at Lv ${MAX_LEVEL} in any skill`}
            onclick={() => onBuyGlobal(upgrade.id)}
          >
            {isOwned ? "Owned" : `${upgrade.cost} SP`}
          </Button>
        </div>
      {/each}
    </div>
    <Separator class="mt-4" />
  </div>

  {#each unlockedSkills as skillId (skillId)}
    {@const def = SKILLS[skillId]}
    {@const owned = state.skills[skillId].upgrades}
    <div>
      <h3 class="mb-2 text-sm font-semibold">{def.name}</h3>
      <div class="flex flex-col gap-2">
        {#each def.upgrades as upgrade (upgrade.id)}
          {@const isOwned = owned.includes(upgrade.id)}
          {@const canAfford = state.skillPoints >= upgrade.cost}
          <div
            class="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <div>
              <p class="font-medium">{upgrade.name}</p>
              <p class="text-xs text-muted-foreground">
                {upgrade.description}
              </p>
            </div>
            <Button
              size="sm"
              variant={isOwned ? "secondary" : "default"}
              disabled={isOwned || !canAfford}
              onclick={() => onBuy(skillId, upgrade.id)}
            >
              {isOwned ? "Owned" : `${upgrade.cost} SP`}
            </Button>
          </div>
        {/each}
      </div>
      <Separator class="mt-4" />
    </div>
  {/each}
</div>
