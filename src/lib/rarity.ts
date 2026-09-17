// Presentation helpers for card rarity (base star count) shared by cards,
// summon reveals and the inventory.

export const RARITY_COLORS: Record<number, string> = {
  1: "oklch(0.72 0.01 90)",
  2: "oklch(0.72 0.17 150)",
  3: "oklch(0.68 0.17 250)",
  4: "oklch(0.65 0.22 300)",
  5: "oklch(0.82 0.17 85)",
};

export const RARITY_NAMES: Record<number, string> = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Epic",
  5: "Legendary",
};

export function rarityColor(baseStars: number): string {
  return RARITY_COLORS[Math.max(1, Math.min(5, baseStars))];
}

export function starString(stars: number): string {
  return "★".repeat(stars);
}
