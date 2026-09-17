<script lang="ts">
  import { ENEMY_ARCHETYPES, GACHA_COST, PACK_COST, PARTY_SIZE, UNITS } from "$lib/combatData";
  import type { Fighter, Hit } from "$lib/combatEngine";
  import { activeSynergies, TRAIT_SYNERGIES } from "$lib/traits";
  import type { CivdleGame } from "$lib/gameState.svelte";
  import { Button } from "$lib/components/ui/button";
  import UnitCard from "./UnitCard.svelte";
  import type { Pose } from "./Sprite.svelte";
  import DamagePopup from "./DamagePopup.svelte";
  import EncounterPanel from "./EncounterPanel.svelte";
  import ArmyInventory from "./ArmyInventory.svelte";
  import CardDetailModal from "./CardDetailModal.svelte";
  import { cn } from "$lib/utils";

  let { game }: { game: CivdleGame } = $props();

  let gacha = $derived(game.state.gacha);
  let battle = $derived(gacha.battle);
  let isPlaying = $derived(battle?.status === "playing");
  let battleDone = $derived(battle !== null && battle.status !== "playing");
  let partyCards = $derived(game.partyCards);
  let partyIds = $derived(new Set(gacha.party.filter((id): id is string => id !== null)));
  let partySlots = $derived(gacha.party.map((id) => (id ? gacha.cards.find((c) => c.id === id) ?? null : null)));
  let synergies = $derived(activeSynergies(partyCards));

  let playerFighters = $derived(battle?.fighters.filter((f) => !f.isEnemy) ?? []);
  let enemyFighters = $derived(battle?.fighters.filter((f) => f.isEnemy) ?? []);
  let recentLog = $derived(battle?.log.slice(-8) ?? []);

  let selectedCardId = $state<string | null>(null);
  let selectedCard = $derived(selectedCardId ? gacha.cards.find((c) => c.id === selectedCardId) ?? null : null);

  // ----- Per-turn animation state, driven by battle.turn -----
  interface Popup { id: string; targetId: string; hit?: Hit; heal?: number; isUltimate: boolean }
  let popups = $state<Popup[]>([]);
  let actingId = $state<string | null>(null);
  let actingKind = $state<"attack" | "ultimate" | null>(null);
  let hitIds = $state<Set<string>>(new Set());
  let ultBanner = $state<{ name: string; key: number } | null>(null);
  let lastSeenTurn = -1;
  let popupCounter = 0;

  $effect(() => {
    const b = game.state.gacha.battle;
    if (!b || !b.lastAction || b.turn === lastSeenTurn) {
      if (!b) lastSeenTurn = -1;
      return;
    }
    lastSeenTurn = b.turn;
    const action = b.lastAction;
    actingId = action.actorId;
    actingKind = action.kind;
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
    if (action.kind === "ultimate") {
      const actor = b.fighters.find((f) => f.id === action.actorId);
      ultBanner = { name: actor?.name ?? "", key: b.turn };
    }
    const clear = setTimeout(() => {
      actingId = null;
      actingKind = null;
      hitIds = new Set();
    }, action.kind === "ultimate" ? 1300 : 600);
    return () => clearTimeout(clear);
  });

  function removePopup(id: string) {
    popups = popups.filter((p) => p.id !== id);
  }

  function fighterClass(f: Fighter): string {
    if (f.hp <= 0) return "card-dead";
    if (actingId === f.id) {
      if (actingKind === "ultimate") return "card-ult";
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
    if (isPlaying || !e.dataTransfer) {
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
    if (draggingId === null || isPlaying) return;
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
    <div class="flex items-center gap-1.5" title="War Spoils — earned by winning battles, spent on summons">
      <span class="text-lg">⚔</span>
      <span class="text-sm font-bold tabular-nums">{gacha.gold}</span>
      <span class="text-xs text-muted-foreground">War Spoils</span>
    </div>

    <div class="flex items-center gap-1">
      <button
        class="rounded px-1.5 py-0.5 text-xs hover:bg-accent disabled:opacity-30"
        disabled={isPlaying || gacha.enemyLevel <= 1}
        onclick={() => game.setEnemyLevel(gacha.enemyLevel - 1)}
      >◄</button>
      <span class="min-w-[6rem] text-center text-sm font-medium">
        Level {gacha.enemyLevel}/{gacha.maxEnemyLevel}
      </span>
      <button
        class="rounded px-1.5 py-0.5 text-xs hover:bg-accent disabled:opacity-30"
        disabled={isPlaying || gacha.enemyLevel >= gacha.maxEnemyLevel}
        onclick={() => game.setEnemyLevel(gacha.enemyLevel + 1)}
      >►</button>
    </div>

    <Button size="sm" disabled={isPlaying || battleDone || partyCards.length === 0} onclick={() => game.startFight()}>
      ⚔ Fight
    </Button>
  </div>

  <!-- Arena -->
  {#if battle}
    <div class="relative overflow-hidden rounded-lg border border-border bg-muted/30 p-3">
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

      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <div class="flex flex-wrap gap-1">
            {#each synergies.filter((s) => s.tier > 0) as s (s.trait)}
              <span class="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary" title={TRAIT_SYNERGIES[s.trait].tiers[s.tier - 1]}>
                {TRAIT_SYNERGIES[s.trait].name} {s.count}
              </span>
            {/each}
          </div>
          <div class="flex flex-wrap gap-2">
            {#each playerFighters as f (f.id)}
              <div class={cn("relative", fighterClass(f))}>
                <UnitCard unitId={f.unitId} stars={f.stars} size="sm" hp={f.hp} maxHp={f.maxHp} pose={fighterPose(f)} animate={isPlaying} />
                {#each popups.filter((p) => p.targetId === f.id) as p (p.id)}
                  <DamagePopup id={p.id} hit={p.hit} heal={p.heal} isUltimate={p.isUltimate} onDone={removePopup} />
                {/each}
              </div>
            {/each}
          </div>
        </div>

        <span class="mt-8 text-lg font-bold text-muted-foreground/50">VS</span>

        <div class="flex flex-col items-end gap-1">
          <div class="flex flex-wrap justify-end gap-1">
            {#if gacha.encounter}
              <span class="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] text-red-300">
                {ENEMY_ARCHETYPES[gacha.encounter.archetype].name}
              </span>
            {/if}
            {#each activeSynergies(gacha.encounter?.cards ?? []).filter((s) => s.tier > 0) as s (s.trait)}
              <span class="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] text-red-300" title={TRAIT_SYNERGIES[s.trait].tiers[s.tier - 1]}>
                {TRAIT_SYNERGIES[s.trait].name} {s.count}
              </span>
            {/each}
          </div>
          <div class="flex flex-wrap justify-end gap-2">
            {#each enemyFighters as f (f.id)}
              <div class={cn("relative", fighterClass(f))}>
                <UnitCard unitId={f.unitId} stars={f.stars} size="sm" hp={f.hp} maxHp={f.maxHp} pose={fighterPose(f)} animate={isPlaying} />
                {#each popups.filter((p) => p.targetId === f.id) as p (p.id)}
                  <DamagePopup id={p.id} hit={p.hit} heal={p.heal} isUltimate={p.isUltimate} onDone={removePopup} />
                {/each}
              </div>
            {/each}
          </div>
        </div>
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
          {#if battle.status === "won"}
            <span class="text-sm font-semibold text-green-400">Victory! +{gacha.enemyLevel} War Spoils</span>
          {:else}
            <span class="text-sm font-semibold text-red-400">Defeated — the same army awaits. Change your composition.</span>
          {/if}
          <Button size="sm" variant="outline" onclick={() => game.dismissBattle()}>Continue</Button>
        </div>
      {/if}
    </div>
  {:else if gacha.encounter}
    <EncounterPanel
      encounter={gacha.encounter}
      {partyCards}
      tutorialSeen={gacha.tutorialSeen}
      onDismissTutorial={() => game.markTutorialSeen()}
    />
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
    <div class="flex gap-2">
      {#each partySlots as card, i (i)}
        {@const isOver = dragOverSlot === i && draggingId !== null && draggingId !== card?.id}
        <div
          role="group"
          aria-label={`Party slot ${i + 1}`}
          class={cn("rounded-lg transition-shadow", isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
          ondragover={(e) => slotDragOver(e, i)}
          ondragenter={(e) => slotDragOver(e, i)}
          ondragleave={() => (dragOverSlot === i ? (dragOverSlot = null) : null)}
          ondrop={(e) => slotDrop(e, i)}
        >
          {#if card}
            <button
              class={cn(
                "rounded-lg transition-transform hover:scale-105 disabled:cursor-not-allowed",
                !isPlaying && "cursor-grab active:cursor-grabbing",
                draggingId === card.id && "opacity-40",
              )}
              disabled={isPlaying}
              draggable={!isPlaying}
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
              <span>{isOver ? "Drop here" : `Slot ${i + 1}`}</span>
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
    locked={isPlaying}
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
    locked={isPlaying}
    onAddToParty={() => game.addCardToFirstEmptySlot(selectedCard!.id)}
    onRemoveFromParty={() => game.removeCardFromParty(selectedCard!.id)}
    onMerge={handleMerge}
    onDiscard={handleDiscard}
    onClose={() => (selectedCardId = null)}
  />
{/if}
