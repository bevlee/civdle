<script lang="ts">
  import { onMount } from "svelte";
  import { CivdleGame } from "$lib/gameState.svelte";
  import { SKILLS, type SkillId } from "$lib/gameData";
  import AgeDisplay from "$lib/components/AgeDisplay.svelte";
  import SkillPanel from "$lib/components/SkillPanel.svelte";
  import TrainingView from "$lib/components/TrainingView.svelte";
  import Inventory from "$lib/components/Inventory.svelte";
  import Shop from "$lib/components/Shop.svelte";
  import CombatView from "$lib/components/CombatView.svelte";
  import SkillUnlockModal from "$lib/components/SkillUnlockModal.svelte";
  import AnimationOverlay from "$lib/components/AnimationOverlay.svelte";

  const game = new CivdleGame();

  let selectedSkill = $state<SkillId | null>(null);
  let activeTab = $state<"train" | "inventory" | "shop" | "combat">("train");

  onMount(() => {
    document.documentElement.classList.add("dark");
    return game.init();
  });

  function handleSelectSkill(id: SkillId) {
    selectedSkill = id;
    activeTab = "train";
  }

  function handleStartTraining() {
    if (!selectedSkill) return;
    game.startTraining(selectedSkill);
  }

  function handleStopTraining() {
    game.stopTraining();
  }

  let highlightedResources = $derived.by(() => {
    if (!selectedSkill) return undefined;
    const def = SKILLS[selectedSkill];
    const recipe = def.recipes.find(
      (r) => r.id === game.state.skills[selectedSkill!].selectedRecipeId,
    );
    if (!recipe) return undefined;
    return new Set([
      ...recipe.inputs.map((i) => i.resource),
      ...recipe.outputs.map((o) => o.resource),
    ]);
  });
</script>

{#if !game.loaded}
  <div class="flex min-h-screen items-center justify-center bg-background">
    <p class="text-muted-foreground">Loading…</p>
  </div>
{:else}
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <AgeDisplay
      ageIndex={game.ageIndex}
      ageBonus={game.ageBonus}
      skillPoints={game.state.skillPoints}
      levels={game.levels}
      resources={game.state.resources}
      ageAdvanceStatus={game.ageAdvanceStatus}
      onAdvance={() => game.advanceAgeAction()}
      events={game.events}
      onDismissEvent={(id) => game.dismissEvent(id)}
    />

    {#if game.message}
      <div
        class="flex items-center justify-between border-b border-border bg-muted/50 px-6 py-2"
      >
        <p class="text-sm text-muted-foreground">{game.message}</p>
        <button
          class="text-xs text-muted-foreground hover:text-foreground"
          onclick={() => game.dismissMessage()}
        >
          ✕
        </button>
      </div>
    {/if}

    <div class="flex flex-1 overflow-hidden">
      <SkillPanel
        state={game.state}
        levels={game.levels}
        {selectedSkill}
        onSelect={handleSelectSkill}
        events={game.events}
        onDismissEvent={(id) => game.dismissEvent(id)}
      />

      <main class="flex flex-1 overflow-y-auto">
        <div class="flex flex-1 flex-col">
          <div class="flex border-b border-border">
            {#each [
              { key: "train", label: "Train" },
              { key: "inventory", label: "Inventory" },
              { key: "shop", label: "Shop" },
              ...(game.state.combat.unlocked
                ? [{ key: "combat", label: "Combat" }]
                : []),
            ] as tab (tab.key)}
              <button
                class="px-4 py-2 text-sm font-medium transition-colors {activeTab ===
                tab.key
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'}"
                onclick={() => (activeTab = tab.key as typeof activeTab)}
              >
                {tab.label}
              </button>
            {/each}
          </div>

          {#if activeTab === "train" && selectedSkill}
            <TrainingView
              skillId={selectedSkill}
              state={game.state}
              level={game.levels[selectedSkill]}
              ageIndex={game.ageIndex}
              progress={game.displayProgress}
              onStart={handleStartTraining}
              onStop={handleStopTraining}
              onSelectRecipe={(recipeId) =>
                game.selectRecipe(selectedSkill!, recipeId)}
              onToggleConsumable={(resourceId) =>
                game.toggleConsumable(resourceId)}
            />
          {:else if activeTab === "train"}
            <div class="flex flex-1 items-center justify-center">
              <p class="text-muted-foreground">
                Select a skill to begin training.
              </p>
            </div>
          {:else if activeTab === "inventory"}
            <div class="flex-1 overflow-y-auto">
              <Inventory
                resources={game.state.resources}
                {highlightedResources}
                events={game.events}
                onDismissEvent={(id) => game.dismissEvent(id)}
              />
            </div>
          {:else if activeTab === "shop"}
            <div class="flex-1 overflow-y-auto">
              <Shop
                state={game.state}
                onBuy={(skillId, upgradeId) =>
                  game.buyUpgrade(skillId, upgradeId)}
                onBuyGlobal={(upgradeId) => game.buyGlobalUpgrade(upgradeId)}
              />
            </div>
          {:else if activeTab === "combat"}
            <div class="flex-1 overflow-y-auto p-3">
              <CombatView
                combat={game.state.combat}
                resources={game.state.resources}
                ageIndex={game.ageIndex}
                onPlace={(lane, col, unitId) =>
                  game.placeUnitOnGrid(lane, col, unitId)}
                onRemove={(lane, col) => game.removeUnitFromGrid(lane, col)}
                onSendWave={() => game.sendWave()}
                onCraftUnit={(unitId) => game.craftBarracksUnit(unitId)}
              />
            </div>
          {/if}
        </div>
      </main>
    </div>
  </div>

  {#if game.pendingUnlocks.length > 0}
    <SkillUnlockModal
      skillId={game.pendingUnlocks[0]}
      onDismiss={() => game.dismissUnlock()}
    />
  {/if}

  <AnimationOverlay
    events={game.events}
    onDismiss={(id) => game.dismissEvent(id)}
  />
{/if}
