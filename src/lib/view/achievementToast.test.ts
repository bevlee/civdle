import { describe, expect, it } from "vitest";
import { achievementToastNames, achievementToastTitle } from "./achievementToast";

describe("achievementToastTitle", () => {
  it("counts in singular and plural", () => {
    expect(achievementToastTitle(1)).toBe("1 achievement unlocked");
    expect(achievementToastTitle(3)).toBe("3 achievements unlocked");
  });
});

describe("achievementToastNames", () => {
  it("names one or two in full", () => {
    expect(achievementToastNames(["Humble Beginnings"])).toBe("Humble Beginnings");
    expect(achievementToastNames(["Foraging Apprentice", "Humble Beginnings"])).toBe(
      "Foraging Apprentice · Humble Beginnings",
    );
  });

  it("names the first two and counts the rest", () => {
    expect(achievementToastNames(["Foraging Apprentice", "Humble Beginnings", "Woodsman"])).toBe(
      "Foraging Apprentice · Humble Beginnings · +1",
    );
    expect(achievementToastNames(["A", "B", "C", "D", "E"])).toBe("A · B · +3");
  });

  it("is empty with no names", () => {
    expect(achievementToastNames([])).toBe("");
  });
});
