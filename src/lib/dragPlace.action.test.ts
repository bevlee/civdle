// The dragPlace action's gesture state machine, driven with a tiny fake DOM (Node's
// own EventTarget and Event) rather than a DOM environment dependency.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dragPlace, HOLD_MS, type DragPlaceOptions, type DragState, type DropResult } from "./dragPlace";

const camel = (attr: string) => attr.replace(/^data-/, "").replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

class FakeElement extends EventTarget {
  dataset: Record<string, string> = {};
  captured = new Set<number>();
  constructor(
    public parent: FakeElement | null = null,
    data: Record<string, string> = {},
  ) {
    super();
    for (const [key, value] of Object.entries(data)) this.dataset[camel(key)] = value;
  }
  closest(selector: string): FakeElement | null {
    const key = camel(selector.slice(1, -1));
    for (let el: FakeElement | null = this; el; el = el.parent) if (key in el.dataset) return el;
    return null;
  }
  contains(other: FakeElement): boolean {
    for (let el: FakeElement | null = other; el; el = el.parent) if (el === this) return true;
    return false;
  }
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
}

// The board: slot 2 at y 100, a gap at y 200; anything else is off the board.
const board = new FakeElement(null, { "data-drag-board": "" });
const slot2 = new FakeElement(board, { "data-party-slot": "2" });
const gap = new FakeElement(board);
const offBoard = new FakeElement();
const hitAt = (_x: number, y: number) => (y === 100 ? slot2 : y === 200 ? gap : offBoard);

let win: EventTarget;

function pointer(target: EventTarget, type: string, x: number, y: number, init: { id?: number; pointerType?: string } = {}) {
  const e = Object.assign(new Event(type, { cancelable: true }), {
    pointerId: init.id ?? 1, pointerType: init.pointerType ?? "mouse", clientX: x, clientY: y, button: 0,
  });
  target.dispatchEvent(e);
}

function mount(node: FakeElement, extra: Partial<DragPlaceOptions> = {}) {
  const calls: string[] = [];
  const states: (DragState | null)[] = [];
  const drops: DropResult[] = [];
  const options: DragPlaceOptions = {
    source: { type: "card", cardId: "a" },
    onTap: () => calls.push("tap"),
    onDrop: (r) => { drops.push(r); calls.push("drop"); },
    onDragState: (s) => { states.push(s); calls.push(s ? "state" : "end"); },
    ...extra,
  };
  const action = dragPlace(node as unknown as HTMLElement, options) as { update: (o: DragPlaceOptions) => void; destroy: () => void };
  return { calls, states, drops, action, options };
}

beforeEach(() => {
  win = new EventTarget();
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", { elementFromPoint: hitAt });
});

afterEach(() => vi.unstubAllGlobals());

