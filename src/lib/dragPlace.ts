// Pointer drag and drop for placing heroes on the battle board. Works the same
// with a mouse, a pen or a finger (HTML5 drag and drop never fires on touch).
//
// Mark each board slot with `data-party-slot="<0-based index>"` inside an element
// with `data-drag-board`, and a scrolling army list with `data-drag-scroll="x"` or
// `"y"` (the way it scrolls). (Not `data-slot`: shadcn already uses that attribute.)

import type { Action } from "svelte/action";
import { indexToPosition, isFrontRow } from "./position";

/** What is being dragged: a card from the army list, or a hero already on the board. */
export type DragSource =
  | { type: "card"; cardId: string }
  | { type: "slot"; slot: number; cardId: string };

/** What a drop does to the party. A swap is left to `movePartyCard`. */
export type DropResult = { assign: [cardId: string, slot: number] } | { remove: number };

/** Where the pointer is: a slot, a gap on the board ("board"), or off the board (null). */
export type DropTarget = number | "board" | null;

/** The way a list scrolls, from its `data-drag-scroll`. */
export type ScrollAxis = "x" | "y" | null;

export interface DragState {
  source: DragSource;
  /** Pointer position in viewport pixels. */
  x: number;
  y: number;
  over: DropTarget;
}

/** Pixels the pointer must travel before a press becomes a drag rather than a tap. */
export const DRAG_THRESHOLD = 6;

/** How long a finger rests on a card in a scrolling list before it lifts (then drags any way). */
export const HOLD_MS = 350;

/**
 * The party change for dropping `src` on `overSlot`. A card from the army needs a
 * slot; a hero dragged off the board leaves the party; a gap on the board does nothing.
 */
export function resolveDrop(src: DragSource, overSlot: DropTarget): DropResult | null {
  if (overSlot === "board") return null;
  if (overSlot === null) return src.type === "slot" ? { remove: src.slot } : null;
  if (src.type === "slot" && src.slot === overSlot) return null;
  return { assign: [src.cardId, overSlot] };
}

/** "Front · 2" / "Back · 1" for a 0-based slot index (even positions are the front row). */
export function slotName(slot: number): string {
  const position = indexToPosition(slot);
  return `${isFrontRow(position) ? "Front" : "Back"} · ${position}`;
}

/** "F2" / "B1": a slot as a short badge (see slotName). */
export function slotTag(slot: number): string {
  const position = indexToPosition(slot);
  return `${isFrontRow(position) ? "F" : "B"}${position}`;
}

/** The caption under the drag ghost. */
export function dragLabel(src: DragSource, overSlot: DropTarget): string {
  if (typeof overSlot === "number") return `Place · ${slotName(overSlot)}`;
  return src.type === "slot" && overSlot === null ? "Release to remove" : "Drop on a slot";
}

/**
 * What the first real movement of a press means. A finger in a list that scrolls
 * along `scrollAxis` scrolls it when it moves mostly that way; anything else drags.
 * A mouse or pen always drags (the wheel scrolls). A finger that rests first lifts (see HOLD_MS).
 */
export function gestureIntent(dx: number, dy: number, scrollAxis: ScrollAxis, pointerType: string): "wait" | "scroll" | "drag" {
  if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return "wait";
  if (pointerType !== "touch") return "drag";
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
  /**
   * Ghost updates while dragging; null when the drag ends. On a release that places
   * the hero, `onDrop` runs first, so a null right after it means the drop landed.
   */
  onDragState?: (state: DragState | null) => void;
}

/** What is under a viewport point: a board slot, a gap on the board, or nothing. */
function dropTargetAt(x: number, y: number): DropTarget {
  const hit = document.elementFromPoint(x, y);
  const board = hit?.closest("[data-drag-board]");
  if (!hit || !board) return null;
  const slot = hit.closest<HTMLElement>("[data-party-slot]");
  const index = Number(slot?.dataset.partySlot);
  return slot && board.contains(slot) && Number.isInteger(index) ? index : "board";
}

/** The axis the list around `node` declares it scrolls along. */
function scrollAxisOf(node: HTMLElement): ScrollAxis {
  const axis = node.closest<HTMLElement>("[data-drag-scroll]")?.dataset.dragScroll;
  return axis === "x" || axis === "y" ? axis : null;
}

interface Gesture {
  pointerId: number;
  pointerType: string;
  x0: number;
  y0: number;
  axis: ScrollAxis;
  mode: "wait" | "scroll" | "drag" | "ignore";
  hold: ReturnType<typeof setTimeout> | null;
  /** Lifted by a hold and not yet moved past DRAG_THRESHOLD: a release here drops nothing. */
  resting: boolean;
}

// One gesture at a time across every element (a second finger does nothing).
let activeGesture: Gesture | null = null;

