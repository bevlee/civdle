<script lang="ts">
  import { syncBattleAnimations, type BattleSpeed } from "$lib/battlePlayback";
  import { tick, untrack } from "svelte";
  import { attackMotion, blinkDistance, projectilePath, timeline } from "$lib/combatAnimation";
  import { DEPTHS_SPOILS_PER_TIER, DEPTHS_TIER_SIZE, FACTIONS, GACHA_COST, MAX_ENEMY_LEVEL, PACK_COST, PARTY_SIZE, ULTIMATES, UNITS, isBossLevel, regionForLevel, type AttackType, type UnitCard } from "$lib/combatData";
  import { LEGENDARY_PACK_COST } from "$lib/gameState.svelte";
  import type { BattleMode, BattleState, Fighter, Hit } from "$lib/combatEngine";
  import { isFrontRow, POSITIONS } from "$lib/position";
  import type { CivdleGame } from "$lib/gameState.svelte";
  import { Button } from "$lib/components/ui/button";
  import BattleUnit from "./BattleUnit.svelte";
  import ArmySynergies from "./ArmySynergies.svelte";
  import type { Pose } from "./Sprite.svelte";
  import DamagePopup from "./DamagePopup.svelte";
  import CombatProjectile from "./CombatProjectile.svelte";
  import TutorialOverlay from "./TutorialOverlay.svelte";
  import ArmyInventory from "./ArmyInventory.svelte";
  import CardDetailModal from "./CardDetailModal.svelte";
  import CombatStatsPanel from "./CombatStatsPanel.svelte";

  let { game, mode }: { game: CivdleGame; mode: BattleMode } = $props();
  let gacha = $derived(game.state.gacha);
  let battle = $derived(gacha.battleMode === mode ? gacha.battle : null);
  let otherBattleActive = $derived(gacha.battle !== null && gacha.battleMode !== mode);
  let isPlaying = $derived(battle?.status === "playing");
  let battleDone = $derived(battle !== null && battle.status !== "playing");
  let formationLocked = $derived(gacha.battle !== null);
  let partyCards = $derived(game.partyCards);
  let partySlots = $derived(game.partySlots);
  let partyIds = $derived(new Set(gacha.party.filter((id): id is string => id !== null)));
  let encounter = $derived(mode === "story" ? gacha.encounter : gacha.depths.encounter);
  let storyBoss = $derived(mode === "story" && isBossLevel(gacha.storyLevel));
  let nextTierAt = $derived((Math.floor(game.depthsCleared / DEPTHS_TIER_SIZE) + 1) * DEPTHS_TIER_SIZE);
  let canFight = $derived(!formationLocked && partyCards.length > 0 && !(mode === "story" && game.storyComplete));
  let pendingImpact = $state(false);
  let beforeImpact = $state<Fighter[]>([]);
  let displayedFighters = $derived(pendingImpact ? beforeImpact : battle?.fighters ?? []);
  let playerFighters = $derived(displayedFighters.filter(f => !f.isEnemy));
  let enemyFighters = $derived(displayedFighters.filter(f => f.isEnemy));
  let stage: HTMLDivElement;
  let animationKey = $state(0);
  let movement = $state(60);
  let lastBattle = $state<BattleState | null>(null);
  let report = $derived(battle ?? lastBattle);
  let showHelp = $state(false);
  let selectedCardId = $state<string | null>(null);
  let selectedCard = $derived(gacha.cards.find(c => c.id === selectedCardId) ?? null);
  let selectedSlot = $state<number | null>(null);
  let placingCardId = $state<string | null>(null);
  let inspectedEnemy = $state<UnitCard | null>(null);
  let draggingId = $state<string | null>(null);
  let dragOverSlot = $state<number | null>(null);
  let dragOverInventory = $state(false);
  let draggingFromParty = $derived(draggingId !== null && partyIds.has(draggingId));
  let draggedCard = $derived(gacha.cards.find(c => c.id === draggingId) ?? null);
  let logElement: HTMLDivElement;

  interface Popup { id: string; targetId: string; hit?: Hit; heal?: number; isUltimate: boolean }
  interface Projectile { id: string; attackType: "ranged" | "magic"; ultimate: boolean; x: number; y: number; dx: number; dy: number; angle: number }
  let popups = $state<Popup[]>([]);
  let projectiles = $state<Projectile[]>([]);
  let actingId = $state<string | null>(null);
  let actingKind = $state<"attack" | "ultimate" | null>(null);
  let hitIds = $state<Set<string>>(new Set());
  let ultBanner = $state<{ name: string; type: AttackType; key: number } | null>(null);
  let popupCounter = 0;

  $effect(() => {
    const b = battle;
    const previous = untrack(() => lastBattle);
    if (b) lastBattle = b;
    actingId = null;
    hitIds = new Set();
    projectiles = [];
    ultBanner = null;
    pendingImpact = false;
    if (!b?.lastAction) { popups = []; return; }
    const action = b.lastAction;
    const actor = b.fighters.find(f => f.id === action.actorId);
    if (!actor) return;
    const ultimate = action.kind === "ultimate";
    const duration = ultimate ? timeline.ultimateMs : timeline.attackMs;
    beforeImpact = previous?.fighters ?? b.fighters;
    pendingImpact = true;
    animationKey = b.turn;
    actingKind = action.kind;
    let cancelled = false;
    let impact: (() => void) | undefined;
    let clear: (() => void) | undefined;

    // Measure stationary slots after the formation has rendered, before the blink.
    tick().then(() => {
      if (cancelled) return;
      const bounds = stage.getBoundingClientRect();
      movement = blinkDistance(bounds.width, false);
      const center = (id: string) => {
        const slot = Array.from(stage.querySelectorAll<HTMLElement>("[data-fighter-id]"))
          .find(node => node.dataset.fighterId === id);
        const rect = slot?.getBoundingClientRect();
        return rect ? { x: rect.left - bounds.left + rect.width / 2, y: rect.top - bounds.top + 32 } : null;
      };
      const source = center(actor.id);
      if (source && action.attackType !== "melee") {
        source.x += blinkDistance(bounds.width, actor.isEnemy);
        const shots: Projectile[] = [];
        for (const targetId of new Set(action.hits.map(hit => hit.targetId))) {
          const target = center(targetId);
          if (target) shots.push({ id: `proj${++popupCounter}`, attackType: action.attackType, ultimate, ...projectilePath(source, target) });
        }
        projectiles = shots;
      }
      actingId = actor.id;
      if (ultimate) ultBanner = { name: actor.name, type: action.attackType, key: b.turn };
      impact = game.battlePlayback.schedule(() => {
        if (ultimate) game.battleAudio.play(action.attackType, game.battleSpeed);
        pendingImpact = false;
        hitIds = new Set(action.hits.filter(hit => !hit.dodged).map(hit => hit.targetId));
        const fresh: Popup[] = action.hits.map(hit => ({ id: `p${++popupCounter}`, targetId: hit.targetId, hit, isUltimate: ultimate }));
        if (action.healed > 0 || action.turnHeal > 0) fresh.push({ id: `p${++popupCounter}`, targetId: actor.id, heal: action.healed + action.turnHeal, isUltimate: false });
        popups = [...popups, ...fresh];
      }, duration * timeline.impactAt);
      clear = game.battlePlayback.schedule(() => { actingId = null; hitIds = new Set(); ultBanner = null; }, duration);
    });
    return () => { cancelled = true; impact?.(); clear?.(); };
  });

  $effect(() => {
    report?.turn;
    if (logElement) logElement.scrollTop = logElement.scrollHeight;
  });

  $effect(() => {
    if (formationLocked) {
      selectedSlot = null;
      placingCardId = null;
      endDrag();
    }
  });

  function fighterClass(f?: Fighter): string {
    return f && hitIds.has(f.id) ? "card-hit" : "";
  }

  function fighterPose(f?: Fighter): Pose {
    if (!f) return "idle";
    if (f.hp <= 0) return "death";
    if (actingId === f.id) return "attack";
    return hitIds.has(f.id) ? "hit" : "idle";
  }

  function startDrag(e: DragEvent, cardId: string) {
    if (formationLocked || !e.dataTransfer) { e.preventDefault(); return; }
    e.dataTransfer.setData("text/plain", cardId);
    e.dataTransfer.effectAllowed = "move";
    draggingId = cardId;
    selectedSlot = null;
    placingCardId = null;
  }

  function endDrag() { draggingId = null; dragOverSlot = null; dragOverInventory = false; }
  function slotDragOver(e: DragEvent, slot: number) {
    if (!draggingId || formationLocked) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    dragOverSlot = slot;
  }
  function slotDragLeave(e: DragEvent, slot: number) {
    if (e.relatedTarget instanceof Node && (e.currentTarget as HTMLElement).contains(e.relatedTarget)) return;
    if (dragOverSlot === slot) dragOverSlot = null;
  }
  function slotDrop(e: DragEvent, slot: number) {
    e.preventDefault();
    if (!formationLocked && draggingId) game.assignCardToParty(draggingId, slot);
    endDrag();
  }
  function inventoryDrop(cardId: string) { game.removeCardFromParty(cardId); endDrag(); }
  function selectSlot(slot: number, card: UnitCard | null) {
    if (formationLocked) return;
    if (placingCardId) {
      game.assignCardToParty(placingCardId, slot);
      placingCardId = null;
    } else if (card) {
      selectedCardId = card.id;
    } else {
      selectedSlot = selectedSlot === slot ? null : slot;
    }
  }
  function selectInventoryCard(cardId: string) {
    if (selectedSlot !== null && !formationLocked) {
      game.assignCardToParty(cardId, selectedSlot);
      selectedSlot = null;
    } else selectedCardId = cardId;
  }
  function handleMerge(partnerId: string) {
    if (!selectedCardId) return;
    game.mergeCards(selectedCardId, partnerId);
    selectedCardId = null;
  }
  function handleDiscard() {
    if (selectedCard && confirm(`Discard ${selectedCard.stars}★ ${UNITS[selectedCard.unitId].name}?`)) {
      game.discardCard(selectedCard.id);
      selectedCardId = null;
    }
  }
