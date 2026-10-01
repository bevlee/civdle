import { describe, expect, it } from "vitest";
import { gainLine } from "./gainLine";

describe("gainLine", () => {
  it("lists gains, then spent inputs", () => {
    expect(
      gainLine(
        [{ resource: "tools", amount: 1 }],
        [
          { resource: "wood", amount: 1 },
          { resource: "stone", amount: 1 },
        ],
      ),
    ).toBe("+1 Tools · −1 Wood · −1 Stone");
  });

  it("shows only gains when nothing was spent", () => {
    expect(
      gainLine([
        { resource: "wood", amount: 2 },
        { resource: "stone", amount: 1 },
      ]),
    ).toBe("+2 Wood · +1 Stone");
  });
});
