"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FloatingText } from "@/components/FloatingText";
import { SKILL_ORDER, SKILLS, SkillId } from "@/lib/gameData";
import { GameState, xpForLevel } from "@/lib/gameEngine";
import { QueuedEvent } from "@/lib/useEventQueue";
import { cn } from "@/lib/utils";

export function SkillPanel({
  state,
  levels,
  selectedSkill,
  onSelect,
  events,
  onDismissEvent,
}: {
  state: GameState;
  levels: Record<SkillId, number>;
  selectedSkill: SkillId | null;
  onSelect: (id: SkillId) => void;
  events: QueuedEvent[];
  onDismissEvent: (id: string) => void;
}) {
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border p-3">
      <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</h2>
      {SKILL_ORDER.map((id) => {
        const skillState = state.skills[id];
        if (!skillState.unlocked) return null;
        const level = levels[id];
        const xpBase = xpForLevel(level);
        const xpNext = xpForLevel(Math.min(level + 1, 99));
        const span = Math.max(1, xpNext - xpBase);
        const pct = level >= 99 ? 100 : Math.min(100, ((skillState.xp - xpBase) / span) * 100);
        const isActive = state.activeSkill === id;

        return (
          <SkillRow
            key={id}
            id={id}
            level={level}
            pct={pct}
            isActive={isActive}
            isSelected={selectedSkill === id}
            onSelect={onSelect}
            events={events}
            onDismissEvent={onDismissEvent}
          />
        );
      })}
    </nav>
  );
}

interface LevelUpData {
  skillId: SkillId;
  newLevel: number;
}
interface SkillUnlockData {
  skillId: SkillId;
}

function SkillRow({
  id,
  level,
  pct,
  isActive,
  isSelected,
  onSelect,
  events,
  onDismissEvent,
}: {
  id: SkillId;
  level: number;
  pct: number;
  isActive: boolean;
  isSelected: boolean;
  onSelect: (id: SkillId) => void;
  events: QueuedEvent[];
  onDismissEvent: (id: string) => void;
}) {
  const levelUpEvent = events.find(
    (e): e is QueuedEvent<LevelUpData> =>
      e.type === "levelUp" && (e.data as LevelUpData).skillId === id
  );
  const unlockEvent = events.find(
    (e): e is QueuedEvent<SkillUnlockData> =>
      e.type === "skillUnlock" && (e.data as SkillUnlockData).skillId === id
  );

  useEffect(() => {
    if (!unlockEvent) return;
    const timeout = setTimeout(() => onDismissEvent(unlockEvent.id), 1500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when this specific event changes
  }, [unlockEvent?.id]);

  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        "relative flex flex-col gap-1 overflow-hidden rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
        isSelected && "bg-accent",
        unlockEvent && "animate-slide-in-right"
      )}
    >
      {levelUpEvent && (
        <div
          key={`${levelUpEvent.id}-flash`}
          className="animate-flash-gold pointer-events-none absolute inset-0 bg-amber-400/40"
        />
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          {SKILLS[id].name}
          {isActive && <span className="text-green-500">●</span>}
          {unlockEvent && (
            <Badge className="h-4 px-1 text-[10px] leading-none">NEW</Badge>
          )}
        </span>
        <span className="text-muted-foreground">Lv {level}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
      {levelUpEvent && (
        <FloatingText
          key={levelUpEvent.id}
          id={levelUpEvent.id}
          text="+LEVEL UP!"
          className="text-xs text-amber-400"
          duration={1100}
          onDone={onDismissEvent}
        />
      )}
    </button>
  );
}
