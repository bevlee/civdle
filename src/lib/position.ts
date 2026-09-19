// Position system for the 5-slot battle layout.
// Positions 2 & 4 are the front row (targeted first).
// Positions 1, 3 & 5 are the back row.
//
// This module must NOT import from combatEngine to avoid circular deps.

import type { AttackType } from "./combatData";

/** 1-indexed slot in the battle formation (1–5). */
export type Position = 1 | 2 | 3 | 4 | 5;

/** All valid positions. */
export const POSITIONS: readonly Position[] = [1, 2, 3, 4, 5] as const;

/** Front-row positions (targeted first). */
export const FRONT_ROW: readonly Position[] = [2, 4] as const;

/** Back-row positions. */
export const BACK_ROW: readonly Position[] = [1, 3, 5] as const;

/** Order in which positions attack: front row first, then back row. */
export const ATTACK_ORDER: readonly Position[] = [2, 4, 1, 3, 5] as const;

/** Returns true when the position is in the front row. */
export function isFrontRow(position: Position): boolean {
  return position === 2 || position === 4;
}

/** Returns true when the position is in the back row. */
export function isBackRow(position: Position): boolean {
  return position === 1 || position === 3 || position === 5;
}

/** Convert a 0-based array index to a 1-indexed position. */
export function indexToPosition(index: number): Position {
  const pos = index + 1;
  if (pos < 1 || pos > 5) {
    throw new RangeError(`Index ${index} out of range for positions 1–5`);
  }
  return pos as Position;
}

/**
 * Select the first alive opponent in attack order (front row first: 2, 4, 1, 3, 5).
 * Returns `undefined` when no candidate is alive.
 *
 * Uses a generic constraint so this module stays free of combatEngine imports.
 */
export function selectTarget<T extends { position: number; hp: number }>(
  candidates: T[],
): T | undefined {
  for (const pos of ATTACK_ORDER) {
    const t = candidates.find((c) => c.position === pos && c.hp > 0);
    if (t) return t;
  }
  return undefined;
}

/**
 * Select ultimate targets based on the attacker's attack type.
 * - melee: single target (first in attack order, same as basic attacks)
 * - ranged: all alive back-row enemies; if none alive, all alive front-row
 * - magic: all alive enemies
 *
 * Returns an empty array when no candidates are alive.
 */
export function selectUltimateTargets<T extends { position: number; hp: number }>(
  attackType: AttackType,
  candidates: T[],
): T[] {
  const alive = candidates.filter((c) => c.hp > 0);
  if (alive.length === 0) return [];

  switch (attackType) {
    case "melee": {
      const t = selectTarget(alive);
      return t ? [t] : [];
    }
    case "ranged": {
      const backRow = alive.filter((c) => isBackRow(c.position as Position));
      if (backRow.length > 0) return backRow;
      return alive.filter((c) => isFrontRow(c.position as Position));
    }
    case "magic":
      return alive;
  }
}
