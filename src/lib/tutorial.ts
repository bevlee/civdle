export interface TutorialStep {
  id: string;
  title: string;
  body: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "attack-triangle",
    title: "The Attack Triangle",
    body: "Every unit is ⚔ Melee, 🏹 Ranged, or ✨ Magic. ⚔ beats 🏹, 🏹 beats ✨, ✨ beats ⚔. Strong hits deal ×1.5, weak hits deal ×0.75. Scout the enemy, then counter-pick.",
  },
  {
    id: "positioning",
    title: "Front & Back Row",
    body: "Your 5 positions have a front row (2 & 4) and back row (1, 3, 5). Enemies target the front row first — put your tanks there. Ranged ultimates bypass the front and hit the back row!",
  },
  {
    id: "ultimates",
    title: "Ultimate Attacks",
    body: "Every 3rd attack is an Ultimate. ⚔ Melee: 300% to one target. 🏹 Ranged: 200% to the entire back row. ✨ Magic: 125% to ALL enemies. Build your comp around these.",
  },
  {
    id: "synergies",
    title: "Trait Synergies",
    body: "Units share traits. Fill enough of one trait across your party and you unlock army-wide bonuses — ATK, DEF, crit chance, lifesteal, and more. Hover a trait chip for details.",
  },
  {
    id: "story-vs-depths",
    title: "Main Story vs The Depths",
    body: "The Main Story is 30 levels with a boss every 5. Each win pays Tribute. The Depths go forever, scale gently, can Auto, and pay passive Tribute for every 5 cleared.",
  },
];

export const TOTAL_TUTORIAL_STEPS = TUTORIAL_STEPS.length;
