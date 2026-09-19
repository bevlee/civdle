<script lang="ts">
  import {
    DEPTHS_TIER_SIZE,
    DEPTHS_SPOILS_PER_TIER,
    ENEMY_ARCHETYPES,
    GACHA_COST,
    MAX_ENEMY_LEVEL,
    PACK_COST,
    PARTY_SIZE,
    UNITS,
    isBossLevel,
  } from "$lib/combatData";
  import type { AttackType } from "$lib/combatData";
  import type { BattleMode, Fighter, Hit } from "$lib/combatEngine";
  import { isFrontRow, POSITIONS } from "$lib/position";
  import { activeSynergies, TRAIT_SYNERGIES } from "$lib/traits";
  import type { CivdleGame, SpoilsGainEventData } from "$lib/gameState.svelte";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import FloatingText from "./FloatingText.svelte";
  import { Button } from "$lib/components/ui/button";
  import UnitCard from "./UnitCard.svelte";
  import type { Pose } from "./Sprite.svelte";
  import DamagePopup from "./DamagePopup.svelte";
  import CombatProjectile from "./CombatProjectile.svelte";
  import EncounterPanel from "./EncounterPanel.svelte";
  import TutorialOverlay from "./TutorialOverlay.svelte";
  import ArmyInventory from "./ArmyInventory.svelte";
  import CardDetailModal from "./CardDetailModal.svelte";
  import CombatStatsPanel from "./CombatStatsPanel.svelte";
  import { cn } from "$lib/utils";

  let { game, mode }: { game: CivdleGame; mode: BattleMode } = $props();

  let gacha = $derived(game.state.gacha);
  // Only one battle runs at a time; the arena shows in the tab that started it.
  let battle = $derived(gacha.battleMode === mode ? gacha.battle : null);
  let otherBattleActive = $derived(gacha.battle !== null && gacha.battleMode !== mode);
  let isPlaying = $derived(battle?.status === "playing");
  let battleDone = $derived(battle !== null && battle.status !== "playing");
  let anyPlaying = $derived(game.inBattle);
  let partyCards = $derived(game.partyCards);
  let encounter = $derived(mode === "story" ? gacha.encounter : gacha.depths.encounter);
  let storyBoss = $derived(mode === "story" && isBossLevel(gacha.storyLevel));
  let depthsCleared = $derived(game.depthsCleared);
  let depthsIncome = $derived(game.depthsIncome);
  let nextTierAt = $derived((Math.floor(depthsCleared / DEPTHS_TIER_SIZE) + 1) * DEPTHS_TIER_SIZE);
  let canFight = $derived(
    !anyPlaying && !battle && !otherBattleActive && partyCards.length > 0 && !(mode === "story" && game.storyComplete),
  );
  let partyIds = $derived(new Set(gacha.party.filter((id): id is string => id !== null)));
  let partySlots = $derived(gacha.party.map((id) => (id ? gacha.cards.find((c) => c.id === id) ?? null : null)));
  let synergies = $derived(activeSynergies(partyCards));

  let playerFighters = $derived(battle?.fighters.filter((f) => !f.isEnemy) ?? []);
  let enemyFighters = $derived(battle?.fighters.filter((f) => f.isEnemy) ?? []);
  let recentLog = $derived(battle?.log.slice(-8) ?? []);

  let spoilsEvents = $derived(
    game.events.filter((e): e is QueuedEvent<SpoilsGainEventData> => e.type === "spoilsGain"),
  );

  let selectedCardId = $state<string | null>(null);
  let selectedCard = $derived(selectedCardId ? gacha.cards.find((c) => c.id === selectedCardId) ?? null : null);

  // ----- Per-turn animation state, driven by battle.turn -----
  interface Popup { id: string; targetId: string; hit?: Hit; heal?: number; isUltimate: boolean }
  interface Projectile { id: string; actorId: string; attackType: "ranged" | "magic"; fromEnemy: boolean }
  let popups = $state<Popup[]>([]);
  let projectiles = $state<Projectile[]>([]);
  let actingId = $state<string | null>(null);
  let actingKind = $state<"attack" | "ultimate" | null>(null);
  let actingAttackType = $state<AttackType | null>(null);
  let hitIds = $state<Set<string>>(new Set());
  let ultBanner = $state<{ name: string; key: number } | null>(null);
  let lastSeenTurn = -1;
  let popupCounter = 0;

  $effect(() => {
    const b = game.state.gacha.battleMode === mode ? game.state.gacha.battle : null;
    if (!b || !b.lastAction || b.turn === lastSeenTurn) {
      if (!b) lastSeenTurn = -1;
      return;
    }
    lastSeenTurn = b.turn;
    const action = b.lastAction;
    actingId = action.actorId;
    actingKind = action.kind;
    actingAttackType = action.attackType;
    hitIds = new Set(action.hits.map((h) => h.targetId));
    const fresh: Popup[] = action.hits.map((hit) => ({
      id: `p${++popupCounter}`,
      targetId: hit.targetId,
      hit,
      isUltimate: action.kind === "ultimate",
    }));
    if (action.healed > 0 || action.turnHeal > 0) {
      fresh.push({ id: `p${++popupCounter}`, targetId: action.actorId, heal: action.healed + action.turnHeal, isUltimate: false });
    }
    popups = [...popups, ...fresh];
    if (action.attackType !== "melee" && action.kind !== "ultimate") {
      const actor = b.fighters.find((f) => f.id === action.actorId);
      if (actor) {
        projectiles = [...projectiles, {
          id: `proj${++popupCounter}`,
          actorId: action.actorId,
          attackType: action.attackType as "ranged" | "magic",
          fromEnemy: actor.isEnemy,
        }];
      }
    }
    if (action.kind === "ultimate") {
      const actor = b.fighters.find((f) => f.id === action.actorId);
      ultBanner = { name: actor?.name ?? "", key: b.turn };
    }
    const clear = setTimeout(() => {
      actingId = null;
      actingKind = null;
      actingAttackType = null;
      hitIds = new Set();
    }, action.kind === "ultimate" ? 1300 : 600);
    return () => clearTimeout(clear);
  });

  function removePopup(id: string) {
    popups = popups.filter((p) => p.id !== id);
  }

  function removeProjectile(id: string) {
    projectiles = projectiles.filter((p) => p.id !== id);
  }

  function fighterClass(f: Fighter): string {
    if (f.hp <= 0) return "card-dead";
    if (actingId === f.id) {
      if (actingKind === "ultimate") return "card-ult";
      if (actingAttackType === "melee") return f.isEnemy ? "card-melee-left" : "card-melee-right";
      if (actingAttackType === "ranged") return "card-ranged";
      if (actingAttackType === "magic") return "card-magic";
      return f.isEnemy ? "card-lunge-left" : "card-lunge-right";
    }
    if (hitIds.has(f.id)) return "card-hit";
    return "";
  }

  function fighterPose(f: Fighter): Pose {
    if (f.hp <= 0) return "death";
    if (actingId === f.id) return "attack";
    if (hitIds.has(f.id)) return "hit";
    return "idle";
  }

  // ----- Drag and drop between party slots and the army inventory -----
  let draggingId = $state<string | null>(null);
  let dragOverSlot = $state<number | null>(null);
  let dragOverInventory = $state(false);
  let draggingFromParty = $derived(draggingId !== null && partyIds.has(draggingId));

  function startDrag(e: DragEvent, cardId: string) {
    if (anyPlaying || !e.dataTransfer) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", cardId);
    e.dataTransfer.effectAllowed = "move";
    draggingId = cardId;
  }

  function endDrag() {
    draggingId = null;
    dragOverSlot = null;
    dragOverInventory = false;
  }

  function slotDragOver(e: DragEvent, slot: number) {
    if (draggingId === null || anyPlaying) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    dragOverSlot = slot;
  }

  function slotDrop(e: DragEvent, slot: number) {
    e.preventDefault();
    const id = draggingId ?? e.dataTransfer?.getData("text/plain");
    if (id) game.assignCardToParty(id, slot);
    endDrag();
  }

  function inventoryDrop(cardId: string) {
    game.removeCardFromParty(cardId);
    endDrag();
  }

  function handleMerge(partnerId: string) {
    if (!selectedCardId) return;
    game.mergeCards(selectedCardId, partnerId);
    selectedCardId = null;
  }

  function handleDiscard() {
    if (!selectedCardId) return;
    const card = gacha.cards.find((c) => c.id === selectedCardId);
    if (card && confirm(`Discard ${card.stars}★ ${UNITS[card.unitId].name}?`)) {
      game.discardCard(selectedCardId);
      selectedCardId = null;
    }
  }
