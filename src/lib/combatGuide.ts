import { DAMAGE_STRONG, DAMAGE_WEAK, STAR_STAT_MULT } from "./combatData";
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
    id: "positions", label: "Positions", title: "Where to place heroes",
    intro: "Your army has five positions: two in the front row and three behind it. Where a hero stands decides how soon enemies can reach them.",
    points: [
      { title: "Front row · 2 and 4", body: "Put durable heroes here. Position 2 takes the first hits, then 4." },
      { title: "Back row · 1, 3 and 5", body: "Shelter fragile damage dealers here, but ranged and magic ultimates still reach them." },
      { title: "Move before the fight", body: "Drag heroes onto positions or swap them, or click an empty position, then a hero. Locked during combat." },
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
    id: "attacks", label: "Attacks", title: "Who basic attacks hit",
    intro: `Combat runs automatically. Each basic attack hits the first living enemy in order ${ATTACK_ORDER.join(" → ")}. When it falls, the next in line is targeted.`,
    points: [
      { title: "Front row first · 2, then 4", body: "Basic attacks stay on the front row until both are defeated." },
      { title: "Then the back row · 1, 3, 5", body: "Back-row heroes only take basic attacks once the front row falls." },
      { title: "Gaps are skipped", body: "Empty positions and defeated heroes are passed over." },
    ],
    tip: "Both armies follow the same order, so your own position 2 hero takes the first hits too.",
  },
  {
    id: "ultimates", label: "Ultimates", title: "Ultimates: every third action",
    intro: "Normally, every third personal action is an ultimate, replacing that hero’s basic attack. Each attack type has its own ultimate. Pick a type to see who it hits.",
    points: [
      { title: "Watch the charge", body: "The charge markers under each hero show when their ultimate is coming." },
      { title: "Crits, but no dodges", body: "Ultimates can crit, but cannot be dodged or trigger extra hits." },
      { title: "Matchups still apply", body: "Strong and weak type multipliers apply to ultimates just like basic attacks." },
    ],
    tip: "The back row is safe from basic attacks, not ultimates. Volley and Arcane Burst reach it straight away.",
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
    intro: "Campaign and The Abyss share your army, but serve different goals.",
    points: [
      { title: "Campaign", body: "Fight through regions and their bosses. Wins advance the story and award Tribute." },
      { title: "The Abyss", body: "Push an endless challenge with optional Auto. Every five cleared depths increases passive Tribute income." },
      { title: "Recruit with Tribute", body: "Spend Tribute on single summons or 10-card packs. Reach the Iron Age to unlock 4-star summons and Medieval for 5-star summons. Guaranteed 5-star summons need the Celestial Altar and Glory from the Conquest skill." },
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
