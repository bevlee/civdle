<script lang="ts">
  import type { SkillId } from "$lib/gameData";
  import type { CivdleGame } from "$lib/gameState.svelte";
  import { cn } from "$lib/utils";
  import type { TownSegment } from "$lib/view/townView";
  import SettlementView from "./SettlementView.svelte";
  import Shop from "./Shop.svelte";

  /** The Town tab: skill-point upgrades (Shop) and resource-built upgrades (Settlement). */
  let {
    game,
    segment = $bindable("shop"),
    shopHintOpen = $bindable(false),
    onJump,
  }: {
    game: CivdleGame;
    segment?: TownSegment;
    shopHintOpen?: boolean;
    onJump: (skillId: SkillId, recipeId: string | null) => void;
  } = $props();

  const SEGMENTS: { id: TownSegment; label: string }[] = [
    { id: "shop", label: "Shop" },
    { id: "settlement", label: "Settlement" },
  ];
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-[18px] pb-6">
  <div class="flex flex-col gap-3">
    <h2 class="text-2xl font-bold tracking-[-.01em] md:text-xl">Town</h2>
    <div role="group" aria-label="Town section" class="flex gap-1 rounded-xl bg-card p-1">
      {#each SEGMENTS as s (s.id)}
        <button
          class={cn(
            "tap-target h-9 flex-1 rounded-[9px] text-sm font-semibold transition-colors",
            segment === s.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={segment === s.id}
          onclick={() => {
            segment = s.id;
            if (s.id === "settlement") shopHintOpen = false;
          }}
        >
          {s.label}
        </button>
      {/each}
    </div>
  </div>

  {#if segment === "shop"}
    <Shop
      state={game.state}
      levels={game.levels}
      bind:hintOpen={shopHintOpen}
      onBuy={(skillId, upgradeId) => game.buyUpgrade(skillId, upgradeId)}
      onBuyGlobal={(upgradeId) => game.buyGlobalUpgrade(upgradeId)}
    />
  {:else}
    <SettlementView
      state={game.state}
      levels={game.levels}
      rollRates={game.rollRates}
      maxSummonStars={game.maxSummonStars}
      onBuy={(upgradeId) => game.buySettlementUpgradeAction(upgradeId)}
      {onJump}
    />
  {/if}
</div>
