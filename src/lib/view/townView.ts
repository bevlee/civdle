// Small formatting and linking rules for the Town tab (Shop and Settlement).

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