</script>

<div class="flex flex-col gap-3">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="relative flex items-center gap-1.5" title="Tribute — earned in the Main Story and from The Depths, spent on summons">
      <span class="text-lg">⚔</span>
      <span class="text-sm font-bold tabular-nums">{gacha.gold}</span>
      <span class="text-xs text-muted-foreground">Tribute</span>
      {#each spoilsEvents as event (event.id)}
        <FloatingText
          id={event.id}
          text={`+${event.data.amount} ⚔`}
          class="text-xs text-emerald-400"
          duration={900}
          onDone={(id) => game.dismissEvent(id)}
        />
      {/each}
    </div>

    {#if mode === "story"}
      <div class="flex items-center gap-2 text-sm">
        {#if game.storyComplete}
          <span class="font-medium text-yellow-300">Story complete — all {MAX_ENEMY_LEVEL} levels cleared</span>
        {:else}
          <span class="font-medium">Level {gacha.storyLevel}<span class="text-muted-foreground">/{MAX_ENEMY_LEVEL}</span></span>
          {#if storyBoss}
            <span class="rounded bg-red-500/25 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-red-300">BOSS</span>
          {/if}
          <span class="text-xs text-muted-foreground">Reward: +{gacha.storyLevel} ⚔</span>
        {/if}
      </div>
      <Button size="sm" disabled={!canFight} onclick={() => game.startStoryFight()}>
        ⚔ Fight
      </Button>
    {:else}
      <div class="flex items-center gap-2 text-sm">
        <span class="font-medium">Depth {gacha.depths.level}</span>
        <span
          class="text-xs text-muted-foreground"
          title={`Every ${DEPTHS_TIER_SIZE} depths cleared pays +${DEPTHS_SPOILS_PER_TIER} Tribute every 10 seconds`}
        >
          {#if depthsIncome > 0}
            +{depthsIncome} ⚔ / 10s
          {:else}
            No income yet
          {/if}
          · next tier at depth {nextTierAt}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <label class="flex cursor-pointer items-center gap-1.5 text-xs select-none">
          <input
            type="checkbox"
            checked={gacha.depths.auto}
            disabled={otherBattleActive || partyCards.length === 0}
            onchange={(e) => game.setDepthsAuto((e.currentTarget as HTMLInputElement).checked)}
          />
          Auto
        </label>
        <Button size="sm" disabled={!canFight} onclick={() => game.startDepthsFight()}>
          ⚔ Descend
        </Button>
      </div>
    {/if}
  </div>

  {#if otherBattleActive}
    <p class="rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
      A {gacha.battleMode === "story" ? "Main Story" : "Depths"} battle is in progress in the other tab.
    </p>
  {/if}

  <TutorialOverlay
    step={gacha.tutorialStep}
    onNext={() => game.advanceTutorial()}
    onSkip={() => game.skipTutorial()}
  />

  <!-- Arena -->
  {#if battle}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class={cn("relative overflow-hidden rounded-lg border border-border bg-muted/30 p-3", battleDone && !(mode === "depths" && gacha.depths.auto) && "cursor-pointer")}
      onclick={() => { if (battleDone && !(mode === "depths" && gacha.depths.auto)) game.dismissBattle(); }}
    >
      {#if ultBanner}
        {#key ultBanner.key}
          <div class="arena-flash pointer-events-none absolute inset-0 bg-orange-300"></div>
          <div class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div class="ult-banner rounded bg-black/70 px-6 py-2 text-center">
              <p class="text-3xl font-black tracking-widest text-orange-300 drop-shadow-[0_0_10px_rgba(251,146,60,0.9)]">ULTIMATE</p>
              <p class="text-xs font-semibold text-orange-100">{ultBanner.name}</p>
            </div>
          </div>
        {/key}
      {/if}

      <!-- Synergy bars -->
      <div class="mb-2 flex items-start justify-between gap-3">
        <div class="flex flex-wrap gap-1">
          {#each synergies.filter((s) => s.tier > 0) as s (s.trait)}
            <span class="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary" title={TRAIT_SYNERGIES[s.trait].tiers[s.tier - 1]}>
              {TRAIT_SYNERGIES[s.trait].name} {s.count}
            </span>
          {/each}
        </div>
        <div class="flex flex-wrap justify-end gap-1">
          {#if encounter}
            <span class="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] text-red-300">
              {ENEMY_ARCHETYPES[encounter.archetype].name}
            </span>
            {#if encounter.statMult && encounter.statMult > 1.005}
              <span class="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] text-red-300">
                +{Math.round((encounter.statMult - 1) * 100)}% stats
              </span>
            {/if}
          {/if}
          {#each activeSynergies(encounter?.cards ?? []).filter((s) => s.tier > 0) as s (s.trait)}
            <span class="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] text-red-300" title={TRAIT_SYNERGIES[s.trait].tiers[s.tier - 1]}>
              {TRAIT_SYNERGIES[s.trait].name} {s.count}
            </span>
          {/each}
        </div>
      </div>

      <!-- 5-position formation grid -->
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-1">
        {#each POSITIONS as pos}
          {@const playerF = playerFighters.find(f => f.position === pos)}
          {@const enemyF = enemyFighters.find(f => f.position === pos)}
          {@const front = isFrontRow(pos)}

          <!-- Player side -->
          <div class="flex items-center justify-end gap-1.5">
            {#if front}
              <span class="text-[9px] font-bold tracking-wider text-primary/60 uppercase">Front</span>
            {/if}
            {#if playerF}
              <div class={cn("relative rounded", front && "border-l-2 border-primary/50 pl-0.5", fighterClass(playerF))}>
                <UnitCard unitId={playerF.unitId} stars={playerF.stars} size="sm" hp={playerF.hp} maxHp={playerF.maxHp} pose={fighterPose(playerF)} animate={isPlaying} />
                {#each popups.filter((p) => p.targetId === playerF.id) as p (p.id)}
                  <DamagePopup id={p.id} hit={p.hit} heal={p.heal} isUltimate={p.isUltimate} onDone={removePopup} />
                {/each}
                {#each projectiles.filter((p) => p.actorId === playerF.id) as proj (proj.id)}
                  <CombatProjectile id={proj.id} attackType={proj.attackType} fromEnemy={false} onDone={removeProjectile} />
                {/each}
              </div>
            {:else}
              <div class="flex h-[4.5rem] w-20 items-center justify-center rounded border border-dashed border-border/40 text-[10px] text-muted-foreground/40">
                {pos}
              </div>
            {/if}
          </div>

          <!-- VS column -->
          {#if pos === 3}
            <span class="text-lg font-bold text-muted-foreground/50">VS</span>
          {:else}
            <div></div>
          {/if}

          <!-- Enemy side -->
          <div class="flex items-center gap-1.5">
            {#if enemyF}
              <div class={cn("relative rounded", front && "border-r-2 border-destructive/50 pr-0.5", fighterClass(enemyF))}>
                {#if encounter?.bossId === enemyF.id}
                  <span class="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded bg-red-600 px-1.5 text-[9px] font-black tracking-wider text-white shadow">BOSS</span>
                {/if}
                <UnitCard unitId={enemyF.unitId} stars={enemyF.stars} size="sm" hp={enemyF.hp} maxHp={enemyF.maxHp} pose={fighterPose(enemyF)} animate={isPlaying} flipSprite />
                {#each popups.filter((p) => p.targetId === enemyF.id) as p (p.id)}
                  <DamagePopup id={p.id} hit={p.hit} heal={p.heal} isUltimate={p.isUltimate} onDone={removePopup} />
                {/each}
                {#each projectiles.filter((p) => p.actorId === enemyF.id) as proj (proj.id)}
                  <CombatProjectile id={proj.id} attackType={proj.attackType} fromEnemy={true} onDone={removeProjectile} />
                {/each}
              </div>
            {:else}
              <div class="flex h-[4.5rem] w-20 items-center justify-center rounded border border-dashed border-border/40 text-[10px] text-muted-foreground/40">
                {pos}
              </div>
            {/if}
            {#if front}
              <span class="text-[9px] font-bold tracking-wider text-red-400/60 uppercase">Front</span>
            {/if}
          </div>
        {/each}
      </div>

      <div class="mt-2">
        <CombatStatsPanel {playerFighters} {enemyFighters} />
      </div>

      <div class="mt-2 max-h-24 overflow-y-auto rounded border border-border/30 bg-background/30 p-1.5 text-[11px] leading-relaxed">
        {#each recentLog as entry, i (i)}
          <p
            class={entry.type === "ultimate"
              ? "font-semibold text-orange-300"
              : entry.type === "death"
                ? "text-red-400"
                : entry.type === "info"
                  ? "text-yellow-400"
                  : "text-muted-foreground"}
          >
            {entry.text}
          </p>
        {/each}
      </div>

      {#if battleDone}
        <div class="mt-2 flex items-center justify-between">
          {#if battle.status === "won" && mode === "story"}
            <span class="text-sm font-semibold text-green-400">
              {storyBoss ? "Boss defeated!" : "Victory!"} +{gacha.storyLevel} Tribute
            </span>
          {:else if battle.status === "won"}
            <span class="text-sm font-semibold text-green-400">
              Depth {gacha.depths.level} cleared{(gacha.depths.level) % DEPTHS_TIER_SIZE === 0 ? ` — income rises to +${depthsIncome + DEPTHS_SPOILS_PER_TIER} ⚔ / 10s` : ""}
            </span>
          {:else}
            <span class="text-sm font-semibold text-red-400">Defeated — the same army awaits. Change your composition.</span>
          {/if}
          {#if mode === "depths" && gacha.depths.auto}
            <span class="text-xs text-muted-foreground">Auto: continuing…</span>
          {:else}
            <span class="text-xs text-muted-foreground">Click anywhere to continue</span>
          {/if}
        </div>
      {/if}
    </div>
  {:else if encounter}
    <EncounterPanel
      {encounter}
      {partyCards}
      {mode}
    />
  {:else if mode === "story" && game.storyComplete}
    <div class="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
      You have conquered the Main Story. The Depths await.
    </div>
  {/if}

  <!-- Party -->
  <div>
    <div class="mb-1.5 flex flex-wrap items-center gap-2">
      <h3 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Party</h3>
      {#each synergies as s (s.trait)}
        <span
          class={cn(
            "rounded px-1.5 py-0.5 text-[10px]",
            s.tier === 2 && "bg-yellow-500/25 text-yellow-300",
            s.tier === 1 && "bg-primary/20 text-primary",
            s.tier === 0 && "bg-muted text-muted-foreground",
          )}
          title={s.tier > 0 ? TRAIT_SYNERGIES[s.trait].tiers[s.tier - 1] : `Need ${s.nextThreshold} for: ${TRAIT_SYNERGIES[s.trait].tiers[0]}`}
        >
          {TRAIT_SYNERGIES[s.trait].name} {s.count}{s.nextThreshold ? `/${s.nextThreshold}` : " ✓"}
        </span>
      {/each}
    </div>
    <div class="grid grid-cols-5 gap-2">
      {#each partySlots as card, i (i)}
        {@const posNum = i + 1}
        {@const front = posNum === 2 || posNum === 4}
        {@const isOver = dragOverSlot === i && draggingId !== null && draggingId !== card?.id}
        <div
          role="group"
          aria-label={`Party slot ${posNum}`}
          class={cn("flex flex-col items-center rounded-lg transition-shadow", isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
          ondragover={(e) => slotDragOver(e, i)}
          ondragenter={(e) => slotDragOver(e, i)}
          ondragleave={() => (dragOverSlot === i ? (dragOverSlot = null) : null)}
          ondrop={(e) => slotDrop(e, i)}
        >
          <span class={cn("mb-0.5 text-[9px] font-bold tracking-wider uppercase", front ? "text-primary" : "text-muted-foreground/60")}>
            {front ? "Front" : "Back"}
          </span>
          {#if card}
            <button
              class={cn(
                "rounded-lg transition-transform hover:scale-105 disabled:cursor-not-allowed",
                !anyPlaying && "cursor-grab active:cursor-grabbing",
                draggingId === card.id && "opacity-40",
              )}
              disabled={anyPlaying}
              draggable={!anyPlaying}
              ondragstart={(e) => startDrag(e, card.id)}
              ondragend={endDrag}
              onclick={() => (selectedCardId = card.id)}
              title="Click for details, drag to move"
            >
              <UnitCard unitId={card.unitId} stars={card.stars} size="sm" showTraits />
            </button>
          {:else}
            <div
              class={cn(
                "flex w-24 flex-col items-center justify-center rounded-lg border border-dashed py-6 text-xs",
                isOver ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground/60",
              )}
            >
              <span class="text-lg">+</span>
              <span>{isOver ? "Drop here" : `Pos ${posNum}`}</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <ArmyInventory
    cards={gacha.cards}
    {partyIds}
    gold={gacha.gold}
    rollCost={GACHA_COST}
    packCost={PACK_COST}
    maxStars={game.maxSummonStars}
    locked={anyPlaying}
    {draggingId}
    dropActive={draggingFromParty}
    dragOver={dragOverInventory}
    onDragStart={startDrag}
    onDragEnd={endDrag}
    onDragOverChange={(over) => (dragOverInventory = over)}
    onDrop={inventoryDrop}
    onSelect={(id) => (selectedCardId = id)}
    onSummon={() => game.rollCard()}
    onOpenPack={() => game.rollPack()}
  />
</div>

{#if selectedCard}
  <CardDetailModal
    card={selectedCard}
    inParty={partyIds.has(selectedCard.id)}
    partyFull={partyIds.size >= PARTY_SIZE}
    mergePartners={game.mergePartnersFor(selectedCard.id)}
    locked={anyPlaying}
    onAddToParty={() => game.addCardToFirstEmptySlot(selectedCard!.id)}
    onRemoveFromParty={() => game.removeCardFromParty(selectedCard!.id)}
    onMerge={handleMerge}
    onDiscard={handleDiscard}
    onClose={() => (selectedCardId = null)}
  />
{/if}
