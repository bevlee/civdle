import { describe, expect, it } from "vitest";
import {
  ATTACK_ORDER,
  BACK_ROW,
  FRONT_ROW,
  POSITIONS,
  indexToPosition,
  isBackRow,
  isFrontRow,
  selectTarget,
  selectUltimateTargets,
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

describe("selectTarget", () => {
  const unit = (position: number, hp: number) => ({ position, hp });

  it("picks the first alive front-row target (position 2 before 4)", () => {
    const candidates = [unit(1, 10), unit(2, 10), unit(3, 10), unit(4, 10), unit(5, 10)];
    expect(selectTarget(candidates)?.position).toBe(2);
  });

  it("picks position 4 when position 2 is dead", () => {
    const candidates = [unit(1, 10), unit(2, 0), unit(3, 10), unit(4, 10), unit(5, 10)];
    expect(selectTarget(candidates)?.position).toBe(4);
  });

  it("falls through to back row when front row is dead", () => {
    const candidates = [unit(1, 10), unit(2, 0), unit(3, 10), unit(4, 0), unit(5, 10)];
    expect(selectTarget(candidates)?.position).toBe(1);
  });

  it("follows full attack order: 2, 4, 1, 3, 5", () => {
    // Kill them one by one in attack order, verifying who gets picked
    const alive = [unit(1, 10), unit(2, 10), unit(3, 10), unit(4, 10), unit(5, 10)];
    const order: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t = selectTarget(alive);
      expect(t).toBeDefined();
      order.push(t!.position);
      t!.hp = 0;
    }
    expect(order).toEqual([2, 4, 1, 3, 5]);
  });

  it("returns undefined when no candidates are alive", () => {
    const candidates = [unit(1, 0), unit(2, 0)];
    expect(selectTarget(candidates)).toBeUndefined();
  });

  it("returns undefined for an empty array", () => {
    expect(selectTarget([])).toBeUndefined();
  });

  it("works when only some positions are present", () => {
    const candidates = [unit(3, 10), unit(5, 10)];
    expect(selectTarget(candidates)?.position).toBe(3);
  });
});

describe("selectUltimateTargets", () => {
  const unit = (position: number, hp: number) => ({ position, hp });

  describe("melee", () => {
    it("returns a single target in attack order", () => {
      const candidates = [unit(1, 10), unit(2, 10), unit(3, 10), unit(4, 10), unit(5, 10)];
      const targets = selectUltimateTargets("melee", candidates);
      expect(targets).toHaveLength(1);
      expect(targets[0].position).toBe(2); // first in attack order
    });

    it("skips dead front-row and picks next in attack order", () => {
      const candidates = [unit(1, 10), unit(2, 0), unit(3, 10), unit(4, 0), unit(5, 10)];
      const targets = selectUltimateTargets("melee", candidates);
      expect(targets).toHaveLength(1);
      expect(targets[0].position).toBe(1);
    });

    it("returns empty array when all are dead", () => {
      const candidates = [unit(1, 0), unit(2, 0)];
      expect(selectUltimateTargets("melee", candidates)).toEqual([]);
    });
  });

  describe("ranged", () => {
    it("targets all alive back-row enemies", () => {
      const candidates = [unit(1, 10), unit(2, 10), unit(3, 10), unit(4, 10), unit(5, 10)];
      const targets = selectUltimateTargets("ranged", candidates);
      const positions = targets.map((t) => t.position).sort();
      expect(positions).toEqual([1, 3, 5]);
    });

    it("falls back to front-row when all back-row are dead", () => {
      const candidates = [unit(1, 0), unit(2, 10), unit(3, 0), unit(4, 10), unit(5, 0)];
      const targets = selectUltimateTargets("ranged", candidates);
      const positions = targets.map((t) => t.position).sort();
      expect(positions).toEqual([2, 4]);
    });

    it("targets only alive back-row members", () => {
      const candidates = [unit(1, 0), unit(2, 10), unit(3, 10), unit(4, 10), unit(5, 10)];
      const targets = selectUltimateTargets("ranged", candidates);
      const positions = targets.map((t) => t.position).sort();
      expect(positions).toEqual([3, 5]); // position 1 is dead
    });

    it("returns empty array when all are dead", () => {
      expect(selectUltimateTargets("ranged", [unit(1, 0), unit(2, 0)])).toEqual([]);
    });
  });

  describe("magic", () => {
    it("targets all alive enemies", () => {
      const candidates = [unit(1, 10), unit(2, 10), unit(3, 10), unit(4, 10), unit(5, 10)];
      const targets = selectUltimateTargets("magic", candidates);
      expect(targets).toHaveLength(5);
    });

    it("skips dead enemies", () => {
      const candidates = [unit(1, 0), unit(2, 10), unit(3, 0), unit(4, 10), unit(5, 10)];
      const targets = selectUltimateTargets("magic", candidates);
      expect(targets).toHaveLength(3);
      const positions = targets.map((t) => t.position).sort();
      expect(positions).toEqual([2, 4, 5]);
    });

    it("returns empty array when all are dead", () => {
      expect(selectUltimateTargets("magic", [unit(1, 0)])).toEqual([]);
    });
  });
});
