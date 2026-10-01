// The newest level-up in the event queue, for the phone Train screen's flash.

import type { SkillId } from "../gameData";

export interface LevelUpFlash {
  id: string;
  skillId: SkillId;
  newLevel: number;
}

export function latestLevelUp(events: { id: string; type: string; data: unknown }[]): LevelUpFlash | null {
  const event = events.findLast((e) => e.type === "levelUp");
  if (!event) return null;
  const { skillId, newLevel } = event.data as { skillId: SkillId; newLevel: number };
  return { id: event.id, skillId, newLevel };
}
