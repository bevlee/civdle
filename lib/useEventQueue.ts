"use client";

import { useCallback, useRef, useState } from "react";

export interface QueuedEvent<T = unknown> {
  id: string;
  type: string;
  data: T;
}

// A small queue of transient, self-dismissing UI events (level-ups, unlocks,
// age advances, floating "+N" text) so multiple animations can overlap
// without stepping on each other's state.
export function useEventQueue() {
  const [events, setEvents] = useState<QueuedEvent[]>([]);
  const counterRef = useRef(0);

  const emit = useCallback(<T,>(type: string, data: T) => {
    counterRef.current += 1;
    const id = `${type}-${counterRef.current}`;
    setEvents((prev) => [...prev, { id, type, data }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { events, emit, dismiss };
}
