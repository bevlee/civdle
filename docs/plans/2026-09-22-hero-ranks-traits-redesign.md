# Hero Ranks & Traits Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the merge system with a promotion system using copies + crafted resources, expand traits from 2→3 per hero with tier 3/4 effects, and add 10★ ascension bonuses.

**Architecture:** Data-layer changes in combatData/traits/gameData define the new promotion costs, trait assignments, and synergy tiers. The combat engine adds 5 new ArmyMods fields for T4 effects. Game state replaces mergeCards with promoteCard. UI components update CardDetailModal (promote button + resource costs) and ArmySynergies (4 tiers).

**Tech Stack:** SvelteKit, TypeScript, Vitest

---

### Task 1: Add new resources (enchantedGear, starstone)

**Files:**
- Modify: `src/lib/gameData.ts` (ResourceId type, RESOURCES map, smithing recipes)

**Step 1: Add resource types**

Add `"enchantedGear"` and `"starstone"` to the `ResourceId` union type and `RESOURCES` map.

**Step 2: Add enchantedGear recipe to smithing**

```typescript
{
  id: "enchantedGear",
  name: "Enchanted Gear",
  requiredLevel: 60,
  inputs: [
    { resource: "steelBar", amount: 2 },
    { resource: "cloth", amount: 2 },
    { resource: "ale", amount: 1 },
  ],
  outputs: [{ resource: "enchantedGear", amount: 1 }],
},
```

**Step 3: Add starstone recipe to smithing**

```typescript
{
  id: "starstone",
  name: "Starstone",
  requiredLevel: 80,
  inputs: [
    { resource: "steelBar", amount: 5 },
    { resource: "enchantedGear", amount: 2 },
    { resource: "mead", amount: 3 },
  ],
  outputs: [{ resource: "starstone", amount: 1 }],
},
```

**Step 4: Commit**

---

### Task 2: Add 3rd trait to all units + update UnitCard

**Files:**
- Modify: `src/lib/combatData.ts` (UNIT_LIST traits, UnitCard interface)
- Modify: `src/lib/combatData.test.ts`

**Step 1: Add `ascended` field to UnitCard**

```typescript
export interface UnitCard {
  id: string;
  unitId: UnitId;
  stars: number;
  ascended?: boolean;
}
```

**Step 2: Update createCard to never set ascended**

No change needed — `ascended` is optional and defaults to undefined/false.

**Step 3: Add 3rd trait to all 48 units**

Update every unit in UNIT_LIST. The 3rd trait is the last one in the array; it unlocks at 8★.

Barbarian:
- goblin: ["swarm", "brawler", "striker"]
- wolf-rider: ["assassin", "charger", "skirmisher"]
- orc: ["brawler", "striker", "bruiser"]
- ogre: ["brawler", "tank", "defender"]
- ram-rider: ["controller", "disruptor", "bruiser"]
- cyclops: ["artillery", "bruiser", "executioner"]
- thunderbird: ["charger", "striker", "skirmisher"]
- behemoth: ["tank", "disruptor", "brawler", "ascendant"]

Knight:
- peasant: ["swarm", "defender", "support"]
- archer: ["ranger", "artillery", "striker"]
- griffin: ["defender", "skirmisher", "charger"]
- standard-bearer: ["support", "defender", "tank"]
- swordsman: ["brawler", "defender", "bruiser"]
- monk: ["support", "sustainer", "controller"]
- cavalier: ["charger", "brawler", "executioner"]
- champion: ["charger", "executioner", "brawler", "ascendant"]

Wizard:
- gremlin: ["support", "swarm", "ranger"]
- stone-golem: ["tank", "defender", "bruiser"]
- mage: ["ranger", "striker", "artillery"]
- bilehorn: ["bruiser", "disruptor", "tank"]
- naga: ["brawler", "bruiser", "sustainer"]
- siege-golem: ["tank", "artillery", "defender"]
- giant: ["artillery", "executioner", "brawler"]
- titan: ["artillery", "striker", "controller", "ascendant"]

