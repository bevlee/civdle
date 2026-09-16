"use client";

import { useEffect } from "react";
import { AgeId } from "@/lib/gameData";
import { QueuedEvent } from "@/lib/useEventQueue";

interface AgeAdvanceEventData {
  ageId: AgeId;
  ageName: string;
  speedPct: number;
  outputPct: number;
}

// Thematic flash colors per age, per spec: bronze = amber, iron = slate,
// medieval = deep blue, renaissance = gold.
const AGE_FLASH_COLOR: Record<AgeId, string> = {
  stoneAge: "oklch(0.7 0.01 90)",
  bronzeAge: "oklch(0.72 0.15 65)",
  ironAge: "oklch(0.5 0.02 250)",
  medieval: "oklch(0.4 0.13 264)",
  renaissance: "oklch(0.82 0.16 95)",
};

// Full-screen, non-blocking effects layer for one-off celebratory moments
// (currently just Age Advance). Mounted once near the app root so it can
// render above every tab/panel.
export function AnimationOverlay({
  events,
  onDismiss,
}: {
  events: QueuedEvent[];
  onDismiss: (id: string) => void;
}) {
  const ageEvents = events.filter(
    (e): e is QueuedEvent<AgeAdvanceEventData> => e.type === "ageAdvance"
  );

  if (ageEvents.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {ageEvents.map((event) => (
        <AgeAdvanceEffect key={event.id} event={event} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function AgeAdvanceEffect({
  event,
  onDismiss,
}: {
  event: QueuedEvent<AgeAdvanceEventData>;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timeout = setTimeout(() => onDismiss(event.id), 1700);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- event/onDismiss are stable for the life of one event
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="animate-screen-flash absolute inset-0"
        style={{ backgroundColor: AGE_FLASH_COLOR[event.data.ageId] }}
      />
      <div
        className="animate-zoom-text rounded-2xl border-2 bg-background/90 px-8 py-5 text-center shadow-2xl"
        style={{ borderColor: AGE_FLASH_COLOR[event.data.ageId] }}
      >
        <p className="text-3xl font-black tracking-tight sm:text-5xl">
          Age of {event.data.ageName}!
        </p>
      </div>
    </div>
  );
}
