// Pointer drag and drop for placing heroes on the battle board. Works the same
// with a mouse, a pen or a finger (HTML5 drag and drop never fires on touch).
//
// Mark each board slot with `data-party-slot="<0-based index>"` inside an element
// with `data-drag-board`, and a scrolling army list with `data-drag-scroll`.
// (Not `data-slot`: the shadcn components already use that attribute.)

import type { Action } from "svelte/action";
import { indexToPosition, isFrontRow } from "./position";

/** What is being dragged: a card from the army list, or a hero already on the board. */
export type DragSource =
  | { type: "card"; cardId: string }
  | { type: "slot"; slot: number; cardId: string };

/** What a drop does to the party. A swap is left to `movePartyCard`. */
export type DropResult = { assign: [cardId: string, slot: number] } | { remove: number };

export interface DragState {
  source: DragSource;
  /** Pointer position in viewport pixels. */
  x: number;
  y: number;
  /** The slot under the pointer, or null when it is off the board. */
  over: number | null;
}

/** Pixels the pointer must travel before a press becomes a drag rather than a tap. */
export const DRAG_THRESHOLD = 6;

/**
 * The party change for dropping `src` on `overSlot` (null = off the board).
 * A card from the army needs a slot; a hero dragged off the board leaves the party.
 */
export function resolveDrop(src: DragSource, overSlot: number | null): DropResult | null {
  if (overSlot === null) return src.type === "slot" ? { remove: src.slot } : null;
  if (src.type === "slot" && src.slot === overSlot) return null;
  return { assign: [src.cardId, overSlot] };
}

/** "Front · 2" / "Back · 1" for a 0-based slot index (even positions are the front row). */
export function slotName(slot: number): string {
  const position = indexToPosition(slot);
  return `${isFrontRow(position) ? "Front" : "Back"} · ${position}`;
}

/** The caption under the drag ghost. */
export function dragLabel(src: DragSource, overSlot: number | null): string {
  if (overSlot !== null) return `Place · ${slotName(overSlot)}`;
  return src.type === "slot" ? "Release to remove" : "Drop on a slot";
}

/**
 * What the first real movement of a press means. In a list that scrolls along
 * `scrollAxis`, movement mostly along that axis scrolls it; anything else drags.
 */
export function gestureIntent(dx: number, dy: number, scrollAxis: "x" | "y" | null): "wait" | "scroll" | "drag" {
  if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return "wait";
  if (scrollAxis === "x" && Math.abs(dx) > Math.abs(dy)) return "scroll";
  if (scrollAxis === "y" && Math.abs(dy) > Math.abs(dx)) return "scroll";
  return "drag";
}

export interface DragPlaceOptions {
  /** Null makes the element inert (an empty slot). */
  source: DragSource | null;
  /** A press that didn't move, or Enter/Space. */
  onTap?: () => void;
  onDrop?: (result: DropResult) => void;
  /** Formation locked (a battle is on): taps still work, drags don't. */
  locked?: boolean;
  /** Ghost updates while dragging; null when the drag ends. */
  onDragState?: (state: DragState | null) => void;
}

/** The board slot under a viewport point, if any. */
function slotAt(x: number, y: number): number | null {
  const slot = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-party-slot]");
  if (!slot?.closest("[data-drag-board]")) return null;
  const index = Number(slot.dataset.partySlot);
  return Number.isInteger(index) ? index : null;
}

/** Which way a list scrolls right now, or null when it has nothing to scroll. */
function scrollAxisOf(scroller: HTMLElement): "x" | "y" | null {
  const style = getComputedStyle(scroller);
  if (style.overflowX !== "hidden" && scroller.scrollWidth > scroller.clientWidth) return "x";
  if (style.overflowY !== "hidden" && scroller.scrollHeight > scroller.clientHeight) return "y";
  return null;
}

interface Gesture {
  pointerId: number;
  x0: number;
  y0: number;
  scroller: HTMLElement | null;
  axis: "x" | "y" | null;
  left0: number;
  top0: number;
  mode: "wait" | "scroll" | "drag" | "ignore";
}

/**
 * `use:dragPlace={{ source, onTap, onDrop, locked, onDragState }}`.
 * Give the element `touch-action: none` on the board, or `pan-x` / `pan-y` in a
 * list that scrolls that way, so the browser keeps native scrolling there.
 */
export const dragPlace: Action<HTMLElement, DragPlaceOptions> = (node, initial) => {
  let options = initial;
  let gesture: Gesture | null = null;

  function end(notify: boolean) {
    const g = gesture;
    gesture = null;
    if (!g) return;
    if (node.hasPointerCapture?.(g.pointerId)) node.releasePointerCapture(g.pointerId);
    window.removeEventListener("keydown", onKey);
    if (notify && g.mode === "drag") options.onDragState?.(null);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") end(true);
  }

  function down(e: PointerEvent) {
    if (!options.source || e.button > 0 || gesture) return;
    const scroller = options.source.type === "card" ? node.closest<HTMLElement>("[data-drag-scroll]") : null;
    gesture = {
      pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, scroller,
      axis: scroller ? scrollAxisOf(scroller) : null,
      left0: scroller?.scrollLeft ?? 0, top0: scroller?.scrollTop ?? 0, mode: "wait",
    };
    try { node.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
  }

  function move(e: PointerEvent) {
    const g = gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (g.mode === "wait") {
      const intent = gestureIntent(dx, dy, g.axis);
      if (intent === "wait") return;
      g.mode = intent === "drag" && (options.locked || !options.source) ? "ignore" : intent;
      if (g.mode === "drag") window.addEventListener("keydown", onKey);
    }
    if (g.mode === "scroll") {
      // Touch scrolls natively (touch-action); a mouse or pen scrolls the list by hand.
      if (e.pointerType !== "touch" && g.scroller) {
        if (g.axis === "y") g.scroller.scrollTop = g.top0 - dy;
        else g.scroller.scrollLeft = g.left0 - dx;
      }
      return;
    }
    if (g.mode !== "drag" || !options.source) return;
    e.preventDefault();
    options.onDragState?.({ source: options.source, x: e.clientX, y: e.clientY, over: slotAt(e.clientX, e.clientY) });
  }

  function up(e: PointerEvent) {
    const g = gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    end(true);
    if (g.mode === "wait") options.onTap?.();
    else if (g.mode === "drag" && options.source && !options.locked) {
      const result = resolveDrop(options.source, slotAt(e.clientX, e.clientY));
      if (result) options.onDrop?.(result);
    }
  }

  function cancel(e: PointerEvent) {
    if (gesture && e.pointerId === gesture.pointerId) end(true);
  }

  // Keyboard activation (Enter/Space) arrives as a click with no pointer press.
  function click(e: MouseEvent) {
    if (e.detail === 0 && options.source) options.onTap?.();
  }

  const noNativeDrag = (e: DragEvent) => e.preventDefault();

  node.addEventListener("pointerdown", down);
  node.addEventListener("pointermove", move);
  node.addEventListener("pointerup", up);
  node.addEventListener("pointercancel", cancel);
  node.addEventListener("lostpointercapture", cancel);
  node.addEventListener("click", click);
  node.addEventListener("dragstart", noNativeDrag);

  return {
    update(next) {
      options = next;
      // A battle started mid-drag: drop the ghost and do nothing on release.
      if (next.locked && gesture?.mode === "drag") end(true);
    },
    destroy() {
      end(true);
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", cancel);
      node.removeEventListener("lostpointercapture", cancel);
      node.removeEventListener("click", click);
      node.removeEventListener("dragstart", noNativeDrag);
    },
  };
};
