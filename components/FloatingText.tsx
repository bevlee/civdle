"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

// A single "+N" / "+LEVEL UP!" style text that rises and fades, then removes
// itself from the parent's event queue. Must be rendered inside a
// `position: relative` ancestor with `key={id}` so repeated events restart
// the animation instead of reusing a stale DOM node.
export function FloatingText({
  id,
  text,
  className,
  duration = 1100,
  onDone,
}: {
  id: string;
  text: string;
  className?: string;
  duration?: number;
  onDone: (id: string) => void;
}) {
  useEffect(() => {
    const timeout = setTimeout(() => onDone(id), duration);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id/duration/onDone are stable for the life of one event
  }, []);

  return (
    <span
      className={cn(
        "animate-float-up pointer-events-none absolute left-1/2 top-0 z-10 whitespace-nowrap font-bold",
        className
      )}
    >
      {text}
    </span>
  );
}
