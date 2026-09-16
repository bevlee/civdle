"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingText } from "@/components/FloatingText";
import { AGES, RESOURCES, ResourceId, SKILLS, SkillId } from "@/lib/gameData";
import { AgeAdvanceStatus, AgeBonus } from "@/lib/gameEngine";
import { QueuedEvent } from "@/lib/useEventQueue";
import { cn } from "@/lib/utils";

export function AgeDisplay({
  ageIndex,
  ageBonus,
  skillPoints,
  levels,
  resources,
  ageAdvanceStatus,
  onAdvance,
  events,
  onDismissEvent,
}: {
  ageIndex: number;
  ageBonus: AgeBonus;
  skillPoints: number;
  levels: Record<SkillId, number>;
  resources: Partial<Record<ResourceId, number>>;
  ageAdvanceStatus: AgeAdvanceStatus;
  onAdvance: () => void;
  events: QueuedEvent[];
  onDismissEvent: (id: string) => void;
}) {
  const age = AGES[ageIndex];
  const timeReductionPct = Math.round((1 - ageBonus.timeMult) * 100);
  const outputBonusPct = Math.round((ageBonus.outputMult - 1) * 100);

  const skillPointEvents = events.filter(
    (e): e is QueuedEvent<{ amount: number }> => e.type === "skillPoint"
  );
  const ageAdvanceEvents = events.filter(
    (e): e is QueuedEvent<{ ageName: string; speedPct: number; outputPct: number }> =>
      e.type === "ageAdvance"
  );

  const { nextAge, cost, skillsMet, resourcesMet, canAdvance } = ageAdvanceStatus;

  const checklist = nextAge
    ? [
        ...nextAge.condition.map((c) => ({
          label: `${SKILLS[c.skill].name} Lv ${c.level}`,
          current: levels[c.skill] ?? 0,
          required: c.level,
          met: (levels[c.skill] ?? 0) >= c.level,
        })),
        ...cost.map((c) => ({
          label: RESOURCES[c.resource].name,
          current: Math.floor(resources[c.resource] ?? 0),
          required: c.amount,
          met: (resources[c.resource] ?? 0) >= c.amount,
        })),
      ]
    : [];

  const missing = checklist.filter((c) => !c.met).map((c) => `${c.label} (${c.current}/${c.required})`);
  const disabledReason =
    !skillsMet || !resourcesMet ? `Still needed: ${missing.join(", ")}` : undefined;

  return (
    <header className="flex flex-col gap-3 border-b border-border px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">Civdle</h1>
          <Badge variant="secondary" className="text-sm">
            {age.name}
          </Badge>
          {ageIndex > 0 && (
            <span className="text-xs text-muted-foreground">
              -{timeReductionPct}% time, +{outputBonusPct}% output
            </span>
          )}
          {ageAdvanceEvents.map((event) => (
            <FloatingText
              key={event.id}
              id={event.id}
              text={`+${event.data.speedPct}% Speed`}
              className="text-sm text-amber-400"
              duration={1400}
              onDone={onDismissEvent}
            />
          ))}
        </div>
        <div className="relative flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Skill Points</span>
          <Badge className="text-sm">{skillPoints}</Badge>
          {skillPointEvents.map((event) => (
            <FloatingText
              key={event.id}
              id={event.id}
              text={`+${event.data.amount} SP`}
              className="right-0 left-auto text-sm text-emerald-400"
              onDone={onDismissEvent}
            />
          ))}
        </div>
      </div>

      {nextAge && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={onAdvance}
            disabled={!canAdvance}
            title={disabledReason}
            variant={canAdvance ? "default" : "secondary"}
            className={cn(canAdvance && "animate-pulse-glow")}
          >
            Advance to {nextAge.name}
          </Button>
          <div className="flex flex-wrap gap-2">
            {checklist.map((item) => (
              <span
                key={item.label}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs",
                  item.met
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-border text-muted-foreground"
                )}
              >
                {item.met ? "✓ " : ""}
                {item.label}
                {!item.met && ` (${item.current}/${item.required})`}
              </span>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
