<script lang="ts">
  import { ATTACK_TYPES, DAMAGE_STRONG, DAMAGE_WEAK, UNITS, computeCardStats, getPromotionCost, ULTIMATES, type AttackType, type UnitCard as Card, type UnitId } from "$lib/combatData";
  import { RESOURCES } from "$lib/gameData";
  import { activeTraitsForCard, TRAIT_SYNERGIES, countTraits } from "$lib/traits";
  import AttackTypeIcon from "./AttackTypeIcon.svelte";
  import UnitCard from "./UnitCard.svelte";
  import HeroStats from "./HeroStats.svelte";
  import Sprite from "./Sprite.svelte";

  let { topic, page }: { topic: string; page: number } = $props();
  let attackType = $state<AttackType>("melee");
  const examples: Record<AttackType, UnitId> = { melee: "swordsman", ranged: "archer", magic: "mage" };
  const formation: { position: number; unitId: UnitId }[] = [
    { position: 2, unitId: "ogre" }, { position: 4, unitId: "dendroid" },
    { position: 1, unitId: "archer" }, { position: 3, unitId: "mage" }, { position: 5, unitId: "monk" },
  ];
  const army: Card[] = ["swordsman", "orc", "ogre"].map((unitId, index) => ({ id: `guide-${index}`, unitId: unitId as UnitId, stars: 8 }));
  const brawlers = countTraits(army).get("brawler") ?? 0;
  let hero = $derived({ id: "guide-hero", unitId: "swordsman" as const, stars: page === 0 ? 5 : 8 });
  let activeTraits = $derived(activeTraitsForCard(hero));
  let fromStars = $derived(page === 0 ? 5 : 9);
  let toStars = $derived(fromStars + 1);
  let cost = $derived(getPromotionCost(toStars)!);
  let beforeStats = $derived(computeCardStats("swordsman", fromStars));
  let afterStats = $derived(computeCardStats("swordsman", toStars, toStars === 10));
</script>

