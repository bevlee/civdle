<script lang="ts">
  import { nice } from "$lib/utils";
  import { syncBattleAnimations, type BattleSpeed } from "$lib/battlePlayback";
  import { tick, untrack } from "svelte";
  import { attackMotion, blinkDistance, projectilePath, timeline } from "$lib/combatAnimation";
  import { DEPTHS_SPOILS_PER_TIER, DEPTHS_TIER_SIZE, MAX_ENEMY_LEVEL, PARTY_SIZE, ULTIMATES, UNITS, isBossLevel, regionForLevel, storyTribute, strongestEnemy, type AttackType, type UnitCard } from "$lib/combatData";
  import type { BattleMode, BattleState, Fighter, Hit } from "$lib/combatEngine";
  import { isFrontRow, POSITIONS } from "$lib/position";
  import { dragLabel, dragPlace, type DragState, type DropResult } from "$lib/dragPlace";
  import { rarityColor } from "$lib/rarity";
  import Sprite from "./Sprite.svelte";
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
  import SummonPanel from "./SummonPanel.svelte";

  let {
    game,
    mode,
    onOpenSettlement,
  }: {
    game: CivdleGame;
    mode: BattleMode;
    /** Jump to the Settlement tab (summon unlocks and odds are built there). */
    onOpenSettlement?: () => void;
  } = $props();
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
  // The enemy that joins your army when this campaign level is won.
  let storyRecruit = $derived(gacha.encounter ? strongestEnemy(gacha.encounter) : null);
  let storyRewardText = $derived(
    `+${storyTribute(gacha.storyLevel)} Tribute` +
      (storyRecruit ? ` · ${UNITS[storyRecruit.unitId].name} ${UNITS[storyRecruit.unitId].baseStars}★ joins you` : ""),
  );
  let nextTierAt = $derived((Math.floor(game.depthsCleared / DEPTHS_TIER_SIZE) + 1) * DEPTHS_TIER_SIZE);
  let levelTitle = $derived(mode === "story" ? game.storyComplete ? "Campaign conquered" : `${regionForLevel(gacha.storyLevel).name} · Lv ${gacha.storyLevel}` : `Depth ${nice(gacha.depths.level)}`);
  // The phone's one-line summary under the title.
  let levelSub = $derived(mode === "depths"
    ? `+${game.depthsIncome * game.treasuryMultiplier} Tribute/min · next tier at ${nextTierAt}`
    : game.storyComplete ? "" : `${storyBoss ? "Boss · " : ""}${storyRewardText}`);
  let fightLabel = $derived(isPlaying ? "Fighting…" : mode === "story" ? "⚔ Fight" : "⚔ Descend");
  function startFight() { if (mode === "story") game.startStoryFight(); else game.startDepthsFight(); }
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
  // Phones show the battle log and stats as a sheet over the battlefield.
  let showLog = $state(false);
  let logToggle = $state<HTMLButtonElement>();
  // The report hides with display:none, so hand focus back to its toggle rather than dropping it to <body>.
  function closeLog() {
    const focusInReport = document.activeElement?.closest("#battle-report");
    showLog = false;
    if (focusInReport) logToggle?.focus();
  }
  let summonOpen = $state(false);
  // Phone: the army's expanded view covers the header and the board.
  let armyCovering = $state(false);
  let selectedCardId = $state<string | null>(null);
  let selectedCard = $derived(gacha.cards.find(c => c.id === selectedCardId) ?? null);
  let resultReady = $state(false);
  let inspectedEnemy = $state<UnitCard | null>(null);
  // The hero being dragged (from the army or the board) and where the pointer is.
  let drag = $state<DragState | null>(null);
  let draggingId = $derived(drag?.source.cardId ?? null);
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
    resultReady = false;
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
        else if (action.hits.some(hit => !hit.dodged)) game.battleAudio.hit(action.attackType, game.battleSpeed);
        if (b.fighters.some(f => f.hp <= 0 && beforeImpact.some(old => old.id === f.id && old.hp > 0))) {
          game.battleAudio.death(game.battleSpeed);
        }
        pendingImpact = false;
        hitIds = new Set(action.hits.filter(hit => !hit.dodged).map(hit => hit.targetId));
        const fresh: Popup[] = action.hits.map(hit => ({ id: `p${++popupCounter}`, targetId: hit.targetId, hit, isUltimate: ultimate }));
        if (action.healed > 0 || action.turnHeal > 0) fresh.push({ id: `p${++popupCounter}`, targetId: actor.id, heal: action.healed + action.turnHeal, isUltimate: false });
        popups = [...popups, ...fresh];
      }, duration * timeline.impactAt);
      clear = game.battlePlayback.schedule(() => {
        actingId = null; hitIds = new Set(); ultBanner = null;
        if (b.status !== "playing") {
          selectedCardId = null;
          resultReady = true;
          game.battleAudio.result(b.status === "won");
        }
      }, duration);
    });
    return () => { cancelled = true; impact?.(); clear?.(); };
  });

  $effect(() => {
    report?.turn;
    if (logElement) logElement.scrollTop = logElement.scrollHeight;
  });

  $effect(() => {
    if (formationLocked) drag = null;
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

  function applyDrop(result: DropResult) {
    if (formationLocked) return;
    if ("assign" in result) game.assignCardToParty(...result.assign);
    else game.removeFromParty(result.remove);
  }
  const setDrag = (state: DragState | null) => { drag = state; };
  function handlePromote() {
    if (!selectedCardId) return;
    game.promoteCard(selectedCardId);
    selectedCardId = null;
  }
  function continueBattle() {
    const auto = mode === "depths" && gacha.depths.auto;
    game.dismissBattle();
    if (auto) game.startDepthsFight();
  }

  $effect(() => {
    game.battleMuted;
    game.battleAudio.setMusicPlaying(isPlaying && !game.battlePaused);
    return () => game.battleAudio.setMusicPlaying(false);
  });
</script>

{#snippet effects(fighter: Fighter | undefined)}
  {#if fighter}
    {#each popups.filter(p => p.targetId === fighter.id) as popup (popup.id)}
      <DamagePopup playback={game.battlePlayback} id={popup.id} hit={popup.hit} heal={popup.heal} isUltimate={popup.isUltimate} onDone={(id) => popups = popups.filter(p => p.id !== id)} />
    {/each}
  {/if}
{/snippet}

<svelte:window onkeydown={(e) => {
  if (e.key !== "Escape" || !showLog) return;
  // Another dialog (the combat guide, hero details) owns its own Escape.
  if (e.target instanceof Element && e.target.closest("dialog, [role='dialog']")) return;
  closeLog();
}} />

<div class="combat-layout">
  <div class="combat-main">
    <!-- Phone: title and Fight, then one row of playback controls. -->
    <div class="phone-header flex flex-col gap-2" inert={armyCovering}>
      <div class="flex items-center gap-3">
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 class="truncate text-lg leading-tight font-bold tracking-tight">{levelTitle}</h2>
          {#if levelSub}<p class="line-clamp-2 text-[13px] leading-snug text-pretty text-muted-foreground">{levelSub}</p>{/if}
        </div>
        {#if mode === "depths"}
          <button class="h-11 shrink-0 rounded-xl border border-border px-3 text-sm font-semibold transition-colors disabled:opacity-50 {gacha.depths.auto ? 'bg-accent text-foreground' : 'text-muted-foreground'}"
            aria-pressed={gacha.depths.auto} disabled={otherBattleActive || partyCards.length === 0}
            onclick={() => game.setDepthsAuto(!gacha.depths.auto)}>Auto</button>
        {/if}
        <Button class="h-11 shrink-0 rounded-xl px-4 text-[15px] font-semibold" disabled={!canFight} onclick={startFight}>{fightLabel}</Button>
      </div>
      <!-- The vertical padding keeps the buttons' 44px hit areas inside the scroller's clip. -->
      <div class="-my-1 flex items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]" role="group" aria-label="Battle playback">
        <button class="tap-target h-9 w-10 shrink-0 rounded-[10px] border border-border text-[13px] transition-colors disabled:opacity-40 {game.battlePaused ? 'text-foreground' : 'text-muted-foreground'}"
          disabled={!battle} aria-pressed={game.battlePaused} aria-label="Pause battle"
          onclick={() => game.setBattlePaused(!game.battlePaused)}>{game.battlePaused ? "▶" : "Ⅱ"}</button>
        <div class="flex shrink-0 rounded-[10px] border border-border" role="group" aria-label="Battle speed">
          {#each [0.5, 1, 2] as speed}
            <button class="tap-target h-9 w-9 text-[13px] font-semibold transition-colors first:rounded-l-[9px] last:rounded-r-[9px] {game.battleSpeed === speed ? 'bg-accent text-foreground' : 'text-muted-foreground'}"
              aria-label={`${speed}× battle speed`} aria-pressed={game.battleSpeed === speed}
              onclick={() => game.setBattleSpeed(speed as BattleSpeed)}>{speed === 0.5 ? "½" : speed}×</button>
          {/each}
        </div>
        <span class="flex-1"></span>
        <button class="tap-target h-9 shrink-0 rounded-[10px] border border-border px-2.5 text-[13px] whitespace-nowrap text-muted-foreground"
          aria-label="Battle sounds" aria-pressed={!game.battleMuted}
          onclick={() => game.setBattleMuted(!game.battleMuted)}>{game.battleMuted ? "🔈 Off" : "🔊 On"}</button>
        <button class="tap-target h-9 shrink-0 rounded-[10px] border border-border px-2.5 text-[13px] text-muted-foreground"
          bind:this={logToggle} aria-expanded={showLog} aria-controls="battle-report" onclick={() => (showLog = !showLog)}>Log</button>
        <button class="tap-target size-9 shrink-0 rounded-full border border-border text-[13px] text-muted-foreground"
          aria-haspopup="dialog" aria-label="Combat guide" onclick={() => showHelp = true}>?</button>
      </div>
    </div>

    <header class="combat-header">
      <div class="level-heading" class:stacked={mode === "depths"}>
        <h2>{levelTitle}</h2>
        {#if mode === "depths"}<span>+{game.depthsIncome * game.treasuryMultiplier} ⚔ / min{game.treasuryMultiplier > 1 ? " (2× Treasury)" : ""} · next tier at depth {nextTierAt}</span>
        {:else if !game.storyComplete}<span>{storyBoss ? "Boss battle · " : ""}{storyRewardText}</span>{/if}
        {#if mode === "depths"}<p class="depths-blurb text-[16px] text-muted-foreground">Endless mode that tests your strength. You are awarded every minute with tribute based on your maximum depth.</p>{/if}
      </div>
      <div class="battle-controls">
        <button class="help-button" aria-haspopup="dialog" onclick={() => showHelp = true}>Combat guide</button>
        {#if mode === "depths"}
          <label class="auto-toggle"><input type="checkbox" checked={gacha.depths.auto} disabled={otherBattleActive || partyCards.length === 0} onchange={e => game.setDepthsAuto(e.currentTarget.checked)} /> Auto</label>
        {/if}
        <Button size="sm" class="h-9 px-4 text-sm sm:h-9 sm:px-3 sm:text-[17px]" disabled={!canFight} onclick={startFight}>{fightLabel}</Button>
      </div>
    </header>

    <div class="playback-controls" role="group" aria-label="Battle playback">
      <button disabled={!battle} class:paused={game.battlePaused} onclick={() => game.setBattlePaused(!game.battlePaused)}>{game.battlePaused ? "▶ Resume" : "Ⅱ Pause"}</button>
      <div role="group" aria-label="Battle speed">
        {#each [0.5, 1, 2] as speed}
          <button aria-label={`${speed}× battle speed`} aria-pressed={game.battleSpeed === speed} onclick={() => game.setBattleSpeed(speed as BattleSpeed)}>{speed === 0.5 ? "½" : speed}×</button>
        {/each}
      </div>
      <button class="sound-toggle" aria-label="Battle sounds" aria-pressed={!game.battleMuted} onclick={() => game.setBattleMuted(!game.battleMuted)}>Sound: {game.battleMuted ? "off" : "on"}</button>
      {#if game.battlePaused}<span role="status">Battle paused</span>{/if}
    </div>

    {#if showHelp}
      <TutorialOverlay onClose={() => { showHelp = false; game.skipTutorial(); }} />
    {/if}
    {#if otherBattleActive}<p class="notice">A battle is running in {gacha.battleMode === "story" ? "Campaign" : "The Depths"}. Your formation is locked until it finishes.</p>{/if}

    <section class="battlefield" aria-label="Battlefield" class:placing={drag !== null} inert={armyCovering}>
      <div class="army-headings">
        <div>
          <h3>Your army</h3>
          <ArmySynergies cards={partyCards} />
        </div>
        <div class="enemy-heading">
          <div class="enemy-title"><h3>Enemy army</h3>
            {#if encounter}
              {#if (encounter.statMult ?? 1) > 1.005}<span class="enemy-boost">+{Math.round((encounter.statMult! - 1) * 100)}% stats</span>{/if}
            {/if}
          </div>
          <ArmySynergies cards={encounter?.cards ?? []} enemy />
        </div>
      </div>

      <div class="battle-stage" bind:this={stage} data-drag-board use:syncBattleAnimations={{ speed: game.battleSpeed, paused: game.battlePaused }}>
        <div class="formation player-formation" aria-label="Your battlefield positions">
          {#each POSITIONS as position (position)}
            {@const slot = position - 1}
            {@const fighter = playerFighters.find(f => f.position === position)}
            {@const card = battle ? fighter ?? null : partySlots[slot]}
            {@const row = isFrontRow(position) ? "Front" : "Back"}
            <div class="field-position" class:acting={actingId === fighter?.id} data-fighter-id={fighter?.id} data-party-slot={slot} class:targeted={pendingImpact && battle?.lastAction?.hits.some(hit => hit.targetId === fighter?.id)} class:front={isFrontRow(position)} style:--position={position}
              role="group" aria-label={`Your position ${position}, ${row.toLowerCase()} row`}>
              <button
                class="position-button" class:occupied={card !== null} class:drop-hover={drag?.over === slot}
                class:drag-source={drag?.source.type === "slot" && drag.source.slot === slot} class:draggable={card !== null && !formationLocked}
                disabled={card === null}
                aria-label={`Position ${position}, ${row.toLowerCase()} row${card ? `: ${UNITS[card.unitId].name}, ${card.stars} stars` : ": empty — open a hero's details to place it here"}`}
                title={`Position ${position} · ${isFrontRow(position) ? "Front row — targeted first" : "Back row"}${card ? formationLocked ? " · Click for live stats" : " · Click for details, drag to move" : " · Drag a hero here"}`}
                use:dragPlace={{ source: card ? { type: "slot", slot, cardId: card.id } : null, locked: formationLocked, onTap: () => { if (card) selectedCardId = card.id; }, onDrop: applyDrop, onDragState: setDrag }}>
                {#if card}
                  <div class={fighterClass(fighter)} use:attackMotion={{ active: actingId !== null && actingId === fighter?.id, key: animationKey, ultimate: actingKind === "ultimate", distance: movement * (fighter?.isEnemy ? -1 : 1) }}><BattleUnit {card} {fighter} ultEvery={battle?.playerMods.ultEvery ?? 3} castingUltimate={actingId === fighter?.id && actingKind === "ultimate"} pose={fighterPose(fighter)} animate={isPlaying} /></div>
                {:else}
                  <span class="empty-circle"><span>+</span></span>
                  <span class="position-caption">{row} · {position}</span>
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
              <div class="field-position" class:acting={actingId === fighter?.id} data-fighter-id={fighter?.id} class:targeted={pendingImpact && battle?.lastAction?.hits.some(hit => hit.targetId === fighter?.id)} class:front={isFrontRow(position)} style:--position={position}
                role="button" tabindex="0" aria-label={`Inspect enemy position ${position}, ${isFrontRow(position) ? "front" : "back"} row: ${UNITS[card.unitId].name}, ${card.stars} stars`}
                onclick={() => inspectedEnemy = { id: card.id, unitId: card.unitId, stars: card.stars }}
                onkeydown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inspectedEnemy = { id: card.id, unitId: card.unitId, stars: card.stars }; } }} style="cursor: pointer">
                {#if encounter?.bossId === card.id}<span class="boss-label">Boss</span>{/if}
                <div class={fighterClass(fighter)} use:attackMotion={{ active: actingId !== null && actingId === fighter?.id, key: animationKey, ultimate: actingKind === "ultimate", distance: movement * (fighter?.isEnemy ? -1 : 1) }}><BattleUnit {card} {fighter} enemy ultEvery={battle?.enemyMods.ultEvery ?? 3} castingUltimate={actingId === fighter?.id && actingKind === "ultimate"} pose={fighterPose(fighter)} animate={isPlaying} /></div>
                {@render effects(fighter)}
              </div>
            {/if}
          {/each}
          {#if !encounter}<p class="story-complete">Victory! You have conquered the strongest enemies of the land.<br />Your legend is written.</p>{/if}
        </div>
        {#each projectiles as projectile (projectile.id)}
          <CombatProjectile playback={game.battlePlayback} {...projectile} onDone={id => projectiles = projectiles.filter(p => p.id !== id)} />
        {/each}
        {#if ultBanner}
          {#key ultBanner.key}<div class="ultimate-overlay" aria-live="polite"><div class="ult-banner"><strong>{ULTIMATES[ultBanner.type].name}</strong><span>{ultBanner.name} · {ULTIMATES[ultBanner.type].short}</span></div></div>{/key}
        {/if}
        {#if battleDone && resultReady}
          <div class="battle-result-overlay" aria-live="assertive">
            <div class="battle-result-content" class:win={battle?.status === "won"} class:lose={battle?.status === "lost"}>
              <span class="result-emblem" aria-hidden="true">{battle?.status === "won" ? "✦" : "⚔"}</span>
              <p class="result-eyebrow">{mode === "story" ? `Level ${gacha.storyLevel}` : `Depth ${nice(gacha.depths.level)}`}</p>
              <span class="result-label">{battle?.status === "won" ? "Victory!" : "Defeated"}</span>
              {#if battle?.status === "won"}
                <span class="result-detail">{mode === "story" ? storyRewardText : `Depth ${nice(gacha.depths.level)} cleared`}</span>
              {:else}
                <span class="result-detail">Adjust your formation and try again.</span>
              {/if}
              <Button size="sm" class="max-md:mt-1 max-md:h-11 max-md:rounded-xl max-md:px-5 max-md:text-[15px] max-md:font-semibold" onclick={continueBattle}>Continue <span aria-hidden="true">→</span></Button>
              {#if mode === "depths" && gacha.depths.auto}
                <button class="stop-auto" onclick={() => game.setDepthsAuto(false)}>Auto continuing · Stop auto</button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      <footer class="battlefield-footer" class:idle-hint={!formationLocked && partyCards.length === 0} aria-live="polite">
        {#if battleDone && resultReady}
          <span>{mode === "depths" && gacha.depths.auto ? "Auto continuing…" : game.battlePaused ? "Paused" : "Continuing…"}</span>
        {:else if isPlaying}<span>{game.battlePaused ? "Battle paused" : "Battle in progress"} · Turn {battle?.turn}</span><span>Formation locked</span>
        {:else if !formationLocked}<span><span class="md:hidden">Drag heroes onto a slot · tap one for details</span><span class="max-md:hidden">Drag heroes onto a slot · click one for details</span></span>
        {/if}
      </footer>
    </section>

    <div class="army-dock">
      <ArmyInventory cards={gacha.cards} {partyIds} locked={formationLocked} {draggingId} bind:covering={armyCovering}
        onTap={cardId => selectedCardId = cardId} onDrop={applyDrop} onDragState={setDrag} onOpenSummon={() => (summonOpen = true)} />
    </div>
  </div>

  <aside id="battle-report" class="battle-sidebar" class:open={showLog} aria-label="Battle report">
    <div class="report-heading"><h3>Battle report</h3><button onclick={closeLog}>Close</button></div>
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
  {#if showLog}
    <!-- Phones: a tap outside the report closes it. -->
    <button class="log-backdrop" aria-label="Close battle report" tabindex="-1" onclick={closeLog}></button>
  {/if}
</div>


{#if drag && draggedCard}
  <div class="drag-ghost" style:left={`${drag.x}px`} style:top={`${drag.y}px`} aria-hidden="true">
    <div class="ghost-portrait" style:border-color={rarityColor(UNITS[draggedCard.unitId].baseStars)}><Sprite unitId={draggedCard.unitId} class="h-full" /></div>
    <span class="ghost-label">{dragLabel(drag.source, drag.over)}</span>
  </div>
{/if}

{#if selectedCard}
  {@const slot = gacha.party.indexOf(selectedCard.id)}
  <CardDetailModal card={selectedCard} inParty={slot >= 0} slot={slot >= 0 ? slot : null} partyFull={partyIds.size >= PARTY_SIZE}
    canPromoteNow={game.canPromoteCard(selectedCard.id)} copies={game.copiesOf(selectedCard.id)}
    resources={game.state.resources} locked={formationLocked} readOnly={formationLocked}
    fighter={playerFighters.find(f => f.id === selectedCard.id)}
    onAddToParty={() => game.addCardToFirstEmptySlot(selectedCard!.id)} onRemoveFromParty={() => game.removeCardFromParty(selectedCard!.id)}
    onPlace={(to) => game.assignCardToParty(selectedCard!.id, to)} slotCards={partySlots}
    {partyCards} onPromote={handlePromote} onClose={() => selectedCardId = null} />
{/if}

<SummonPanel {game} open={summonOpen} locked={formationLocked} onClose={() => (summonOpen = false)} {onOpenSettlement} />

{#if inspectedEnemy}
  <CardDetailModal
    card={inspectedEnemy}
    readOnly
    statMult={encounter?.statMult ?? 1}
    onClose={() => (inspectedEnemy = null)}
  />
{/if}
<style>
  .result-emblem { font-size: 40px; line-height: 1; }
  .battle-result-content .result-emblem { color: #ce8885; }
  .battle-result-content.win .result-emblem { color: #efd08a; }
  .result-eyebrow { text-transform: uppercase; font-size: 17px; letter-spacing: 1.5px; color: #999; }
  .stop-auto { font-size: 18px; color: #b9afb1; text-decoration: underline; cursor: pointer; }

  .combat-layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; align-items: start; gap: 18px; }
  .playback-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 15px; color: var(--muted-foreground); }
  .playback-controls > div { display: flex; gap: 2px; }
  .playback-controls button { border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; cursor: pointer; }
  .playback-controls button[aria-pressed="true"], .playback-controls button.paused { color: #eee; background: #ffffff18; border-color: #ffffff40; }
  .playback-controls button:disabled { opacity: .4; cursor: default; }
  .sound-toggle { margin-left: auto; }
  .combat-main { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
  .combat-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 30px; flex-wrap: wrap; }
  .level-heading, .battle-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .level-heading h2 { font-size: 23px; font-weight: 650; letter-spacing: -.3px; }
  .level-heading > span { font-size: 15px; color: var(--muted-foreground); }
  .level-heading.stacked { flex-direction: column; align-items: flex-start; gap: 2px; }
  .help-button { font-size: 15px; text-decoration: underline dotted; text-underline-offset: 3px; color: var(--muted-foreground); cursor: pointer; }
  .auto-toggle { display: flex; align-items: center; gap: 5px; font-size: 16px; color: var(--muted-foreground); cursor: pointer; }
  .auto-toggle input { accent-color: #ddd; }
  .notice { font-size: 17px; color: var(--muted-foreground); border: 1px solid var(--border); border-radius: 8px; padding: 12px; line-height: 1.6; }
  .battlefield { position: relative; background: #ffffff02; border: 1px solid var(--border); border-radius: 9px; padding: 16px 14px 0; overflow: hidden; }
  .army-headings { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; min-height: 64px; }
  h3 { text-transform: uppercase; letter-spacing: 1.1px; font-size: 15px; font-weight: 600; color: #999; }
  .enemy-title { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; justify-content: flex-end; }
  .enemy-boost { border-radius: 3px; padding: 3px 5px; font-size: 14px; white-space: nowrap; }
  .enemy-boost { color: #e7978f; background: #702b2b55; }
  .battle-stage { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 60px minmax(0, 1fr); height: 400px; margin-top: 8px; }
  .formation { position: relative; min-width: 0; }
  .field-position { position: absolute; width: 124px; left: 25%; top: calc((var(--position) - 1) * 18%); transform: translateX(-50%); text-align: center; }
  .player-formation .front { left: 75%; }
  .enemy-formation .field-position { left: 75%; }
  .enemy-formation .front { left: 25%; }
  .field-position.acting { z-index: 6; }
  .field-position.targeted::after { content: ""; position: absolute; width: 56px; height: 14px; border: 1px solid #edc779aa; border-radius: 50%; left: 50%; top: 53px; transform: translateX(-50%); pointer-events: none; box-shadow: 0 0 12px #edc77933; }
  .position-button { position: relative; width: 100%; min-height: 94px; display: flex; flex-direction: column; align-items: center; justify-content: center; outline-offset: 3px; border-radius: 14px; transition: background-color .15s, box-shadow .15s; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  .position-button.occupied { cursor: pointer; }
  .position-button.draggable { cursor: grab; touch-action: none; }
  .position-button.draggable:active { cursor: grabbing; }
  .position-button.draggable:hover { background: radial-gradient(ellipse, #ffffff09, transparent 70%); }
  .drag-source { opacity: .3; }
  .empty-circle { width: 74px; height: 74px; display: flex; align-items: center; justify-content: center; border: 1px dashed color-mix(in oklch, var(--foreground) 18%, transparent); border-radius: 50%; color: var(--muted-foreground); transition: border-color .15s; }
  .empty-circle > span { font-size: 31px; font-weight: 300; }
  .position-caption { margin-top: 5px; font-size: 17px; color: var(--muted-foreground); }
  /* While dragging every slot shows a stronger ring; the one under the pointer lights up. */
  .placing .empty-circle { border-color: color-mix(in oklch, var(--foreground) 45%, transparent); }
  .position-button.drop-hover { background: color-mix(in oklch, var(--foreground) 10%, transparent); box-shadow: inset 0 0 0 2px var(--primary); }
  .drop-hover .empty-circle { border-color: var(--primary); }
  .drag-ghost { position: fixed; z-index: 100; transform: translate(-50%, -75%); pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .ghost-portrait { width: 60px; height: 60px; display: flex; align-items: flex-end; justify-content: center; padding: 6px 8px 4px; border: 2px solid; border-radius: 50%; overflow: hidden; background: color-mix(in oklch, var(--card) 94%, transparent); box-shadow: 0 14px 30px #0009; }
  .ghost-label { padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap; color: var(--foreground); background: color-mix(in oklch, var(--background) 80%, transparent); }
  .versus { align-self: center; text-align: center; margin-top: -12px; font-size: 37px; letter-spacing: 3px; font-weight: 800; color: #ffffff22; }
  .boss-label { position: absolute; z-index: 2; top: -8px; left: 50%; transform: translateX(-50%); font-size: 16px; letter-spacing: 1px; text-transform: uppercase; color: #edaaa1; background: #50251f; border-radius: 3px; padding: 1px 5px; }
  .story-complete { font-size: 17px; line-height: 1.7; color: var(--muted-foreground); padding-top: 130px; text-align: center; }
  .battlefield-footer { min-height: 30px; display: flex; justify-content: space-between; gap: 8px; font-size: 15px; align-items: center; color: var(--muted-foreground); border-top: 1px solid #ffffff05; }
  .win { color: #9fca98; }
  .battle-result-overlay { position: absolute; inset: 0; z-index: 9; display: flex; align-items: center; justify-content: center; background: #00000088; backdrop-filter: blur(2px); border-radius: 8px; animation: result-fade-in 0.3s ease-out; }
  .battle-result-content { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 32px; border-radius: 12px; background: #1a1a1aee; border: 1px solid #ffffff18; }
  .battle-result-content.win { border-color: #9fca9855; }
  .battle-result-content.lose { border-color: #cf6b6255; }
  .result-label { font-size: 36px; font-weight: 800; letter-spacing: 1px; }
  .battle-result-content.win .result-label { color: #9fca98; }
  .battle-result-content.lose .result-label { color: #cf6b62; }
  .result-detail { font-size: 21px; color: #aaa; }
  @keyframes result-fade-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
  .ultimate-overlay { position: absolute; inset: -8px 0 auto; z-index: 8; display: flex; align-items: start; justify-content: center; pointer-events: none; }
  .ultimate-overlay > div { background: #18120be6; border: 1px solid #9c723c55; padding: 5px 12px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; color: #f5c17c; }
  .ultimate-overlay strong { font-size: 20px; letter-spacing: 1px; }
  .ultimate-overlay span { font-size: 19px; }
  .battle-sidebar { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .battle-log { border: 1px solid var(--border); border-radius: 8px; background: #ffffff02; padding: 10px; }
  .log-heading { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .log-heading > span { font-size: 14px; color: #777; }
  .log-entries { height: 190px; overflow-y: auto; margin-top: 9px; padding-right: 5px; font-size: 15px; line-height: 1.75; color: #999; scrollbar-width: thin; }
  .log-entries p { margin-bottom: 3px; }
  .log-entries .ultimate { color: #d6b07e; }
  .log-entries .death { color: #b9827e; }
  .log-entries .info { color: #b0b0b0; }
  .log-empty { padding: 12px 0; }
  @media (max-width: 1100px) { .combat-layout { grid-template-columns: minmax(0, 1fr) 240px; gap: 12px; } .battle-stage { grid-template-columns: minmax(0, 1fr) 32px minmax(0, 1fr); } }
  @media (max-width: 900px) { .combat-layout { grid-template-columns: minmax(0, 1fr); } .battle-sidebar { display: grid; grid-template-columns: 1fr 1fr; } }
  .report-heading { display: none; }
  .log-backdrop { display: none; }
  @media (min-width: 768px) { .phone-header { display: none; } }
  @keyframes sheet-up { from { transform: translateY(40%); opacity: 0; } to { transform: none; opacity: 1; } }
  @media (max-width: 640px) { .battle-sidebar { grid-template-columns: 1fr; } .battlefield { padding: 12px 8px 0; } .field-position { width: 76px; } .battle-stage { height: 400px; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr); } .army-headings { gap: 10px; } .empty-circle { width: 56px; height: 56px; } .versus { font-size: 24px; } .position-button { min-height: 92px; } }
  /* Phones: the combat view fills the screen without page scrolling. The battlefield
     takes the spare height and only the army list scrolls. */
  @media (max-width: 767px) {
    /* Stretch, not the desktop grid's "start": otherwise the column shrinks to fit the army list. */
    .combat-layout { display: flex; flex-direction: column; align-items: stretch; flex: 1; min-height: 0; }
    /* position: the army's expanded view covers the battle area. */
    .combat-main { position: relative; flex: 1; min-height: 0; gap: 8px; }
    /* Phones get their own title row and one-line controls (.phone-header). */
    .combat-header, .playback-controls { display: none; }
    .phone-header { flex-shrink: 0; }
    .battlefield { flex: 1 1 0; min-height: 250px; display: flex; flex-direction: column; padding: 8px 8px 4px; }
    .army-headings { min-height: 0; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    /* The VS splits the board, so the side headings are for screen readers only, and the
       enemy's stat boost shares the chips' line. */
    .army-headings h3 { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .enemy-heading { display: flex; align-items: center; gap: 4px; min-width: 0; }
    .enemy-title { flex-shrink: 0; }
    .enemy-heading :global(.synergies) { flex: 1; min-width: 0; margin-top: 0; }
    /* One row of synergy chips per side that scrolls sideways, so a full party doesn't squeeze the board. */
    .army-headings :global(.synergies) { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; margin-top: 0; }
    .army-headings :global(.synergies > *) { flex-shrink: 0; }
    .army-headings :global(.synergies.enemy) { justify-content: flex-start; }
    .army-headings :global(.synergies.enemy > :first-child) { margin-left: auto; }
    .battle-stage { flex: 1; min-height: 0; height: auto; margin-top: 4px; }
    /* Spread the five slots over the stage height so the last unit sits on the bottom edge. */
    .battle-stage { container-type: size; }
    .formation { --unit-h: 108px; }
    .field-position { top: calc((var(--position) - 1) * (100% - var(--unit-h)) / 4); }
    .battlefield-footer { display: none; }
    .battlefield-footer.idle-hint { display: flex; justify-content: center; min-height: 0; padding: 2px 0 4px; border-top: 0; font-size: 12px; }
    .army-dock { flex: none; }
    .battle-sidebar { display: none; }
    .log-backdrop { display: block; position: fixed; inset: 0; z-index: 39; background: #0009; }
    .battle-sidebar.open { display: flex; position: fixed; inset: auto 0 0; z-index: 40; max-height: 70dvh; overflow-y: auto; padding: 0 8px calc(8px + env(safe-area-inset-bottom)); background: var(--background); border-top: 1px solid var(--border); border-radius: 14px 14px 0 0; box-shadow: 0 -12px 32px #000c; animation: sheet-up .2s ease-out; }
    .open .report-heading { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 12px 4px 4px; background: var(--background); }
    .report-heading button { min-height: 44px; margin: -8px 0; padding: 0 8px; font-size: 12px; color: var(--muted-foreground); text-decoration: underline; }
    /* A compact result card that fits a short board. */
    .battle-result-content { gap: 4px; padding: 16px 24px; max-width: calc(100% - 16px); text-align: center; }
    .result-emblem { font-size: 28px; }
    .result-eyebrow { font-size: 11px; letter-spacing: .12em; }
    .result-label { font-size: 28px; }
    .result-detail { font-size: 14px; }
    .stop-auto { font-size: 13px; min-height: 44px; }
  }
  /* Tall stages (bigger phones): larger units, so names and stars stay easy to read. */
  @container (min-height: 400px) {
    .formation { --unit-h: 128px; }
    .field-position { width: 88px; }
    .position-button { min-height: 112px; }
    .field-position :global(.unit-sprite) { height: 80px; }
    .field-position :global(.unit-name) { font-size: 16px; line-height: 20px; max-width: 88px; }
    .field-position :global(.unit-stars) { font-size: 18px; }
    .field-position.targeted::after { top: 68px; }
  }
  /* Short stages (small phones): shrink units so the five slots don't overlap. */
  @container (max-height: 330px) {
    .formation { --unit-h: 88px; }
    .position-button { min-height: 76px; }
    .empty-circle { width: 44px; height: 44px; }
    .field-position :global(.unit-sprite) { height: 44px; }
    .field-position :global(.unit-name) { font-size: 11px; line-height: 13px; }
    .field-position.targeted::after { top: 36px; }
  }
  @container (max-height: 260px) {
    .formation { --unit-h: 72px; }
    .position-button { min-height: 64px; }
    .empty-circle { width: 36px; height: 36px; }
    .field-position :global(.unit-sprite) { height: 34px; }
    .position-caption { display: none; }
    .field-position.targeted::after { top: 28px; }
  }
</style>