/**
 * `use:dragPlace={{ source, onTap, onDrop, locked, onDragState }}`.
 * Give the element `touch-action: none` on the board, or `pan-x` / `pan-y` in a
 * list that scrolls that way, so the browser keeps native touch scrolling there.
 * In such a list a finger scrolls it, or rests HOLD_MS to lift the card and drag any way.
 */
export const dragPlace: Action<HTMLElement, DragPlaceOptions> = (node, initial) => {
  let options = initial;
  let gesture: Gesture | null = null;

  function end(notify: boolean) {
    const g = gesture;
    gesture = null;
    if (!g) return;
    if (g.hold) clearTimeout(g.hold);
    if (activeGesture === g) activeGesture = null;
    if (node.hasPointerCapture?.(g.pointerId)) node.releasePointerCapture(g.pointerId);
    window.removeEventListener("keydown", onKey);
    if (notify && g.mode === "drag") options.onDragState?.(null);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") end(true);
  }

  // A finger resting on a card in a scrolling list lifts it. A locked card stays a tap.
  function lift(g: Gesture) {
    g.hold = null;
    if (gesture !== g || g.mode !== "wait" || !options.source || options.locked) return;
    g.mode = "drag";
    g.resting = true;
    window.addEventListener("keydown", onKey);
    navigator.vibrate?.(10);
    options.onDragState?.({ source: options.source, x: g.x0, y: g.y0, over: dropTargetAt(g.x0, g.y0) });
  }

  // Once lifted, the finger drags the card, so stop the list scrolling underneath it.
  // (Only a cancelable touchmove can stop a touch-action pan; the first one past the
  // browser's slop is cancelable unless a scroll has already begun.)
  function touchmove(e: Event) {
    if (gesture?.mode === "drag" && e.cancelable) e.preventDefault();
  }

  function down(e: PointerEvent) {
    if (!options.source || e.button > 0 || gesture || activeGesture) return;
    gesture = activeGesture = {
      pointerId: e.pointerId, pointerType: e.pointerType, x0: e.clientX, y0: e.clientY,
      axis: options.source.type === "card" ? scrollAxisOf(node) : null, mode: "wait", hold: null, resting: false,
    };
    try { node.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
    const g = gesture;
    if (e.pointerType === "touch" && g.axis) g.hold = setTimeout(() => lift(g), HOLD_MS);
  }

  function move(e: PointerEvent) {
    const g = gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (g.mode === "wait") {
      const intent = gestureIntent(dx, dy, g.axis, g.pointerType);
      if (intent === "wait") return;
      if (g.hold) { clearTimeout(g.hold); g.hold = null; }
      g.mode = intent === "drag" && (options.locked || !options.source) ? "ignore" : intent;
      if (g.mode === "drag") window.addEventListener("keydown", onKey);
    }
    // "scroll": the finger scrolls the list natively (touch-action) and cancels the pointer.
    if (g.mode !== "drag" || !options.source) return;
    if (g.resting && Math.hypot(dx, dy) >= DRAG_THRESHOLD) g.resting = false;
    e.preventDefault();
    options.onDragState?.({ source: options.source, x: e.clientX, y: e.clientY, over: dropTargetAt(e.clientX, e.clientY) });
  }

  function up(e: PointerEvent) {
    const g = gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    // A held card let go where it lifted is put back: the grid hid on lift, so a board
    // slot may sit under a finger that never meant to go there.
    const result = g.mode === "drag" && !g.resting && options.source && !options.locked
      ? resolveDrop(options.source, dropTargetAt(e.clientX, e.clientY))
      : null;
    if (result) options.onDrop?.(result);
    end(true);
    if (g.mode === "wait") options.onTap?.();
  }

  function cancel(e: PointerEvent) {
    if (gesture && e.pointerId === gesture.pointerId) end(true);
  }

  // Keyboard activation (Enter/Space) arrives as a click with no pointer press.
  function click(e: MouseEvent) {
    if (e.detail === 0 && options.source) options.onTap?.();
  }

  const noNativeDrag = (e: DragEvent) => e.preventDefault();
  // Resting on a card is a normal gesture now, and a page menu would cancel the pointer mid-drag.
  const noMenu = (e: Event) => { if (gesture) e.preventDefault(); };

  node.addEventListener("pointerdown", down);
  node.addEventListener("pointermove", move);
  node.addEventListener("pointerup", up);
  node.addEventListener("pointercancel", cancel);
  node.addEventListener("lostpointercapture", cancel);
  node.addEventListener("click", click);
  node.addEventListener("dragstart", noNativeDrag);
  node.addEventListener("contextmenu", noMenu);
  node.addEventListener("touchmove", touchmove, { passive: false });

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
      node.removeEventListener("contextmenu", noMenu);
      node.removeEventListener("touchmove", touchmove);
    },
  };
};
