// Percentage of the way from the current level to the next, for skill XP bars.

import { xpForLevel } from "../gameEngine";

export function xpProgressPct(xp: number, level: number): number {
  if (level >= 99) return 100;
  const base = xpForLevel(level);
  const span = Math.max(1, xpForLevel(level + 1) - base);
  return Math.max(0, Math.min(100, ((xp - base) / span) * 100));
}
