import { expect, it } from "vitest";
import { nice } from "./utils";

it("adds (nice) only to 69", () => {
  expect(nice(68)).toBe("68");
  expect(nice(69)).toBe("69 (nice)");
  expect(nice(70)).toBe("70");
});
