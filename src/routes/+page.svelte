<script lang="ts">
  import { onMount } from "svelte";
  import { CivdleGame } from "$lib/gameState.svelte";
  import { AGES, SKILL_ORDER, SKILLS, type SkillId } from "$lib/gameData";
  import AgeDisplay from "$lib/components/AgeDisplay.svelte";
  import PhoneHeader from "$lib/components/mobile/PhoneHeader.svelte";
  import AgeSheet from "$lib/components/mobile/AgeSheet.svelte";
  import SkillPicker from "$lib/components/mobile/SkillPicker.svelte";
  import ActionBar from "$lib/components/mobile/ActionBar.svelte";
  import NowPlaying from "$lib/components/mobile/NowPlaying.svelte";
  import { ageChecklist, checklistProgress } from "$lib/view/ageChecklist";
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
  import { ACHIEVEMENTS, unlockedCount } from "$lib/achievements";
  import { OverlayQueue } from "$lib/view/overlayQueue.svelte";
  import DebugPanel from "$lib/components/DebugPanel.svelte";
  import { page } from "$app/state";
  import type { BattleMode } from "$lib/combatEngine";

  const game = new CivdleGame();

  // One popup at a time: age advance, then a new-skill sheet, then one grouped achievements toast.
  const overlays = new OverlayQueue();
  $effect(() => overlays.sync(game.pendingUnlocks, game.events));
  let overlay = $derived(overlays.current);
  let ageOverlayEvent = $derived(overlay?.kind === "ageAdvance" ? overlay.event : null);
  // Summon reveals are modal too; the sheet and toast wait for them to finish.
  let revealOpen = $derived(
    game.events.some((e) => e.type === "summon" || e.type === "summonPack" || e.type === "starUp"),
  );

  let isDebug = $derived(page.url.searchParams.has("debug"));

  type CenterTab = "train" | "battle" | "settlement" | "items" | "achievements";

  let selectedSkill = $state<SkillId | null>(null);
  let centerTab = $state<CenterTab>("train");
  let achievementCount = $derived(unlockedCount(game.state));
  let rightTab = $state<"inventory" | "shop">("inventory");
  let isCombatTab = $derived(centerTab === "battle");

  // Campaign and The Abyss share the Battle tab. It turns to a mode when a battle
  // starts there, so it opens on the fight that is running, but either mode can
  // still be viewed (the other one says a battle is running elsewhere).
  let battleMode = $state<BattleMode>("story");
  let battleActive = $derived(game.state.gacha.battle !== null);
  // Plain, not state: only a change of the running mode should move the tab.
  let lastRunningMode: BattleMode | null = null;
  $effect(() => {
    const running = game.state.gacha.battleMode;
    if (running && running !== lastRunningMode) battleMode = running;
    lastRunningMode = running;
  });

  const BATTLE_MODES: { id: BattleMode; label: string }[] = [
    { id: "story", label: "Campaign" },
    { id: "depths", label: "The Abyss" },
  ];

  // "items" is the Inventory/Shop sidebar folded into a tab for narrow screens,
  // so it is hidden where the sidebar is shown (lg and up).
  const TABS: { id: CenterTab; label: string; icon: string; combat?: boolean; narrowOnly?: boolean }[] = [
    { id: "train", label: "Train", icon: "⚒" },
    { id: "battle", label: "Battle", icon: "⚔", combat: true },
    { id: "settlement", label: "Town", icon: "🏘" },
    { id: "items", label: "Items", icon: "🎒", narrowOnly: true },
    { id: "achievements", label: "Achievements", icon: "🏆" },
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
      overlays.destroy();
      cleanup();
    };
  });

  function handleSelectSkill(id: SkillId) {
    selectedSkill = id;
    centerTab = "train";
  }

  // Which recipe the Train tab shows per skill. Viewing never changes training;
  // it defaults to the skill's selected (last trained) recipe.
  let viewedRecipe = $state<Partial<Record<SkillId, string>>>({});
  const viewedRecipeOf = (id: SkillId) =>
    viewedRecipe[id] ?? game.state.skills[id].selectedRecipeId;
  let viewedRecipeId = $derived(selectedSkill ? viewedRecipeOf(selectedSkill) : null);

  function viewRecipe(id: SkillId, recipeId: string) {
    viewedRecipe = { ...viewedRecipe, [id]: recipeId };
  }

  // Jump chips and "Back" open a skill, on a given recipe when there is one (the
  // phone picker follows).
  function openRecipe(id: SkillId, recipeId: string | null) {
    if (recipeId) viewRecipe(id, recipeId);
    handleSelectSkill(id);
  }

  function handleStartTraining() {
    if (!selectedSkill || !viewedRecipeId) return;
    game.startTraining(selectedSkill, viewedRecipeId);
  }

  function handleStopTraining() {
    game.stopTraining();
  }

  // Phone header and age sheet.
  let ageSheetOpen = $state(false);
  let ageItems = $derived(
    ageChecklist({
      ageAdvanceStatus: game.ageAdvanceStatus,
      levels: game.levels,
      unlocked: (id) => game.state.skills[id].unlocked,
      resources: game.state.resources,
    }),
  );
  let ageProgress = $derived(checklistProgress(ageItems));

  // Bumped when the header opens the training skill, so the phone picker reopens
  // its group even when that skill was already selected.
  let revealNonce = $state(0);

  function openTraining() {
    const active = game.state.activeSkill;
    if (active) openRecipe(active, game.state.skills[active].selectedRecipeId);
    centerTab = "train";
    revealNonce += 1;
  }

  let highlightedResources = $derived.by(() => {
    if (!selectedSkill) return undefined;
    const def = SKILLS[selectedSkill];
    const recipe = def.recipes.find((r) => r.id === viewedRecipeId);
    if (!recipe) return undefined;
    return new Set([
      ...recipe.inputs.map((i) => i.resource),
      ...recipe.outputs.map((o) => o.resource),
    ]);
  });

  function startUnlockedSkill(id: SkillId, recipeId: string) {
    game.startTraining(id, recipeId);
    openRecipe(id, recipeId);
    game.dismissUnlock();
  }

  function dismissAchievementToast() {
    for (const id of overlays.dismissAchievements()) game.dismissEvent(id);
  }
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
  <!-- Side insets for notched phones in landscape (which get the md layout); the
       phone nav pads the bottom itself, so only md and up pad it here. -->
  <div
    class="flex h-dvh flex-col overflow-hidden bg-background pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-foreground md:pb-[env(safe-area-inset-bottom)]"
  >
    <PhoneHeader
      class="md:hidden"
      ageName={AGES[game.ageIndex].name}
      nextAgeName={game.ageAdvanceStatus.nextAge?.name ?? null}
      met={ageProgress.met}
      total={ageProgress.total}
      activeSkill={game.state.activeSkill}
      level={game.state.activeSkill ? game.levels[game.state.activeSkill] : 0}
      xp={game.state.activeSkill ? game.state.skills[game.state.activeSkill].xp : 0}
      onOpenAge={() => (ageSheetOpen = true)}
      onOpenTrain={openTraining}
      onStop={handleStopTraining}
    />
    <!-- Hidden rather than removed on phones: its floating texts dismiss their queued events. -->
    <div class="hidden md:contents">
      <AgeDisplay
        ageIndex={game.ageIndex}
        ageBonus={game.ageBonus}
        skillPoints={game.state.skillPoints}
        warSpoils={game.state.gacha.gold}
        checklist={ageItems}
        ageAdvanceStatus={game.ageAdvanceStatus}
        onAdvance={() => game.advanceAgeAction()}
        events={game.events}
        ageEvent={ageOverlayEvent}
        onDismissEvent={(id) => game.dismissEvent(id)}
      />
    </div>

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
      <!-- Left: Skill panel (phones use the SkillPicker on the Train tab) -->
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
            <SkillPicker
              class="md:hidden"
              state={game.state}
              levels={game.levels}
              {selectedSkill}
              {revealNonce}
              onSelect={handleSelectSkill}
            />
          {/if}
          {#if centerTab === "train" && selectedSkill && viewedRecipeId}
            <TrainingView
              skillId={selectedSkill}
              {viewedRecipeId}
              state={game.state}
              levels={game.levels}
              level={game.levels[selectedSkill]}
              ageIndex={game.ageIndex}
              progress={game.displayProgress}
              events={game.events}
              onStart={handleStartTraining}
              onStop={handleStopTraining}
              onBack={openTraining}
              onViewRecipe={(recipeId) => viewRecipe(selectedSkill!, recipeId)}
              onJump={openRecipe}
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
          {:else if centerTab === "battle"}
            <div class="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">
              <div
                role="group"
                aria-label="Battle mode"
                class="grid shrink-0 grid-cols-2 gap-1 self-center rounded-full border border-border bg-card p-1"
              >
                {#each BATTLE_MODES as m (m.id)}
                  <button
                    class="min-h-9 rounded-full px-4 text-sm font-medium transition-colors {battleMode ===
                    m.id
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground'}"
                    aria-pressed={battleMode === m.id}
                    onclick={() => (battleMode = m.id)}
                  >
                    {m.label}
                  </button>
                {/each}
              </div>
              <CombatView {game} mode={battleMode} />
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

    <!-- Phone training controls, above the nav and never over the content -->
    {#if centerTab === "train" && selectedSkill && viewedRecipeId}
      <ActionBar
        class="md:hidden"
        skillId={selectedSkill}
        recipeId={viewedRecipeId}
        state={game.state}
        level={game.levels[selectedSkill]}
        ageIndex={game.ageIndex}
        progress={game.displayProgress}
        events={game.events}
        onTrain={handleStartTraining}
        onStop={handleStopTraining}
        onBack={openTraining}
      />
    {/if}

    <!-- Phone: what is training, one tap from any other tab -->
    {#if centerTab !== "train" && game.state.activeSkill}
      <NowPlaying
        class="md:hidden"
        skillId={game.state.activeSkill}
        level={game.levels[game.state.activeSkill]}
        startedAt={game.state.trainingStartedAt}
        progress={game.displayProgress}
        onOpen={openTraining}
        onStop={handleStopTraining}
      />
    {/if}

    <!-- Phone navigation: thumb-reachable tabs along the bottom edge -->
    <nav
      aria-label="Sections"
      class="grid shrink-0 grid-cols-5 border-t border-border bg-background pt-1.5 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {#each TABS as tab (tab.id)}
        {@const active = centerTab === tab.id}
        {@const dot =
          tab.id === "train" && game.state.activeSkill
            ? { color: "bg-green-500", label: "training" }
            : tab.id === "battle" && battleActive
              ? { color: "bg-amber-400", label: "battle running" }
              : null}
        <button
          class="flex min-h-13 min-w-0 flex-col items-center gap-1 px-0.5 pt-0.5 pb-1 text-[11px] font-semibold tracking-[-0.01em] transition-colors {active
            ? 'text-foreground'
            : 'text-muted-foreground'}"
          aria-current={active ? "page" : undefined}
          onclick={() => (centerTab = tab.id)}
        >
          <span
            class="relative flex h-7 w-11 items-center justify-center rounded-full text-lg leading-none transition-colors duration-200 {active
              ? 'bg-accent'
              : ''}"
            aria-hidden="true"
          >
            <span class={active ? "" : "opacity-70 grayscale"}>
              {tab.combat && !game.combatUnlocked ? "🔒" : tab.icon}
            </span>
            {#if dot}
              <span class="absolute -top-0.5 -right-0.5 size-2 rounded-full border-2 border-background box-content {dot.color}"></span>
            {/if}
          </span>
          <!-- "Achievements" is the longest label; a touch smaller, it fits a 375px-wide phone. -->
          <span class="max-w-full truncate {tab.id === 'achievements' ? 'text-[10.5px] tracking-tight' : ''}">{tab.label}</span>
          {#if dot}<span class="sr-only">({dot.label})</span>{/if}
        </button>
      {/each}
    </nav>
  </div>

  {#if overlay?.kind === "skillUnlock" && !revealOpen}
    {@const skillId = overlay.skillId}
    {#key skillId}
      <SkillUnlockModal
        {skillId}
        level={game.levels[skillId]}
        onStart={(recipeId) => startUnlockedSkill(skillId, recipeId)}
        onLater={() => game.dismissUnlock()}
      />
    {/key}
  {/if}

  <AgeSheet
    open={ageSheetOpen}
    onClose={() => (ageSheetOpen = false)}
    nextAge={game.ageAdvanceStatus.nextAge}
    checklist={ageItems}
    canAdvance={game.ageAdvanceStatus.canAdvance}
    onAdvance={() => game.advanceAgeAction()}
  />

  <!-- Desktop only: phones show gains in the action bar. Hidden rather than removed,
       since the toasts dismiss their events. -->
  <div class="hidden md:contents">
    <GainToastStack
      events={game.events}
      onDismiss={(id) => game.dismissEvent(id)}
    />
  </div>

  <AnimationOverlay
    events={game.events}
    ageEvent={ageOverlayEvent}
    onDismiss={(id) => game.dismissEvent(id)}
  />

  <AchievementToasts
    overlay={overlay?.kind === "achievements" && !revealOpen ? overlay : null}
    onOpen={() => {
      centerTab = "achievements";
      dismissAchievementToast();
    }}
    onDismiss={dismissAchievementToast}
  />

  {#if isDebug}
    <DebugPanel {game} />
  {/if}
{/if}