Necromancer:
- skeleton: ["swarm", "brawler", "disruptor"]
- zombie: ["tank", "controller", "defender"]
- ghost: ["skirmisher", "disruptor", "assassin"]
- blood-acolyte: ["sustainer", "support", "controller"]
- vampire: ["assassin", "sustainer", "skirmisher"]
- lich: ["ranger", "controller", "disruptor"]
- black-knight: ["bruiser", "executioner", "striker"]
- bone-dragon: ["tank", "disruptor", "controller", "ascendant"]

Ranger:
- sprite: ["skirmisher", "swarm", "support"]
- wood-elf: ["ranger", "skirmisher", "assassin"]
- outrider: ["charger", "skirmisher", "striker"]
- dendroid: ["tank", "controller", "sustainer"]
- pegasus: ["assassin", "skirmisher", "charger"]
- grand-elf: ["ranger", "striker", "artillery"]
- battle-dwarf: ["bruiser", "executioner", "defender"]
- unicorn: ["striker", "controller", "support", "ascendant"]

Demon:
- imp: ["swarm", "disruptor", "controller"]
- gog: ["ranger", "artillery", "executioner"]
- hell-hound: ["striker", "charger", "assassin"]
- demon: ["brawler", "sustainer", "tank"]
- blood-fiend: ["sustainer", "bruiser", "striker"]
- pit-fiend: ["support", "bruiser", "disruptor"]
- efreet: ["skirmisher", "striker", "assassin"]
- devil: ["assassin", "executioner", "striker", "ascendant"]

**Step 4: Update test for trait count**

Change test from "2 traits (3 for ascendants)" to "3 traits (4 for ascendants)":
```typescript
const expected = def.traits.includes("ascendant") ? 4 : 3;
```

**Step 5: Commit**

---

### Task 3: Replace merge with promotion system

**Files:**
- Modify: `src/lib/combatData.ts` (replace canMerge/mergeCards with promotion functions)
- Modify: `src/lib/combatData.test.ts`

**Step 1: Define promotion costs**

```typescript
export interface PromotionCost {
  copies: number;
  resources: { resource: ResourceId; amount: number }[];
}

export const PROMOTION_COSTS: Record<number, PromotionCost> = {
  2: { copies: 1, resources: [] },
  3: { copies: 1, resources: [] },
  4: { copies: 1, resources: [] },
  5: { copies: 1, resources: [] },
  6: { copies: 1, resources: [{ resource: "preparedMeal", amount: 5 }] },
  7: { copies: 2, resources: [{ resource: "cloth", amount: 5 }] },
  8: { copies: 3, resources: [{ resource: "steelTools", amount: 3 }] },
  9: { copies: 4, resources: [{ resource: "enchantedGear", amount: 2 }] },
  10: {
    copies: 5,
    resources: [
      { resource: "preparedMeal", amount: 10 },
      { resource: "cloth", amount: 10 },
      { resource: "steelTools", amount: 5 },
      { resource: "enchantedGear", amount: 3 },
      { resource: "starstone", amount: 1 },
    ],
  },
};
```

**Step 2: Add promotion helper functions**

```typescript
export function getPromotionCost(targetStars: number): PromotionCost | null {
  return PROMOTION_COSTS[targetStars] ?? null;
}

export function canPromote(
  card: UnitCard,
  allCards: UnitCard[],
  resources: Partial<Record<ResourceId, number>>,
): boolean {
  if (card.stars >= MAX_STARS) return false;
  const cost = PROMOTION_COSTS[card.stars + 1];
  if (!cost) return false;
  const copies = allCards.filter((c) => c.id !== card.id && c.unitId === card.unitId);
  if (copies.length < cost.copies) return false;
  for (const { resource, amount } of cost.resources) {
    if ((resources[resource] ?? 0) < amount) return false;
  }
  return true;
}

export function promoteCard(card: UnitCard): UnitCard {
  const newStars = card.stars + 1;
  return {
    id: card.id,
    unitId: card.unitId,
    stars: newStars,
    ascended: newStars >= MAX_STARS ? true : undefined,
  };
}
```