</script>

<svelte:window onkeydown={(event) => { if (event.key === "Escape") { selectedSlot = null; placingCardId = null; endDrag(); } }} />

{#snippet effects(fighter: Fighter | undefined)}
  {#if fighter}
    {#each popups.filter(p => p.targetId === fighter.id) as popup (popup.id)}
      <DamagePopup playback={game.battlePlayback} id={popup.id} hit={popup.hit} heal={popup.heal} isUltimate={popup.isUltimate} onDone={(id) => popups = popups.filter(p => p.id !== id)} />
    {/each}
  {/if}
{/snippet}

<div class="combat-layout">
  <div class="combat-main">
    <header class="combat-header">
      <div class="level-heading">
        <h2>{mode === "story" ? game.storyComplete ? "Campaign complete" : `${regionForLevel(gacha.storyLevel).name} · Lv ${gacha.storyLevel}` : `Depth ${gacha.depths.level}`}</h2>
        {#if mode === "depths"}<span>+{game.depthsIncome} ⚔ / min · next tier at depth {nextTierAt}</span>
        {:else if !game.storyComplete}<span>{storyBoss ? "Boss battle · " : ""}+{gacha.storyLevel} Tribute</span>{/if}
      </div>
      <div class="battle-controls">
        <button class="help-button" aria-expanded={showHelp} onclick={() => showHelp = !showHelp}>How fights work</button>
        {#if mode === "depths"}
          <label class="auto-toggle"><input type="checkbox" checked={gacha.depths.auto} disabled={otherBattleActive || partyCards.length === 0} onchange={e => game.setDepthsAuto(e.currentTarget.checked)} /> Auto</label>
        {/if}
        <Button size="sm" class="h-7 px-3 text-xs" disabled={!canFight} onclick={() => mode === "story" ? game.startStoryFight() : game.startDepthsFight()}>{isPlaying ? "Fighting…" : mode === "story" ? "⚔ Fight" : "⚔ Descend"}</Button>
      </div>
    </header>

    <div class="playback-controls" role="group" aria-label="Battle playback">
      <button disabled={!battle} aria-pressed={game.battlePaused} onclick={() => game.setBattlePaused(!game.battlePaused)}>{game.battlePaused ? "▶ Resume" : "Ⅱ Pause"}</button>
      <div role="group" aria-label="Battle speed">
        {#each [0.5, 1, 2] as speed}
          <button aria-label={`${speed}× battle speed`} aria-pressed={game.battleSpeed === speed} onclick={() => game.setBattleSpeed(speed as BattleSpeed)}>{speed === 0.5 ? "½" : speed}×</button>
        {/each}
      </div>
      <button class="sound-toggle" aria-label="Ultimate sounds" aria-pressed={!game.battleMuted} onclick={() => game.setBattleMuted(!game.battleMuted)}>Sound: {game.battleMuted ? "off" : "on"}</button>
      {#if game.battlePaused}<span role="status">Battle paused</span>{/if}
    </div>

    {#if showHelp}
      <div class="help-panel">
        <p>Drag units from your army onto the battlefield. Front positions 2 and 4 take hits first. Drag a fielded unit back to your army to remove it, or onto another unit to swap them.</p>
        <p>Prefer clicking? Select an empty position, then a card. A unit’s details also let you choose its position. Formations are locked during battle.</p>
        <p>Each unit uses its ultimate automatically every third personal action, replacing its normal attack. Speed affects how quickly that unit acts. Two Ascendants make your army’s ultimates trigger every second action; enemy armies with two Ascendants do the same.</p>
        <ul>{#each Object.values(ULTIMATES) as ultimate}<li><strong>{ultimate.name}:</strong> {ultimate.description}</li>{/each}</ul>
        <p>Ultimates cannot be dodged or double-hit. They can crit, apply type advantage, and benefit from army bonuses.</p>
        <TutorialOverlay step={gacha.tutorialStep} onNext={() => game.advanceTutorial()} onSkip={() => game.skipTutorial()} />
      </div>
    {/if}
    {#if otherBattleActive}<p class="notice">A battle is running in {gacha.battleMode === "story" ? "Campaign" : "The Depths"}. Your formation is locked until it finishes.</p>{/if}

    <section class="battlefield" aria-label="Battlefield" class:placing={draggingId !== null || placingCardId !== null}>
      <div class="army-headings">
        <div>
          <h3>Your army</h3>
          <ArmySynergies cards={partyCards} />
        </div>
        <div class="enemy-heading">
          <div class="enemy-title"><h3>Enemy army</h3>
            {#if encounter}
              {@const factionDef = FACTIONS[encounter.faction]}
              <span class="archetype" style:color={factionDef.color}>{factionDef.name}</span>
              {#if (encounter.statMult ?? 1) > 1.005}<span class="enemy-boost">+{Math.round((encounter.statMult! - 1) * 100)}% stats</span>{/if}
            {/if}
          </div>
          <ArmySynergies cards={encounter?.cards ?? []} enemy />
        </div>
      </div>

      <div class="battle-stage" bind:this={stage} use:syncBattleAnimations={{ speed: game.battleSpeed, paused: game.battlePaused }}>
        <div class="formation player-formation" aria-label="Your battlefield positions">
          {#each POSITIONS as position (position)}
            {@const fighter = playerFighters.find(f => f.position === position)}
            {@const card = battle ? fighter ?? null : partySlots[position - 1]}
            {@const over = dragOverSlot === position - 1 && draggingId !== card?.id}
            <div class="field-position" class:acting={actingId === fighter?.id} data-fighter-id={fighter?.id} class:targeted={pendingImpact && battle?.lastAction?.hits.some(hit => hit.targetId === fighter?.id)} class:front={isFrontRow(position)} style:--position={position}
              role="group" aria-label={`Your position ${position}, ${isFrontRow(position) ? "front" : "back"} row`}
              ondragover={e => slotDragOver(e, position - 1)} ondragenter={e => slotDragOver(e, position - 1)}
              ondragleave={e => slotDragLeave(e, position - 1)} ondrop={e => slotDrop(e, position - 1)}>
              <button
                class="position-button" class:occupied={card !== null} class:drop-hover={over} class:selected={selectedSlot === position - 1}
                class:drag-source={draggingId === card?.id} class:available={!formationLocked}
                disabled={formationLocked} draggable={card !== null && !formationLocked}
                aria-label={`Position ${position}, ${isFrontRow(position) ? "front" : "back"} row${card ? `: ${UNITS[card.unitId].name}, ${card.stars} stars` : ": empty"}`}
                title={`Position ${position} · ${isFrontRow(position) ? "Front row — targeted first" : "Back row"}${card ? " · Click for details, drag to move" : " · Drop a unit or click to select"}`}
                ondragstart={e => card && startDrag(e, card.id)} ondragend={endDrag}
                onclick={() => selectSlot(position - 1, card)}>
                {#if over && draggedCard}
                  <div class="drop-circle"><BattleUnit card={draggedCard} ghost /></div><span class="drop-caption">{card ? "Swap / replace" : "Drop here"}</span>
                {:else if card}
                  <div class={fighterClass(fighter)} use:attackMotion={{ active: actingId !== null && actingId === fighter?.id, key: animationKey, ultimate: actingKind === "ultimate", distance: movement * (fighter?.isEnemy ? -1 : 1) }}><BattleUnit {card} {fighter} ultEvery={battle?.playerMods.ultEvery ?? 3} castingUltimate={actingId === fighter?.id && actingKind === "ultimate"} pose={fighterPose(fighter)} animate={isPlaying} /></div>
                {:else}
                  <span class="empty-circle"><span>+</span></span>
                  <span class="position-caption">{selectedSlot === position - 1 ? "Choose a card" : `${isFrontRow(position) ? "Front" : "Back"} · ${position}`}</span>
                {/if}
              </button>
              {@render effects(fighter)}
            </div>
          {/each}
        </div>
        <div class="versus" aria-hidden="true">VS</div>
        <div class="formation enemy-formation" aria-label="Enemy battlefield positions">
          {#each POSITIONS as position (position)}
            {@const fighter = enemyFighters.find(f => f.position === position)}
            {@const card = battle ? fighter : encounter?.cards[position - 1]}
            {#if card}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="field-position" class:acting={actingId === fighter?.id} data-fighter-id={fighter?.id} class:targeted={pendingImpact && battle?.lastAction?.hits.some(hit => hit.targetId === fighter?.id)} class:front={isFrontRow(position)} style:--position={position}
                role="img" aria-label={`Enemy position ${position}, ${isFrontRow(position) ? "front" : "back"} row: ${UNITS[card.unitId].name}, ${card.stars} stars`}
                onclick={() => inspectedEnemy = { id: card.id, unitId: card.unitId, stars: card.stars }} style="cursor: pointer">
                {#if encounter?.bossId === card.id}<span class="boss-label">Boss</span>{/if}
                <div class={fighterClass(fighter)} use:attackMotion={{ active: actingId !== null && actingId === fighter?.id, key: animationKey, ultimate: actingKind === "ultimate", distance: movement * (fighter?.isEnemy ? -1 : 1) }}><BattleUnit {card} {fighter} enemy ultEvery={battle?.enemyMods.ultEvery ?? 3} castingUltimate={actingId === fighter?.id && actingKind === "ultimate"} pose={fighterPose(fighter)} animate={isPlaying} /></div>
                {@render effects(fighter)}
              </div>
            {/if}
          {/each}
          {#if !encounter}<p class="story-complete">All {MAX_ENEMY_LEVEL} campaign levels conquered.<br />The Depths await.</p>{/if}
        </div>
        {#each projectiles as projectile (projectile.id)}
          <CombatProjectile playback={game.battlePlayback} {...projectile} onDone={id => projectiles = projectiles.filter(p => p.id !== id)} />
        {/each}
        {#if ultBanner}
          {#key ultBanner.key}<div class="ultimate-overlay" aria-live="polite"><div class="ult-banner"><strong>{ULTIMATES[ultBanner.type].name}</strong><span>{ultBanner.name} · {ULTIMATES[ultBanner.type].short}</span></div></div>{/key}
        {/if}
        {#if battleDone}
          <div class="battle-result-overlay" aria-live="assertive">
            <div class="battle-result-content" class:win={battle?.status === "won"} class:lose={battle?.status === "lost"}>
              <span class="result-label">{battle?.status === "won" ? "Victory!" : "Defeated"}</span>
              {#if battle?.status === "won"}
                <span class="result-detail">{mode === "story" ? `+${Math.min(gacha.storyLevel, Math.max(0, game.tributeCap - gacha.gold))} Tribute` : `Depth ${gacha.depths.level} cleared`}</span>
              {:else}
                <span class="result-detail">Adjust your formation and try again.</span>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      <footer class="battlefield-footer" aria-live="polite">
        {#if battleDone}
          <span>{game.battlePaused ? "Paused" : "Continuing…"}</span>
        {:else if isPlaying}<span>{game.battlePaused ? "Battle paused" : "Battle in progress"} · Turn {battle?.turn}</span><span>Formation locked</span>
        {:else if selectedSlot !== null || placingCardId}
          <span>{placingCardId ? "Choose a position on the battlefield." : `Choose a card from your army for position ${selectedSlot! + 1}.`}</span>
          <button onclick={() => { selectedSlot = null; placingCardId = null; }}>Cancel</button>
        {:else}<span>Front row takes hits first.</span><span>{partyCards.length}/{PARTY_SIZE} deployed</span>{/if}
      </footer>
    </section>

    <ArmyInventory cards={gacha.cards} {partyIds} gold={gacha.gold} rollCost={GACHA_COST} packCost={PACK_COST}
      maxStars={game.maxSummonStars} rollRates={game.rollRates} hasCelestialAltar={game.hasCelestialAltar} legendaryPackCost={LEGENDARY_PACK_COST} locked={formationLocked} {draggingId} dropActive={draggingFromParty} dragOver={dragOverInventory}
      onDragStart={startDrag} onDragEnd={endDrag} onDragOverChange={over => dragOverInventory = over} onDrop={inventoryDrop}
      onSelect={selectInventoryCard} onSummon={() => game.rollCard()} onOpenPack={() => game.rollPack()} onOpenLegendaryPack={() => game.rollLegendaryPack()} />
  </div>

  <aside class="battle-sidebar" aria-label="Battle report">
    <section class="battle-log">
      <div class="log-heading"><h3>Battle log</h3><span>{report ? `${battle ? "Turn" : "Last battle · Turn"} ${report.turn}` : "Ready"}</span></div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The scrollable log needs keyboard access.) -->
      <div class="log-entries" bind:this={logElement} tabindex="0" role="region" aria-label="Battle log entries">
        {#if report}
          {#each report.log as entry, i (i)}<p class:ultimate={entry.type === "ultimate"} class:death={entry.type === "death"} class:info={entry.type === "info"}>{entry.text}</p>{/each}
        {:else}<p class="log-empty">Your next battle starts here.<br />Arrange your army, scout the enemy, and {mode === "story" ? "fight" : "descend"}.</p>{/if}
      </div>
    </section>
    <CombatStatsPanel playerFighters={report?.fighters.filter(f => !f.isEnemy) ?? []} enemyFighters={report?.fighters.filter(f => f.isEnemy) ?? []} />
  </aside>
</div>

{#if selectedCard}
  <CardDetailModal card={selectedCard} inParty={partyIds.has(selectedCard.id)} partyFull={partyIds.size >= PARTY_SIZE}
    mergePartners={game.mergePartnersFor(selectedCard.id)} locked={formationLocked}
    onAddToParty={() => game.addCardToFirstEmptySlot(selectedCard!.id)} onRemoveFromParty={() => game.removeCardFromParty(selectedCard!.id)}
    onChoosePosition={() => { placingCardId = selectedCard!.id; selectedSlot = null; selectedCardId = null; }}
    onMerge={handleMerge} onDiscard={handleDiscard} onClose={() => selectedCardId = null} />
{/if}

{#if inspectedEnemy}
  <CardDetailModal
    card={inspectedEnemy}
    readOnly
    statMult={encounter?.statMult ?? 1}
    onClose={() => (inspectedEnemy = null)}
  />
{/if}
<style>
  .combat-layout { display: grid; grid-template-columns: minmax(0, 1fr) 236px; align-items: start; gap: 18px; }
  .playback-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 10px; color: var(--muted-foreground); }
  .playback-controls > div { display: flex; gap: 2px; }
  .playback-controls button { border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; cursor: pointer; }
  .playback-controls button[aria-pressed="true"] { color: #eee; background: #ffffff18; border-color: #ffffff40; }
  .playback-controls button:disabled { opacity: .4; cursor: default; }
  .sound-toggle { margin-left: auto; }
  .combat-main { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
  .combat-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 30px; flex-wrap: wrap; }
  .level-heading, .battle-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .level-heading h2 { font-size: 18px; font-weight: 650; letter-spacing: -.3px; }
  .level-heading > span { font-size: 10px; color: var(--muted-foreground); }
  .help-button { font-size: 10px; text-decoration: underline dotted; text-underline-offset: 3px; color: var(--muted-foreground); cursor: pointer; }
  .auto-toggle { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted-foreground); cursor: pointer; }
  .auto-toggle input { accent-color: #ddd; }
  .notice, .help-panel { font-size: 12px; color: var(--muted-foreground); border: 1px solid var(--border); border-radius: 8px; padding: 12px; line-height: 1.6; }
  .help-panel { display: flex; flex-direction: column; gap: 8px; }
  .battlefield { position: relative; background: #ffffff02; border: 1px solid var(--border); border-radius: 9px; padding: 16px 14px 0; overflow: hidden; }
  .army-headings { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; min-height: 64px; }
  h3 { text-transform: uppercase; letter-spacing: 1.1px; font-size: 10px; font-weight: 600; color: #999; }
  .enemy-title { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; justify-content: flex-end; }
  .archetype, .enemy-boost { border-radius: 3px; padding: 3px 5px; font-size: 9px; white-space: nowrap; }
  .archetype { color: #bcc6f1; background: #34447166; }
  .enemy-boost { color: #e7978f; background: #702b2b55; }
  .battle-stage { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 60px minmax(0, 1fr); height: 400px; margin-top: 8px; }
  .formation { position: relative; min-width: 0; }
  .field-position { position: absolute; width: 100px; left: 25%; top: calc((var(--position) - 1) * 18%); transform: translateX(-50%); text-align: center; }
  .player-formation .front { left: 75%; }
  .enemy-formation .field-position { left: 75%; }
  .enemy-formation .front { left: 25%; }
  .field-position.acting { z-index: 6; }
  .field-position.targeted::after { content: ""; position: absolute; width: 56px; height: 14px; border: 1px solid #edc779aa; border-radius: 50%; left: 50%; top: 53px; transform: translateX(-50%); pointer-events: none; box-shadow: 0 0 12px #edc77933; }
  .position-button { position: relative; width: 100%; min-height: 94px; display: flex; flex-direction: column; align-items: center; justify-content: center; outline-offset: 3px; border-radius: 50%; }
  .position-button.available { cursor: pointer; }
  .position-button.occupied.available { cursor: grab; }
  .position-button.occupied.available:active { cursor: grabbing; }
  .position-button.occupied.available:hover { background: radial-gradient(ellipse, #ffffff09, transparent 70%); }
  .drag-source { opacity: .3; }
  .empty-circle, .drop-circle { width: 74px; height: 74px; display: flex; align-items: center; justify-content: center; border: 1px dashed #ffffff27; border-radius: 50%; color: #6c6c6c; }
  .empty-circle > span { font-size: 23px; font-weight: 300; }
  .position-caption { margin-top: 5px; font-size: 9px; color: #656565; }
  .drop-circle { border: 1px solid #ddd; background: #ffffff12; box-shadow: 0 0 0 2px #ffffff30; }
  .drop-caption { margin-top: 6px; font-size: 10px; color: #ddd; }
  .placing .empty-circle, .selected .empty-circle { border-color: #ffffff66; background: #ffffff04; }
  .selected .empty-circle { border-style: solid; box-shadow: 0 0 0 2px #ffffff20; }
  .versus { align-self: center; text-align: center; margin-top: -12px; font-size: 29px; letter-spacing: 3px; font-weight: 800; color: #ffffff22; }
  .boss-label { position: absolute; z-index: 2; top: -8px; left: 50%; transform: translateX(-50%); font-size: 8px; letter-spacing: 1px; text-transform: uppercase; color: #edaaa1; background: #50251f; border-radius: 3px; padding: 1px 5px; }
  .story-complete { font-size: 12px; line-height: 1.7; color: var(--muted-foreground); padding-top: 130px; text-align: center; }
  .battlefield-footer { min-height: 30px; display: flex; justify-content: space-between; gap: 8px; font-size: 10px; align-items: center; color: var(--muted-foreground); border-top: 1px solid #ffffff05; }
  .battlefield-footer button { text-decoration: underline; cursor: pointer; }
  .win { color: #9fca98; }
  .battle-result-overlay { position: absolute; inset: 0; z-index: 9; display: flex; align-items: center; justify-content: center; background: #00000088; backdrop-filter: blur(2px); border-radius: 8px; animation: result-fade-in 0.3s ease-out; pointer-events: none; }
  .battle-result-content { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 28px; border-radius: 10px; background: #1a1a1aee; border: 1px solid #ffffff18; }
  .battle-result-content.win { border-color: #9fca9855; }
  .battle-result-content.lose { border-color: #cf6b6255; }
  .result-label { font-size: 28px; font-weight: 800; letter-spacing: 1px; }
  .battle-result-content.win .result-label { color: #9fca98; }
  .battle-result-content.lose .result-label { color: #cf6b62; }
  .result-detail { font-size: 13px; color: #aaa; }
  @keyframes result-fade-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
  .ultimate-overlay { position: absolute; inset: -8px 0 auto; z-index: 8; display: flex; align-items: start; justify-content: center; pointer-events: none; }
  .ultimate-overlay > div { background: #18120be6; border: 1px solid #9c723c55; padding: 5px 12px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; color: #f5c17c; }
  .ultimate-overlay strong { font-size: 12px; letter-spacing: 1px; }
  .ultimate-overlay span { font-size: 11px; }
  .battle-sidebar { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .battle-log { border: 1px solid var(--border); border-radius: 8px; background: #ffffff02; padding: 10px; }
  .log-heading { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .log-heading > span { font-size: 9px; color: #777; }
  .log-entries { height: 190px; overflow-y: auto; margin-top: 9px; padding-right: 5px; font-size: 10px; line-height: 1.75; color: #999; scrollbar-width: thin; }
  .log-entries p { margin-bottom: 3px; }
  .log-entries .ultimate { color: #d6b07e; }
  .log-entries .death { color: #b9827e; }
  .log-entries .info { color: #b0b0b0; }
  .log-empty { padding: 12px 0; }
  @media (max-width: 1100px) { .combat-layout { grid-template-columns: minmax(0, 1fr) 205px; gap: 12px; } .battle-stage { grid-template-columns: minmax(0, 1fr) 32px minmax(0, 1fr); } }
  @media (max-width: 900px) { .combat-layout { grid-template-columns: minmax(0, 1fr); } .battle-sidebar { display: grid; grid-template-columns: 1fr 1fr; } }
  @media (max-width: 640px) { .battle-sidebar { grid-template-columns: 1fr; } .battlefield { padding: 12px 8px 0; } .field-position { width: 76px; } .battle-stage { height: 400px; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr); } .army-headings { gap: 10px; } .empty-circle, .drop-circle { width: 56px; height: 56px; } .versus { font-size: 19px; } .position-button { min-height: 92px; } }
</style>
