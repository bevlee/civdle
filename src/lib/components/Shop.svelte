<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import { SKILL_ORDER, SKILLS, type SkillId } from "$lib/gameData";
  import type { GameState } from "$lib/gameEngine";

  const DEBUG_UPGRADES = [
    {
      id: "debugSpeed",
      name: "Hyperdrive",
      description: "Actions are 100x faster (debug)",
      cost: 0,
    },
  ];

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
</script>

<div class="flex flex-col gap-4 p-3">
  <div>
    <h3 class="mb-2 text-sm font-semibold text-yellow-500">Debug Cheats</h3>
    <div class="flex flex-col gap-2">
      {#each DEBUG_UPGRADES as upgrade (upgrade.id)}
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