<figure aria-label={`${topic} example`}>
  {#if topic === "types"}
    {#snippet hero(type: AttackType)}
      <div><Sprite unitId={examples[type]} class="h-16" /><strong><AttackTypeIcon {type} /> {ATTACK_TYPES[type].name}</strong></div>
    {/snippet}
    <!-- Each weak matchup sits under the strong one it reverses. -->
    <div class="matchups">
      {#each Object.values(ATTACK_TYPES) as type}
        <div class="matchup">
          {@render hero(type.id)}
          <span>×{DAMAGE_STRONG} →<small>beats</small></span>
          {@render hero(type.beats)}
        </div>
      {/each}
      {#each Object.values(ATTACK_TYPES) as type}
        <div class="matchup weak">
          {@render hero(type.beats)}
          <span>×{DAMAGE_WEAK} →<small>weak vs</small></span>
          {@render hero(type.id)}
        </div>
      {/each}
    </div>
    <figcaption>Same type is ×1. The hero’s type determines the matchup.</figcaption>
  {:else if topic === "positions" || topic === "attacks" || topic === "ready"}
    {#if topic === "attacks"}
      <div class="type-picker" role="group" aria-label="Preview ultimate targeting">
        {#each Object.values(ATTACK_TYPES) as type}<button class="tap-target" aria-pressed={attackType === type.id} onclick={() => attackType = type.id}><AttackTypeIcon type={type.id} /> {type.name}</button>{/each}
      </div>
      <p class="visual-heading">{ULTIMATES[attackType].name} · highlighted targets</p>
    {:else}<p class="visual-heading">{topic === "ready" ? "Example five-hero formation" : "Incoming basic attacks"}</p>{/if}
    <!-- Same zigzag as the battlefield: positions 1–5 top to bottom, front row offset toward the attacker. -->
    <div class="formation">
      <span class="column-label" style:grid-column="2">Back</span>
      <span class="column-label" style:grid-column="3">Front</span>
      {#each [...formation].sort((a, b) => a.position - b.position) as slot}
        {@const front = [2, 4].includes(slot.position)}
        {@const targeted = topic === "attacks" ? attackType === "magic" || (attackType === "ranged" ? !front : slot.position === 2) : topic === "positions" && slot.position === 2}
        <div class="slot" class:targeted style:grid-column={front ? 3 : 2} style:grid-row={`${slot.position + 1} / span 2`}>
          <Sprite unitId={slot.unitId} class="h-14" />
          <b>{slot.position} · {UNITS[slot.unitId].name}</b>
          {#if targeted}<small>Target</small>{/if}
        </div>
      {/each}
      {#if topic !== "ready"}<span class="attacker-side" aria-hidden="true">←<span class="attacker-word">Attacker</span></span>{/if}
    </div>
    {#if topic === "attacks"}
      <div class="cycle"><span>1 · Basic</span><span>→</span><span>2 · Basic</span><span>→</span><strong>3 · Ultimate</strong></div>
      <figcaption>{ULTIMATES[attackType].description}</figcaption>
    {:else}<figcaption>Basic target order: 2 → 4 → 1 → 3 → 5. Speed controls who acts next.</figcaption>{/if}
  {:else if topic === "stats"}
    <div class="hero-preview">
      <UnitCard unitId="swordsman" stars={5} size="sm" />
      <div class="detail-preview">
        <h3>Swordsman <span>· Hero details</span></h3>
        <p><AttackTypeIcon type="melee" /> Melee · 5 stars</p>
        <HeroStats stats={computeCardStats("swordsman", 5)} />
        <div class="annotations">
          {#if page === 0}<p><b>HP</b> is the health pool you protect.</p><p><b>ATK</b> powers each hit.</p>
          {:else}<p><b>DEF</b> reduces incoming damage.</p><p><b>SPD</b> sets how often this hero acts.</p>{/if}
        </div>
      </div>
    </div>
    <figcaption>This is the same attributes panel used in hero details. Click an allied hero during combat to see current HP and stats with battle bonuses.</figcaption>
  {:else if topic === "traits" && page === 0}
    <div class="hero-preview">
      <UnitCard unitId={hero.unitId} stars={hero.stars} size="sm" />
      <div class="detail-preview">
        <h3>Swordsman’s traits</h3>
        {#each UNITS[hero.unitId].traits as trait, index}
          <div class="trait-row" class:locked={!activeTraits.includes(trait)}><strong>{TRAIT_SYNERGIES[trait].name}</strong><span>{activeTraits.includes(trait) ? "Unlocked" : `🔒 ${index === 1 ? 6 : 8} stars`}</span></div>
        {/each}
      </div>
    </div>
    <div class="thresholds">{#each TRAIT_SYNERGIES.brawler.thresholds as threshold, index}<div><b>{threshold} Brawlers</b><small>{TRAIT_SYNERGIES.brawler.tiers[index]}</small></div>{/each}</div>
    <figcaption>At 5 stars only the first regular trait contributes. More stars unlock the others; more matching heroes unlock stronger army bonuses.</figcaption>
  {:else if topic === "traits"}
    <div class="cards">{#each army as card}<div><UnitCard unitId={card.unitId} stars={card.stars} size="sm" /><span class="badge">Brawler +1</span></div>{/each}</div>
    <div class="synergy-result"><strong>Brawler {brawlers}/{TRAIT_SYNERGIES.brawler.thresholds.at(-1)}</strong><span>{TRAIT_SYNERGIES.brawler.tiers[brawlers - 2]} · Active</span><small>One more contribution reaches Army ATK +35%.</small></div>
    <figcaption>Only deployed heroes count. An ascended hero contributes +2 to each unlocked trait instead of +1.</figcaption>
  {:else if topic === "promotion"}
    <div class="promotion">
      <div><p>Before · {fromStars} stars</p><UnitCard unitId="swordsman" stars={fromStars} size="sm" /></div>
      <strong class="arrow">→</strong>
      <div><p>After · {toStars === 10 ? "✦ Ascended" : `${toStars} stars`}</p><UnitCard unitId="swordsman" stars={toStars} ascended={toStars === 10} size="sm" /></div>
    </div>
    <div class="cost"><h3>Promotion cost · consumed</h3><p>{cost.copies} extra Swordsman {cost.copies === 1 ? "copy" : "copies"}</p>{#each cost.resources as resource}<span>{resource.amount} {RESOURCES[resource.resource].name}</span>{/each}</div>
    <div class="stat-comparison">{#each ["hp", "atk", "def", "spd"] as key}<div><b>{key.toUpperCase()}</b><span>{beforeStats[key as keyof typeof beforeStats]} → {afterStats[key as keyof typeof afterStats]}</span></div>{/each}</div>
    <figcaption>{toStars === 10 ? "One gold star marks rank 10. Ascension adds extra stats and doubles trait contributions." : `Promoting to 6 stars unlocks ${TRAIT_SYNERGIES[UNITS.swordsman.traits[1]].name}, the Swordsman’s second trait.`}</figcaption>
  {:else if topic === "modes"}
    {#if page === 0}
      <div class="paths"><div><strong>⚔ Campaign</strong><span>Region → fights → boss</span><b>Win Tribute</b></div><div><strong>↓ The Abyss</strong><span>Clear 5 → 10 → 15…</span><b>Grow passive income</b></div></div>
    {:else}
      <div class="cards"><div><UnitCard unitId="mage" stars={3} size="sm" /><span>Starting pool · up to 3★</span></div><div><UnitCard unitId="swordsman" stars={4} size="sm" /><span>Iron Age · unlock 4★</span></div><div><UnitCard unitId="champion" stars={5} size="sm" /><span>Medieval · unlock 5★</span></div></div>
    {/if}
    <figcaption>Use Tribute to recruit heroes; use your growing army to progress in both modes.</figcaption>
  {/if}
</figure>

<style>
  figure { margin: 18px 0 0; padding: 18px; border: 1px solid #d9b66d40; border-radius: 12px; background: #d9b66d06; }
  figcaption { margin-top: 14px; font-size: 16px; line-height: 1.6; color: var(--muted-foreground); }
  .hero-preview { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; align-items: center; }
  .detail-preview { flex: 1; min-width: 180px; border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: var(--popover); }
  h3, .visual-heading { font-size: 18px; font-weight: 650; margin-bottom: 8px; }
  h3 span, .detail-preview > p { font-size: 16px; color: var(--muted-foreground); margin-bottom: 10px; }
  .annotations { margin-top: 12px; font-size: 17px; line-height: 1.8; }
  .annotations b { color: #edcf93; }
  figure:has(.matchups) { container-type: inline-size; }
  .matchups { display: grid; grid-template-columns: repeat(3, max-content); justify-content: space-between; gap: 20px 8px; }
  .matchup { display: flex; gap: 6px; align-items: center; justify-content: center; }
  .matchup > div { display: flex; flex-direction: column; align-items: center; font-size: 16px; }
  .matchup > span { color: #edcf93; font-size: 16px; text-align: center; }
  .matchup.weak > span { color: #f2a7a7; }
  @container (max-width: 560px) { .matchups { grid-template-columns: max-content; justify-content: center; } }
  small { display: block; font-size: 15px; }
  .visual-heading { text-align: center; }
  .formation { display: grid; grid-template-columns: 1fr minmax(0, 110px) minmax(0, 110px) 1fr; grid-template-rows: auto repeat(6, 58px); column-gap: 10px; }
  .column-label { grid-row: 1; text-align: center; font-size: 15px; color: var(--muted-foreground); margin-bottom: 6px; }
  .attacker-word { margin-left: 4px; }
  .attacker-side { grid-column: 4; grid-row: 2 / -1; align-self: center; font-size: 15px; color: var(--muted-foreground); white-space: nowrap; }
  .slot { min-width: 0; margin: 3px 0; text-align: center; border: 1px solid var(--border); border-radius: 8px; padding: 6px 2px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .slot b { display: block; font-size: 14px; }
  .slot.targeted { border-color: #edcf93; background: #d9b66d18; }
  .slot small { color: #edcf93; }
  .type-picker, .cycle { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 12px 0; font-size: 17px; }
  button { border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; cursor: pointer; }
  button[aria-pressed="true"] { color: #edcf93; border-color: #d9b66d; }
  button:focus-visible { outline: 2px solid #edcf93; outline-offset: 2px; }
  .trait-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 9px 0; border-top: 1px solid var(--border); font-size: 17px; }
  .trait-row span { color: #edcf93; font-size: 15px; }
  .locked { opacity: .55; }
  .thresholds, .stat-comparison { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 14px; }
  .thresholds > div, .stat-comparison > div { padding: 8px; background: var(--muted); border-radius: 6px; font-size: 16px; text-align: center; }
  .stat-comparison span { display: block; margin-top: 4px; color: #edcf93; }
  .cards { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
  .cards > div { display: flex; flex-direction: column; align-items: center; gap: 8px; max-width: 110px; font-size: 15px; text-align: center; }
  .badge, .synergy-result { border-radius: 6px; background: #d9b66d18; color: #edcf93; padding: 6px 10px; }
  .synergy-result { display: grid; gap: 4px; text-align: center; font-size: 18px; margin-top: 16px; }
  .promotion { display: flex; align-items: center; justify-content: center; gap: 20px; }
  .promotion > div { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .promotion p { font-size: 16px; }
  .arrow { color: #edcf93; font-size: 29px; }
  .cost { background: var(--muted); padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 17px; }
  .cost span { display: inline-block; margin: 6px 10px 0 0; font-size: 16px; color: var(--muted-foreground); }
  .paths { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .paths > div { display: grid; gap: 12px; padding: 16px; background: var(--muted); border-radius: 8px; font-size: 17px; }
  .paths b { color: #edcf93; }
  @media (max-width: 520px) { figure { padding: 12px; } .formation { column-gap: 6px; } .attacker-word { display: none; } .thresholds, .paths { grid-template-columns: repeat(2, 1fr); } .promotion { gap: 8px; } .stat-comparison > div { padding: 6px 2px; } }
</style>