describe("dragPlace action", () => {
  it("treats a press that moves under 6px as a tap", () => {
    const card = new FakeElement();
    const { calls, action } = mount(card);
    pointer(card, "pointerdown", 0, 0);
    pointer(card, "pointermove", 3, 3);
    pointer(card, "pointerup", 3, 3);
    expect(calls).toEqual(["tap"]);
    action.destroy();
  });

  it("drops on a slot, then ends the drag (drop first)", () => {
    const card = new FakeElement();
    const { calls, states, drops, action } = mount(card);
    pointer(card, "pointerdown", 0, 0);
    pointer(card, "pointermove", 0, 100);
    expect(states.at(-1)).toMatchObject({ over: 2, x: 0, y: 100 });
    pointer(card, "pointerup", 0, 100);
    expect(drops).toEqual([{ assign: ["a", 2] }]);
    expect(calls).toEqual(["state", "drop", "end"]);
    action.destroy();
  });

  it("does nothing when a hero is released in a gap on the board", () => {
    const hero = new FakeElement();
    const { calls, states, action } = mount(hero, { source: { type: "slot", slot: 1, cardId: "b" } });
    pointer(hero, "pointerdown", 0, 0);
    pointer(hero, "pointermove", 0, 200);
    expect(states.at(-1)?.over).toBe("board");
    pointer(hero, "pointerup", 0, 200);
    expect(calls).toEqual(["state", "end"]);
    action.destroy();
  });

  it("removes a hero released off the board", () => {
    const hero = new FakeElement();
    const { drops, action } = mount(hero, { source: { type: "slot", slot: 1, cardId: "b" } });
    pointer(hero, "pointerdown", 0, 0);
    pointer(hero, "pointermove", 0, 300);
    pointer(hero, "pointerup", 0, 300);
    expect(drops).toEqual([{ remove: 1 }]);
    action.destroy();
  });

  it("cancels a drag when the formation locks mid-drag", () => {
    const card = new FakeElement();
    const { calls, action, options } = mount(card);
    pointer(card, "pointerdown", 0, 0);
    pointer(card, "pointermove", 0, 100);
    action.update({ ...options, locked: true });
    expect(calls).toEqual(["state", "end"]);
    pointer(card, "pointerup", 0, 100);
    expect(calls).toEqual(["state", "end"]);
    action.destroy();
  });

  it("cancels a drag on pointercancel and on Escape", () => {
    const card = new FakeElement();
    const { calls, action } = mount(card);
    pointer(card, "pointerdown", 0, 0);
    pointer(card, "pointermove", 0, 100);
    pointer(card, "pointercancel", 0, 100);
    pointer(card, "pointerup", 0, 100);
    expect(calls).toEqual(["state", "end"]);

    pointer(card, "pointerdown", 0, 0, { id: 2 });
    pointer(card, "pointermove", 0, 100, { id: 2 });
    win.dispatchEvent(Object.assign(new Event("keydown"), { key: "Escape" }));
    pointer(card, "pointerup", 0, 100, { id: 2 });
    expect(calls).toEqual(["state", "end", "state", "end"]);
    action.destroy();
  });

  it("ends the drag when the element is destroyed mid-drag", () => {
    const card = new FakeElement();
    const { calls, action } = mount(card);
    pointer(card, "pointerdown", 0, 0);
    pointer(card, "pointermove", 0, 100);
    action.destroy();
    expect(calls).toEqual(["state", "end"]);
  });

  it("ignores a second finger while one gesture is on", () => {
    const first = new FakeElement();
    const second = new FakeElement();
    const a = mount(first);
    const b = mount(second);
    pointer(first, "pointerdown", 0, 0, { id: 1, pointerType: "touch" });
    pointer(second, "pointerdown", 0, 0, { id: 2, pointerType: "touch" });
    pointer(second, "pointermove", 0, 100, { id: 2, pointerType: "touch" });
    pointer(second, "pointerup", 0, 100, { id: 2, pointerType: "touch" });
    expect(b.calls).toEqual([]);
    pointer(first, "pointerup", 0, 0, { id: 1, pointerType: "touch" });
    expect(a.calls).toEqual(["tap"]);
    // Once the first is done, the other element works again.
    pointer(second, "pointerdown", 0, 0, { id: 3 });
    pointer(second, "pointerup", 0, 0, { id: 3 });
    expect(b.calls).toEqual(["tap"]);
    a.action.destroy();
    b.action.destroy();
  });

  it("lets a finger scroll a strip along its declared axis, but a mouse drags", () => {
    const strip = new FakeElement(null, { "data-drag-scroll": "y" });
    const card = new FakeElement(strip);
    const { calls, action } = mount(card);
    pointer(card, "pointerdown", 0, 0, { pointerType: "touch" });
    pointer(card, "pointermove", 0, 100, { pointerType: "touch" });
    pointer(card, "pointerup", 0, 100, { pointerType: "touch" });
    expect(calls).toEqual([]);

    pointer(card, "pointerdown", 0, 0);
    pointer(card, "pointermove", 0, 100);
    pointer(card, "pointerup", 0, 100);
    expect(calls).toEqual(["state", "drop", "end"]);
    action.destroy();
  });
});

describe("hold to lift (a finger in a scrolling list)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const listCard = () => new FakeElement(new FakeElement(null, { "data-drag-scroll": "y" }));
  const touch = { pointerType: "touch" };

  it("lifts a card after a still hold, then drags it along the scroll axis", () => {
    const card = listCard();
    const { calls, drops, action } = mount(card);
    pointer(card, "pointerdown", 0, 0, touch);
    vi.advanceTimersByTime(HOLD_MS);
    expect(calls).toEqual(["state"]);
    pointer(card, "pointermove", 0, 100, touch);
    pointer(card, "pointerup", 0, 100, touch);
    expect(drops).toEqual([{ assign: ["a", 2] }]);
    expect(calls).toEqual(["state", "state", "drop", "end"]);
    action.destroy();
  });

  it("scrolls when the finger moves before the hold completes", () => {
    const card = listCard();
    const { calls, action } = mount(card);
    pointer(card, "pointerdown", 0, 0, touch);
    pointer(card, "pointermove", 0, 100, touch);
    vi.advanceTimersByTime(HOLD_MS);
    pointer(card, "pointerup", 0, 100, touch);
    expect(calls).toEqual([]);
    action.destroy();
  });

  it("still taps on a quick press", () => {
    const card = listCard();
    const { calls, action } = mount(card);
    pointer(card, "pointerdown", 0, 0, touch);
    pointer(card, "pointerup", 0, 0, touch);
    vi.advanceTimersByTime(HOLD_MS);
    expect(calls).toEqual(["tap"]);
    action.destroy();
  });

  it("treats a hold on a locked card as a tap (details)", () => {
    const card = listCard();
    const { calls, action } = mount(card, { locked: true });
    pointer(card, "pointerdown", 0, 0, touch);
    vi.advanceTimersByTime(HOLD_MS);
    pointer(card, "pointerup", 0, 0, touch);
    expect(calls).toEqual(["tap"]);
    action.destroy();
  });

  it("stops the list scrolling only once a card is lifted", () => {
    const card = listCard();
    const { action } = mount(card);
    pointer(card, "pointerdown", 0, 0, touch);
    const early = new Event("touchmove", { cancelable: true });
    card.dispatchEvent(early);
    expect(early.defaultPrevented).toBe(false);
    vi.advanceTimersByTime(HOLD_MS);
    const late = new Event("touchmove", { cancelable: true });
    card.dispatchEvent(late);
    expect(late.defaultPrevented).toBe(true);
    pointer(card, "pointerup", 0, 0, touch);
    action.destroy();
  });
});