**Step 3: Keep canMerge/mergeCards for backward compat but mark deprecated, or remove them**

Remove `canMerge` and `mergeCards` — replace all call sites with promote equivalents.

**Step 4: Update tests**

Replace merge tests with promotion tests.

**Step 5: Commit**

---

### Task 4: Expand trait synergy system (tiers 3/4, trait unlock gates, 10★ amplifier)

**Files:**
- Modify: `src/lib/traits.ts` (ArmyMods, TraitSynergy, thresholds, tier effects, countTraits, tierFor)
- Modify: `src/lib/traits.test.ts`

**Step 1: Add new ArmyMods fields**

```typescript
export interface ArmyMods {
  // ... existing fields ...
  critMult: number;       // default 2, assassin T4 sets to 3
  firstHitCrit: boolean;  // default false, charger T4 sets true
  enemyAtkMult: number;   // default 1, controller T4 sets to 0.8
  executeThreshold: number; // default 0.5, executioner T4 sets to 0.3
  tripleHitChance: number; // default 0, swarm T4 adds 0.15
}
```

Update `neutralMods()` with defaults.

**Step 2: Update TraitSynergy to support 4 tiers**

```typescript
export interface TraitSynergy {
  name: string;
  description: string;
  thresholds: number[];   // was [number, number], now number[]
  tiers: string[];         // was [string, string], now string[]
  apply: (mods: ArmyMods, tier: number) => void;
}
```

**Step 3: Update all 17 TRAIT_SYNERGIES with 4 tiers**

Each trait gets thresholds [2, 3, 4, 5] (ascendant: [1, 2, 3, 4]) and 4 tier descriptions + apply functions.

Full tier effects:

| Trait | T1 | T2 | T3 (4) | T4 (5) |
|-------|----|----|--------|--------|
| brawler | ATK +10% | ATK +20% | ATK +35% | ATK +50% |
| ranger | Ignore 25% DEF | Ignore 50% DEF | Ignore 75% DEF | Ignore 100% DEF |
| tank | HP +15% | HP +30% | HP +50% | HP +70%, DEF +20% |
| assassin | 15% crit | 30% crit | 45% crit | 60% crit, crits 3× |
| support | 5% heal/turn | 10% heal/turn | 15% heal/turn | 20% heal/turn, +15% lifesteal |
| charger | SPD +2 | SPD +4 | SPD +4, ATK +30% | SPD +4, ATK +30%, first hit crit |
| controller | Enemy SPD -2 | -4 | -6 | -8, enemy ATK -20% |
| artillery | Ult +50% | +100% | +150% | +200% |
| skirmisher | 15% dodge | 30% | 45% | 50%, SPD +4 |
| bruiser | ATK/DEF +8% | +15% | +25% | +40% |
| executioner | +50% vs <50% HP | +100% | +150% | +200% vs <30% HP |
| sustainer | 15% lifesteal | 30% | 45% | 60%, 5% heal/turn |
| swarm | 20% double-hit | 40% | 60% | 80%, 15% triple-hit |
| defender | DEF +20% | +40% | +60% | DEF +80%, HP +20% |
| disruptor | Enemy DEF -15% | -30% | -45% | -60%, ignore 25% DEF |
| striker | Basic +15% | +30% | +50% | +70%, ATK +15% |
| ascendant | +20% all | +40% all, ult/2 | +60% all, ult/2 | +80% all, ult/1 |

**Step 4: Update countTraits for trait unlock gates and 10★ amplifier**

