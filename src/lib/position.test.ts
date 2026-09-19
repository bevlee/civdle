import { describe, expect, it } from "vitest";
import {
  ATTACK_ORDER,
  BACK_ROW,
  FRONT_ROW,
  POSITIONS,
  indexToPosition,
  isBackRow,
  isFrontRow,
} from "./position";

describe("position constants", () => {
  it("defines exactly 5 positions", () => {
    expect(POSITIONS).toEqual([1, 2, 3, 4, 5]);
  });

  it("front row is positions 2 and 4", () => {
    expect(FRONT_ROW).toEqual([2, 4]);
  });

  it("back row is positions 1, 3 and 5", () => {
    expect(BACK_ROW).toEqual([1, 3, 5]);
  });

  it("front and back rows together cover all positions", () => {
    const all = [...FRONT_ROW, ...BACK_ROW].sort();
    expect(all).toEqual([1, 2, 3, 4, 5]);
  });

  it("attack order puts front row first", () => {
    expect(ATTACK_ORDER).toEqual([2, 4, 1, 3, 5]);
  });
});

describe("isFrontRow / isBackRow", () => {
  it("correctly classifies each position", () => {
    expect(isFrontRow(1)).toBe(false);
    expect(isFrontRow(2)).toBe(true);
    expect(isFrontRow(3)).toBe(false);
    expect(isFrontRow(4)).toBe(true);
    expect(isFrontRow(5)).toBe(false);

    expect(isBackRow(1)).toBe(true);
    expect(isBackRow(2)).toBe(false);
    expect(isBackRow(3)).toBe(true);
    expect(isBackRow(4)).toBe(false);
    expect(isBackRow(5)).toBe(true);
  });

  it("isFrontRow and isBackRow are mutually exclusive", () => {
    for (const p of POSITIONS) {
      expect(isFrontRow(p)).not.toBe(isBackRow(p));
    }
  });
});

describe("indexToPosition", () => {
  it("maps 0-based index to 1-indexed position", () => {
    expect(indexToPosition(0)).toBe(1);
    expect(indexToPosition(1)).toBe(2);
    expect(indexToPosition(2)).toBe(3);
    expect(indexToPosition(3)).toBe(4);
    expect(indexToPosition(4)).toBe(5);
  });

  it("throws on out-of-range index", () => {
    expect(() => indexToPosition(-1)).toThrow(RangeError);
    expect(() => indexToPosition(5)).toThrow(RangeError);
    expect(() => indexToPosition(10)).toThrow(RangeError);
  });
});
