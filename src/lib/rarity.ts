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

export const GOLD_STAR_COLOR = "#facc15";
export const PURPLE_STAR_COLOR = "oklch(0.7 0.2 300)";

export type StarTier = "gold" | "purple";

/**
 * Stars as a row of up to five slots. 1–5★ fill gold slots; each star past 5
 * recolours one slot purple from the left (7★ = 2 purple + 3 gold), so the row
 * never shrinks as a unit improves. 10★ is ascended and shown as a single ✦.
 */
export function starSlots(stars: number): { slots: StarTier[]; maxed: boolean } {
  if (stars >= 10) return { slots: [], maxed: true };
  if (stars > 5) {
    const purple = stars - 5;
    return {
      slots: Array.from({ length: 5 }, (_, i) => (i < purple ? "purple" : "gold")),
      maxed: false,
    };
  }
  return { slots: Array(Math.max(0, stars)).fill("gold"), maxed: false };
}

export function starColor(tier: StarTier): string {
  return tier === "purple" ? PURPLE_STAR_COLOR : GOLD_STAR_COLOR;
}

export function starString(stars: number): string {
  const { slots, maxed } = starSlots(stars);
  return maxed ? "✦" : "★".repeat(slots.length);
}
