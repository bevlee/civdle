import { DAMAGE_STRONG, DAMAGE_WEAK, STAR_STAT_MULT, ULTIMATES } from "./combatData";
import { ATTACK_ORDER } from "./position";

export interface CombatSlide {
  id: string;
  label: string;
  title: string;
  intro: string;
  points: { title: string; body: string }[];
  tip: string;
}

export const COMBAT_TOPICS: CombatSlide[] = [
  {
    id: "types", label: "Weaknesses", title: "Pick the right matchup",
    intro: "Every hero has an attack type. The same matchup bonuses apply to basic attacks and ultimates.",
    points: [
      { title: `Strong · ×${DAMAGE_STRONG}`, body: "Attack the type you beat for 50% more damage." },
      { title: `Weak · ×${DAMAGE_WEAK}`, body: "Attack the type you are weak against for 25% less damage." },
      { title: "Same type · ×1", body: "Neither side gets a type advantage." },
    ],
    tip: "Inspect the enemy army before fighting. A balanced lineup gives you more ways to counter it.",
  },
  {
    id: "positions", label: "Positions", title: "Who gets hit first?",
    intro: `Basic attacks target living enemies in this order: ${ATTACK_ORDER.join(" → ")}. Empty and defeated positions are skipped.`,
    points: [
      { title: "Front row · 2 and 4", body: "Put durable heroes here to absorb early hits. Position 2 is targeted before 4." },
      { title: "Back row · 1, 3 and 5", body: "Shelter fragile damage dealers here, but watch out for ranged and magic ultimates." },
      { title: "Move before the fight", body: "Drag heroes onto slots or swap them. You can also click an empty position, then a hero. Formation changes are locked during combat." },
    ],
    tip: "This is targeting order, not turn order. A fast back-row hero can act before a slow front-row hero.",
  },
  {
    id: "stats", label: "Attributes", title: "Read your hero’s strengths",
    intro: "Click a hero to inspect their attributes, attack type and traits.",
    points: [
      { title: "HP · Health", body: "How much damage a hero can survive. At zero HP, they stop acting for the rest of that battle." },
      { title: "ATK · Attack", body: "Drives damage for both basic attacks and ultimates." },
      { title: "DEF · Defence", body: "Reduces incoming damage relative to the attacker’s ATK. Some traits ignore part of it." },
      { title: "SPD · Speed", body: "Determines how quickly a hero gets their next action. Faster heroes act more often and reach ultimates sooner." },
    ],
    tip: "Star up your units to increase their HP, ATK and DEF.",
  },
  {
    id: "attacks", label: "Attacks", title: "Basic, basic, ultimate",
    intro: "Combat runs automatically. Normally, every third personal action is an ultimate, replacing that hero’s basic attack.",
    points: Object.values(ULTIMATES).map(ultimate => ({ title: ultimate.name, body: ultimate.description })),
    tip: "Ranged ultimates hit the front row if the back row is empty. Ultimates can crit, but cannot be dodged or trigger extra hits. The charge markers show when a hero’s ultimate is coming.",
  },
  {
    id: "traits", label: "Traits", title: "Build bonuses across your army",
    intro: "Only deployed heroes contribute. Shared, unlocked traits activate bonuses for the whole army.",
    points: [
      { title: "Unlock more traits", body: "The first regular trait starts active. The second unlocks at 6 stars; the third at 8. A hero’s Ascendant trait is always active." },
      { title: "Reach the next tier", body: "Most traits have tiers at 2, 3, 4 and 5 contributions. Ascendant uses 1, 2, 3 and 4. Higher tiers replace the lower tier’s bonus." },
      { title: "Read the named badges", body: "Army trait badges show your count against the maximum threshold. Hover or focus a badge for each tier’s effect; hero details show locked traits and active bonuses." },
      { title: "Faster ultimates", body: "Ascendant reaches a two-action ultimate cycle at 2 contributions and a one-action cycle at 4." },
    ],
    tip: "Customise your army to take advantage of different trait bonuses for each stage.",
  },
  {
    id: "promotion", label: "Star up", title: "Turn duplicates into stronger heroes",
    intro: "Open a hero’s details and choose Promote when you have the required copies and resources.",
    points: [
      { title: "Copies are consumed", body: "Promotions use other copies of the same hero, starting with the lowest-star copies. Copies in your formation can be consumed too—check your lineup afterwards." },
      { title: "Costs grow with rank", body: "Ranks 2–5 cost one copy each. Ranks 6–10 require crafted resources too, and later ranks need more copies. The details panel lists the exact cost." },
      { title: "Power and trait unlocks", body: `Each star multiplies base HP, ATK and DEF by ${STAR_STAT_MULT} before rounding. The 6- and 8-star milestones also unlock traits.` },
      { title: "10 stars · ✦", body: "The maximum rank is shown as one gold star. Promotion to 10 grants ascension: an extra 20% HP, ATK and DEF, plus double trait contributions." },
    ],
    tip: "Base rarity and current star rank are different: promoting a hero improves their rank without changing their original rarity.",
  },
  {
    id: "modes", label: "Progression", title: "Choose your next fight",
    intro: "Campaign and the Depths share your army, but serve different goals.",
    points: [
      { title: "Campaign", body: "Fight through regions and their bosses. Wins advance the story and award Tribute." },
      { title: "The Depths", body: "Push an endless challenge with optional Auto. Every five cleared depths increases passive Tribute income." },
      { title: "Recruit with Tribute", body: "Spend Tribute on single summons or 10-card packs. Build the War Forge to unlock 4-star summons and the Master Forge for 5-star summons." },
      { title: "Scout and adapt", body: "Inspect enemy heroes, army traits and stat bonuses. If you lose, try different counters, positions, promotions or synergies." },
    ],
    tip: "A defeated hero is not deleted from your collection. Each new battle starts with full health.",
  },
  {
    id: "ready", label: "Ready", title: "Your pre-fight checklist",
    intro: "Start with a durable front line, then build the damage and synergies around it.",
    points: [
      { title: "1 · Scout", body: "Check enemy attack types, front-row targets and army bonuses." },
      { title: "2 · Arrange", body: "Fill up to five positions. Protect fragile heroes and check your trait thresholds." },
      { title: "3 · Watch", body: "Pause or slow playback to follow targets, damage and ultimate charge. Playback speed does not change hero attributes." },
      { title: "4 · Improve", body: "Use what you learn to swap heroes, promote duplicates or push another mode." },
    ],
    tip: "Reopen Combat guide any time to revisit a topic.",
  },
];

// Longer topics are split into focused pages while retaining topic shortcuts.
export const COMBAT_SLIDES = COMBAT_TOPICS.flatMap(topic => {
  const pageSize = topic.points.length > 3 ? 2 : 3;
  const pageCount = Math.ceil(topic.points.length / pageSize);
  return Array.from({ length: pageCount }, (_, page) => ({
    ...topic,
    points: topic.points.slice(page * pageSize, (page + 1) * pageSize),
    page,
    pageCount,
  }));
});