```typescript
export function countTraits(cards: UnitCard[]): Map<Trait, number> {
  const counts = new Map<Trait, number>();
  for (const card of cards) {
    const unit = UNITS[card.unitId];
    const traits = unit.traits;
    for (let i = 0; i < traits.length; i++) {
      const trait = traits[i];
      // Ascendant trait is always active
      if (trait === "ascendant") {
        const add = card.ascended ? 2 : 1; // 10★ amplifier
        counts.set(trait, (counts.get(trait) ?? 0) + add);
        continue;
      }
      // Regular traits: 1st always active, 2nd at 6★, 3rd at 8★
      const regularIndex = trait === "ascendant" ? -1 : traits.indexOf(trait);
      // Count position among non-ascendant traits
      const nonAscTraits = traits.filter(t => t !== "ascendant");
      const posInRegular = nonAscTraits.indexOf(trait);
      if (posInRegular === 0 || (posInRegular === 1 && card.stars >= 6) || (posInRegular === 2 && card.stars >= 8)) {
        const add = card.ascended ? 2 : 1; // 10★ amplifier
        counts.set(trait, (counts.get(trait) ?? 0) + add);
      }
    }
  }
  return counts;
}
```

**Step 5: Update tierFor to handle variable threshold counts**

```typescript
export function tierFor(trait: Trait, count: number): number {
  const thresholds = TRAIT_SYNERGIES[trait].thresholds;
  let tier = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (count >= thresholds[i]) tier = i + 1;
  }
  return tier;
}
```

**Step 6: Update activeSynergies for new tier range and nextThreshold**

**Step 7: Update tests**

**Step 8: Commit**

---

### Task 5: Update combat engine for new ArmyMods and 10★ stat boost

**Files:**
- Modify: `src/lib/combatEngine.ts` (computeDamage, stepBattle basic attack)
- Modify: `src/lib/combatData.ts` (computeCardStats for ascended bonus)
- Modify: `src/lib/combatEngine.test.ts`

**Step 1: Update computeCardStats for 10★ bonus**

```typescript
export function computeCardStats(card: UnitCard): CardStats;
export function computeCardStats(unitId: UnitId, stars: number, ascended?: boolean): CardStats;
export function computeCardStats(cardOrUnitId: UnitCard | UnitId, stars?: number, ascended?: boolean): CardStats {
  let unitId: UnitId, s: number, asc: boolean;
  if (typeof cardOrUnitId === "object") {
    unitId = cardOrUnitId.unitId;
    s = cardOrUnitId.stars;
    asc = !!cardOrUnitId.ascended;
  } else {
    unitId = cardOrUnitId;
    s = stars!;
    asc = !!ascended;
  }
  const def = UNITS[unitId];
  let mult = Math.pow(STAR_STAT_MULT, Math.max(0, s - def.baseStars));
  if (asc) mult *= 1.2; // 10★ ascended bonus
  return {
    hp: Math.floor(def.hp * mult),
    atk: Math.floor(def.atk * mult),
    def: Math.floor(def.def * mult),
    spd: def.spd,
  };
}
```

**Step 2: Update computeDamage for new ArmyMods**

```typescript
if (crit) dmg *= mods.critMult; // was hardcoded 2
if (target.hp < target.maxHp * mods.executeThreshold) dmg *= 1 + mods.executeBonus; // was 0.5
```

**Step 3: Update stepBattle basic attack for firstHitCrit and tripleHitChance**

```typescript
// Determine number of strikes
let strikes = 1;
if (rand() < own.doubleHitChance) strikes = 2;
if (strikes >= 2 && rand() < own.tripleHitChance) strikes = 3;

// First hit crit
const isCrit = (own.firstHitCrit && actor.turns === 1 && i === 0) || rand() < own.critChance;
```

**Step 4: Apply enemyAtkMult in cardToFighter**

```typescript
atk: Math.max(1, Math.floor(s.atk * own.atkMult * opp.enemyAtkMult)),
```

Wait — `enemyAtkMult` is applied by the opponent's mods to reduce our ATK. Actually the existing pattern for `enemyDefMult` is: `s.def * own.defMult * opp.enemyDefMult`. So `enemyAtkMult` follows the same pattern: `s.atk * own.atkMult * opp.enemyAtkMult`.

**Step 5: Update tests**

