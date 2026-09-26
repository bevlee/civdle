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
  import SettlementView from "$lib/components/SettlementView.svelte";
  import SkillUnlockModal from "$lib/components/SkillUnlockModal.svelte";
  import AnimationOverlay from "$lib/components/AnimationOverlay.svelte";
  import GainToastStack from "$lib/components/GainToastStack.svelte";
  import AchievementsView from "$lib/components/AchievementsView.svelte";
  import AchievementToasts from "$lib/components/AchievementToasts.svelte";
  import { ACHIEVEMENTS } from "$lib/achievements";
  import DebugPanel from "$lib/components/DebugPanel.svelte";
  import { page } from "$app/state";

  const game = new CivdleGame();

  let isDebug = $derived(page.url.searchParams.has("debug"));

  type CenterTab = "train" | "story" | "depths" | "settlement" | "items" | "achievements";

  let selectedSkill = $state<SkillId | null>(null);
  let centerTab = $state<CenterTab>("train");
  let achievementCount = $derived(Object.keys(game.state.achievements).length);
  let rightTab = $state<"inventory" | "shop">("inventory");
  let isCombatTab = $derived(centerTab === "story" || centerTab === "depths");

  // "items" is the Inventory/Shop sidebar folded into a tab for narrow screens,
  // so it is hidden where the sidebar is shown (lg and up).
  const TABS: { id: CenterTab; label: string; short: string; icon: string; combat?: boolean; narrowOnly?: boolean }[] = [
    { id: "train", label: "Train", short: "Train", icon: "⚒" },
    { id: "story", label: "Campaign", short: "Campaign", icon: "⚔", combat: true },
    { id: "depths", label: "The Abyss", short: "Abyss", icon: "🌀", combat: true },
    { id: "settlement", label: "Settlement", short: "Town", icon: "🏘" },
    { id: "items", label: "Items", short: "Items", icon: "🎒", narrowOnly: true },
    { id: "achievements", label: "Achievements", short: "Awards", icon: "🏆" },
  ];

  onMount(() => {
    document.documentElement.classList.add("dark");
    const wide = window.matchMedia("(min-width: 1024px)");
    const leaveItemsTab = () => {
      if (wide.matches && centerTab === "items") centerTab = "train";
    };
    wide.addEventListener("change", leaveItemsTab);
    const cleanup = game.init();

    const firstUnlocked = SKILL_ORDER.find(
      (id) => game.state.skills[id].unlocked,
    );
    if (firstUnlocked) selectedSkill = firstUnlocked;

    return () => {
      wide.removeEventListener("change", leaveItemsTab);
      cleanup();
    };
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

{#snippet itemsPanel()}
  <div class="flex shrink-0 border-b border-border">
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
{/snippet}

{#if !game.loaded}
  <div class="flex min-h-dvh items-center justify-center bg-background">
    <p class="text-muted-foreground">Loading…</p>
  </div>
{:else}
  <div class="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    <AgeDisplay
      ageIndex={game.ageIndex}
      ageBonus={game.ageBonus}
      skillPoints={game.state.skillPoints}
      warSpoils={game.state.gacha.gold}
      levels={game.levels}
      resources={game.state.resources}
      ageAdvanceStatus={game.ageAdvanceStatus}
      onAdvance={() => game.advanceAgeAction()}
      events={game.events}
      onDismissEvent={(id) => game.dismissEvent(id)}
    />

    {#if game.message}
      <div
        class="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-3 py-2 sm:px-6"
      >
        <p class="text-sm text-muted-foreground">{game.message}</p>
        <button
          class="-m-2 p-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Dismiss message"
          onclick={() => game.dismissMessage()}
        >
          ✕
        </button>
      </div>
    {/if}

    <div class="flex min-h-0 flex-1">
      <!-- Left: Skill panel (the Train tab shows it as a strip on phones) -->
      <SkillPanel
        class="hidden md:flex"
        state={game.state}
        levels={game.levels}
        {selectedSkill}
        onSelect={handleSelectSkill}
        events={game.events}
        onDismissEvent={(id) => game.dismissEvent(id)}
      />

      <!-- Center: Train / Combat -->
      <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div class="hidden shrink-0 overflow-x-auto whitespace-nowrap border-b border-border md:flex">
          {#each TABS as tab (tab.id)}
            <button
              class="px-4 py-2 text-sm font-medium transition-colors {centerTab ===
              tab.id
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'} {tab.narrowOnly ? 'lg:hidden' : ''}"
              onclick={() => (centerTab = tab.id)}
              title={tab.combat && !game.combatUnlocked ? "Unlocks in the Bronze Age" : undefined}
            >
              {tab.combat && !game.combatUnlocked ? "🔒 " : ""}{tab.label}
              {#if tab.id === "achievements"}
                <span class="ml-1 text-xs tabular-nums text-muted-foreground">
                  {achievementCount}/{ACHIEVEMENTS.length}
                </span>
              {/if}
            </button>
          {/each}
        </div>

        <div class="flex flex-1 flex-col overflow-y-auto {isCombatTab ? 'max-md:overflow-hidden' : ''}">
          {#if centerTab === "train"}
            <SkillPanel
              horizontal
              class="md:hidden"
              state={game.state}
              levels={game.levels}
              {selectedSkill}
              onSelect={handleSelectSkill}
              events={game.events}
              onDismissEvent={(id) => game.dismissEvent(id)}
            />
          {/if}
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
          {:else if isCombatTab && !game.combatUnlocked}
            <div class="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
              <p class="text-2xl">🔒</p>
              <p class="font-semibold">Unlocks in the Bronze Age</p>
              <p class="max-w-sm text-sm text-muted-foreground">
                Advance your civilization to raise an army. Reaching the Bronze Age opens the Campaign
                and The Abyss, and a 4★ hero joins your cause.
              </p>
            </div>
          {:else if centerTab === "story"}
            <div class="flex min-h-0 flex-1 flex-col p-2 sm:p-3">
              <CombatView {game} mode="story" />
            </div>
          {:else if centerTab === "depths"}
            <div class="flex min-h-0 flex-1 flex-col p-2 sm:p-3">
              <CombatView {game} mode="depths" />
            </div>
          {:else if centerTab === "settlement"}
            <SettlementView
              state={game.state}
              onBuy={(upgradeId) => game.buySettlementUpgradeAction(upgradeId)}
            />
          {:else if centerTab === "items"}
            <div class="flex min-h-0 flex-1 flex-col">
              {@render itemsPanel()}
            </div>
          {:else if centerTab === "achievements"}
            <AchievementsView state={game.state} levels={game.levels} />
          {/if}
        </div>
      </main>

      <!-- Right: Inventory / Shop -->
      {#if !isCombatTab}
        <aside class="hidden w-72 shrink-0 flex-col border-l border-border lg:flex">
          {@render itemsPanel()}
        </aside>
      {/if}
    </div>

    <!-- Phone navigation: thumb-reachable tabs along the bottom edge -->
    <nav
      aria-label="Sections"
      class="grid shrink-0 grid-cols-6 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {#each TABS as tab (tab.id)}
        {@const active = centerTab === tab.id}
        <button
          class="relative flex flex-col items-center gap-0.5 px-0.5 pt-2 pb-1.5 text-[10px] font-medium transition-colors {active
            ? 'text-foreground'
            : 'text-muted-foreground'}"
          aria-current={active ? "page" : undefined}
          onclick={() => (centerTab = tab.id)}
        >
          {#if active}<span class="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary"></span>{/if}
          <span class="text-base leading-none {active ? '' : 'opacity-70 grayscale'}" aria-hidden="true">
            {tab.combat && !game.combatUnlocked ? "🔒" : tab.icon}
          </span>
          <span class="truncate">{tab.short}</span>
          {#if game.state.gacha.battle && game.state.gacha.battleMode === tab.id}
            <span class="absolute top-1.5 right-1/4 size-1.5 rounded-full bg-amber-400" aria-label="Battle running"></span>
          {:else if tab.id === "train" && game.state.activeSkill}
            <span class="absolute top-1.5 right-1/4 size-1.5 rounded-full bg-green-500" aria-label="Training"></span>
          {/if}
        </button>
      {/each}
    </nav>
  </div>

  {#if game.pendingUnlocks.length > 0}
    {#key game.pendingUnlocks[0]}
      <SkillUnlockModal
        skillId={game.pendingUnlocks[0]}
        ageIndex={game.state.ageIndex}
        onDismiss={() => game.dismissUnlock()}
      />
    {/key}
  {/if}

  <GainToastStack
    events={game.events}
    onDismiss={(id) => game.dismissEvent(id)}
  />

  <AnimationOverlay
    events={game.events}
    onDismiss={(id) => game.dismissEvent(id)}
  />

  <AchievementToasts
    events={game.events}
    onDismiss={(id) => game.dismissEvent(id)}
  />

  {#if isDebug}
    <DebugPanel {game} />
  {/if}
{/if}
