<script lang="ts">
  import { onMount } from "svelte";
  import { CivdleGame } from "$lib/gameState.svelte";
  import { SKILL_ORDER, SKILLS, type SkillId } from "$lib/gameData";
  import AgeDisplay from "$lib/components/AgeDisplay.svelte";
  import SkillPanel from "$lib/components/SkillPanel.svelte";
  import TrainingView from "$lib/components/TrainingView.svelte";
  import Inventory from "$lib/components/Inventory.svelte";
  import Shop from "$lib/components/Shop.svelte";
  import CombatView from "$lib/components/CombatView.svelte";
  import SkillUnlockModal from "$lib/components/SkillUnlockModal.svelte";
  import AnimationOverlay from "$lib/components/AnimationOverlay.svelte";
  import GainToastStack from "$lib/components/GainToastStack.svelte";
  import DebugPanel from "$lib/components/DebugPanel.svelte";
  import { page } from "$app/state";

  const game = new CivdleGame();

  let isDebug = $derived(page.url.searchParams.has("debug"));

  let selectedSkill = $state<SkillId | null>(null);
  let centerTab = $state<"train" | "combat">("train");
  let rightTab = $state<"inventory" | "shop">("inventory");

  onMount(() => {
    document.documentElement.classList.add("dark");
    const cleanup = game.init();

    const firstUnlocked = SKILL_ORDER.find(
      (id) => game.state.skills[id].unlocked,
    );
    if (firstUnlocked) selectedSkill = firstUnlocked;

    return cleanup;
  });

  function handleSelectSkill(id: SkillId) {
    selectedSkill = id;
    centerTab = "train";
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

  $effect(() => {
    if (game.pendingUnlocks.length > 0) {
      const newSkill = game.pendingUnlocks[0];
      selectedSkill = newSkill;
      centerTab = "train";
    }
  });
</script>

{#if !game.loaded}
  <div class="flex min-h-screen items-center justify-center bg-background">
    <p class="text-muted-foreground">Loading…</p>
  </div>
{:else}
  <div class="flex h-screen flex-col overflow-hidden bg-background text-foreground">
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

    <div class="flex min-h-0 flex-1">
      <!-- Left: Skill panel -->
      <SkillPanel
        state={game.state}
        levels={game.levels}
        {selectedSkill}
        onSelect={handleSelectSkill}
        events={game.events}
        onDismissEvent={(id) => game.dismissEvent(id)}
      />

      <!-- Center: Train / Combat -->
      <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div class="flex border-b border-border">
          <button
            class="px-4 py-2 text-sm font-medium transition-colors {centerTab ===
            'train'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => (centerTab = "train")}
          >
            Train
          </button>
          <button
            class="px-4 py-2 text-sm font-medium transition-colors {centerTab ===
            'combat'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => (centerTab = "combat")}
          >
            Combat
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          {#if centerTab === "train" && selectedSkill}
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
            />
          {:else if centerTab === "train"}
            <div class="flex flex-1 items-center justify-center p-6">
              <p class="text-muted-foreground">
                Select a skill to begin training.
              </p>
            </div>
          {:else if centerTab === "combat"}
            <div class="p-3">
              <CombatView {game} />
            </div>
          {/if}
        </div>
      </main>

      <!-- Right: Inventory / Shop -->
      <aside
        class="flex w-72 shrink-0 flex-col border-l border-border"
      >
        <div class="flex border-b border-border">
          <button
            class="flex-1 px-3 py-2 text-sm font-medium transition-colors {rightTab ===
            'inventory'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => (rightTab = "inventory")}
          >
            Inventory
          </button>
          <button
            class="flex-1 px-3 py-2 text-sm font-medium transition-colors {rightTab ===
            'shop'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => (rightTab = "shop")}
          >
            Shop
          </button>
        </div>
        <div class="flex-1 overflow-y-auto">
          {#if rightTab === "inventory"}
            <Inventory
              resources={game.state.resources}
              {highlightedResources}
            />
          {:else}
            <Shop
              state={game.state}
              onBuy={(skillId, upgradeId) =>
                game.buyUpgrade(skillId, upgradeId)}
              onBuyGlobal={(upgradeId) => game.buyGlobalUpgrade(upgradeId)}
            />
          {/if}
        </div>
      </aside>
    </div>
  </div>

  {#if game.pendingUnlocks.length > 0}
    <SkillUnlockModal
      skillId={game.pendingUnlocks[0]}
      onDismiss={() => game.dismissUnlock()}
    />
  {/if}

  <GainToastStack
    events={game.events}
    onDismiss={(id) => game.dismissEvent(id)}
  />

  <AnimationOverlay
    events={game.events}
    onDismiss={(id) => game.dismissEvent(id)}
  />

  {#if isDebug}
    <DebugPanel {game} />
  {/if}
{/if}