**Step 6: Commit**

---

### Task 6: Update gameState for promotion + Depths starstone milestones

**Files:**
- Modify: `src/lib/gameState.svelte.ts` (replace mergeCards method, add promoteCard, depths milestones)
- Modify: `src/lib/combatData.ts` (export DEPTHS_STARSTONE_INTERVAL)

**Step 1: Add DEPTHS_STARSTONE_INTERVAL constant**

```typescript
export const DEPTHS_STARSTONE_INTERVAL = 25;
```

**Step 2: Replace mergeCards with promoteCard in gameState**

```typescript
promoteCard(cardId: string): void {
  if (this.inBattle) return;
  const cards = this.state.gacha.cards;
  const card = cards.find((c) => c.id === cardId);
  if (!card || card.stars >= MAX_STARS) return;
  const cost = getPromotionCost(card.stars + 1);
  if (!cost) return;

  // Check copies
  const copies = cards.filter((c) => c.id !== card.id && c.unitId === card.unitId);
  if (copies.length < cost.copies) return;

  // Check resources
  const resources = { ...this.state.resources };
  for (const { resource, amount } of cost.resources) {
    if ((resources[resource] ?? 0) < amount) return;
  }

  // Consume resources
  for (const { resource, amount } of cost.resources) {
    resources[resource] = (resources[resource] ?? 0) - amount;
  }

  // Consume copies (lowest star first)
  const sortedCopies = [...copies].sort((a, b) => a.stars - b.stars);
  const consumedIds = new Set(sortedCopies.slice(0, cost.copies).map((c) => c.id));

  // Promote
  const promoted = promoteCard(card);
  const party = this.state.gacha.party.map((id) => (id === cardId ? promoted.id : consumedIds.has(id!) ? null : id));

  this.#setGacha({
    cards: [...cards.filter((c) => c.id !== cardId && !consumedIds.has(c.id)), promoted],
    party,
  });
  this.state = { ...this.state, resources };
  this.#bumpStats({ merges: this.state.stats.merges + 1 });
  this.eventQueue.emit<StarUpEventData>("starUp", {
    unitId: promoted.unitId,
    fromStars: card.stars,
    toStars: promoted.stars,
  });
}
```

**Step 3: Add starstone milestone to depths victory handling**

When depths cleared reaches a multiple of 25, grant 1 starstone.

**Step 4: Replace mergePartnersFor with promotionInfoFor**

**Step 5: Commit**

---

### Task 7: Update UI components

**Files:**
- Modify: `src/lib/components/CardDetailModal.svelte`
- Modify: `src/lib/components/CombatView.svelte`
- Modify: `src/lib/components/ArmyInventory.svelte`
- Modify: `src/lib/components/ArmySynergies.svelte`

**Step 1: Update CardDetailModal — promote button replaces merge**

Show "Promote X★ → Y★" button with resource costs listed. Show which resources are missing. Show copy count available.

Show trait unlock status: which traits are active vs locked (6★/8★ gates).

**Step 2: Update ArmySynergies — show 4 tiers**

The tooltip already iterates `definition.tiers` and `definition.thresholds`, so expanding from 2→4 entries should work with minimal changes.

**Step 3: Update CombatView — replace merge handler with promote handler**

**Step 4: Update ArmyInventory — replace canMerge highlighting with canPromote**

**Step 5: Commit**

---

### Task 8: Add 10★ visual effects

**Files:**
- Modify: `src/lib/components/UnitCard.svelte` (golden star display at 10★)
- Modify: battlefield sprite component (ascension glow animation)

**Step 1: Update star display at 10★**

Instead of 10 small stars, show a single large golden star with glow.

**Step 2: Add ascension glow CSS animation**

Golden pulsing radial gradient or shimmer overlay on battlefield sprites for ascended units.

**Step 3: Commit**

---

### Task 9: Run all tests and fix

**Step 1:** Run `npm run test` / `npx vitest run`
**Step 2:** Fix any failures
**Step 3:** Final commit
