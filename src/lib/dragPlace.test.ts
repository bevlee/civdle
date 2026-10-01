import { describe, expect, it } from "vitest";
import { dragLabel, gestureIntent, resolveDrop, slotName, slotTag, type DragSource } from "./dragPlace";

const card: DragSource = { type: "card", cardId: "a" };
const slot1: DragSource = { type: "slot", slot: 1, cardId: "b" };

describe("resolveDrop", () => {
  it("assigns a card dropped on a slot", () => {
    expect(resolveDrop(card, 3)).toEqual({ assign: ["a", 3] });
  });

  it("assigns a hero dragged to another slot (movePartyCard swaps)", () => {
    expect(resolveDrop(slot1, 4)).toEqual({ assign: ["b", 4] });
  });

  it("does nothing when a hero is dropped back on its own slot", () => {
    expect(resolveDrop(slot1, 1)).toBeNull();
  });

  it("removes a hero dragged off the board", () => {
    expect(resolveDrop(slot1, null)).toEqual({ remove: 1 });
  });

  it("does nothing when a card is dropped off the board", () => {
    expect(resolveDrop(card, null)).toBeNull();
  });

  it("does nothing when either is dropped in a gap on the board", () => {
    expect(resolveDrop(card, "board")).toBeNull();
    expect(resolveDrop(slot1, "board")).toBeNull();
  });
});

describe("slotTag", () => {
  it("shortens a slot to its row letter and position", () => {
    expect(slotTag(0)).toBe("B1");
    expect(slotTag(1)).toBe("F2");
    expect(slotTag(4)).toBe("B5");
  });
});

describe("slotName", () => {
  it("names even positions front and odd ones back", () => {
    expect(slotName(0)).toBe("Back · 1");
    expect(slotName(1)).toBe("Front · 2");
    expect(slotName(3)).toBe("Front · 4");
    expect(slotName(4)).toBe("Back · 5");
  });
});

describe("dragLabel", () => {
  it("names the slot under the pointer", () => {
    expect(dragLabel(card, 1)).toBe("Place · Front · 2");
    expect(dragLabel(slot1, 2)).toBe("Place · Back · 3");
  });

  it("explains what releasing off the board does", () => {
    expect(dragLabel(card, null)).toBe("Drop on a slot");
    expect(dragLabel(slot1, null)).toBe("Release to remove");
  });

  it("asks for a slot over a gap on the board", () => {
    expect(dragLabel(card, "board")).toBe("Drop on a slot");
    expect(dragLabel(slot1, "board")).toBe("Drop on a slot");
  });
});

describe("gestureIntent", () => {
  it("waits until the pointer has moved 6px", () => {
    expect(gestureIntent(3, 4, null, "mouse")).toBe("wait");
    expect(gestureIntent(5, 0, "x", "touch")).toBe("wait");
  });

  it("drags on the board whatever the direction", () => {
    expect(gestureIntent(10, 0, null, "touch")).toBe("drag");
    expect(gestureIntent(0, -10, null, "mouse")).toBe("drag");
  });

  it("scrolls a horizontal strip on a mostly horizontal touch and drags on a vertical one", () => {
    expect(gestureIntent(-12, 4, "x", "touch")).toBe("scroll");
    expect(gestureIntent(3, -12, "x", "touch")).toBe("drag");
  });

  it("scrolls a vertical list on a mostly vertical touch and drags on a horizontal one", () => {
    expect(gestureIntent(2, 10, "y", "touch")).toBe("scroll");
    expect(gestureIntent(10, 2, "y", "touch")).toBe("drag");
  });

  it("always drags with a mouse or pen (the wheel scrolls)", () => {
    expect(gestureIntent(2, 10, "y", "mouse")).toBe("drag");
    expect(gestureIntent(0, -30, "y", "pen")).toBe("drag");
    expect(gestureIntent(-12, 4, "x", "mouse")).toBe("drag");
  });
});
