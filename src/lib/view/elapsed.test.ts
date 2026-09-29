import { describe, expect, it } from "vitest";
import { formatElapsed } from "./elapsed";

describe("formatElapsed", () => {
  it("shows minutes and padded seconds under an hour", () => {
    expect(formatElapsed(0)).toBe("0m 00s");
    expect(formatElapsed(6_999)).toBe("0m 06s");
    expect(formatElapsed((13 * 60 + 6) * 1000)).toBe("13m 06s");
    expect(formatElapsed(3_599_999)).toBe("59m 59s");
  });

  it("switches to hours and padded minutes from an hour", () => {
    expect(formatElapsed(3_600_000)).toBe("1h 00m");
    expect(formatElapsed((64 * 60 + 59) * 1000)).toBe("1h 04m");
    expect(formatElapsed(26 * 3_600_000)).toBe("26h 00m");
  });

  it("clamps a start in the future (clock skew) to zero", () => {
    expect(formatElapsed(-5_000)).toBe("0m 00s");
  });
});
