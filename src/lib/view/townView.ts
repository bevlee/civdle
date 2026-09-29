// Small formatting and linking rules for the Town tab (Shop and Settlement) and the achievement cards.

import type { ResourceId, SkillId } from "../gameData";
import { resourceSource } from "./resourceSource";
import { theAge } from "./summonBanners";
import type { OddsRow } from "./summonOdds";
import { usesJump, type UsesJump } from "./usesJump";

export type TownSegment = "shop" | "settlement";

/** The disabled build button's label: "Missing 1 material", "Missing 3 materials". */
export function missingLabel(count: number): string {
  return `Missing ${count} material${count === 1 ? "" : "s"}`;
}

/** Under the odds bar, when the age caps summons: "4★ from the Iron Age · 5★ from the Medieval era". */
export function lockedOddsNote(rows: OddsRow[]): string | null {
  const locked = rows
    .filter((r) => r.lockedUntil)
    .sort((a, b) => a.stars - b.stars)
    .map((r) => `${r.stars}★ from ${theAge(r.lockedUntil!)}`);
  return locked.length > 0 ? locked.join(" · ") : null;
}

/**
 * Where a short cost chip jumps: the skill and recipe that make the resource, under the same rule as
 * Train's input chips (never a locked skill; a recipe not yet reached opens the skill as it is).
 */
export function costJump(
  resource: ResourceId,
  levels: Record<SkillId, number>,
  unlocked: (id: SkillId) => boolean,
): UsesJump | null {
  return usesJump(resourceSource(resource), { levels, unlocked });
}

const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** When an achievement was unlocked: "Sep 14", with the year only when it isn't this year. */
export function formatUnlockDate(timestamp: number, now: number = Date.now()): string {
  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return (sameYear ? MONTH_DAY : MONTH_DAY_YEAR).format(date);
}
