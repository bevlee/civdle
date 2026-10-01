import { describe, expect, it } from "vitest";
import { SKILL_ORDER } from "../gameData";
import { createInitialState, xpForLevel } from "../gameEngine";
import { groupOf, nextDiscovery, skillGroups, type SkillChip } from "./skillGroups";

describe("skillGroups", () => {
  it("returns Gathering then Production", () => {
    const groups = skillGroups(createInitialState());
    expect(groups.map((g) => g.label)).toEqual(["Gathering", "Production"]);
  });

  it("puts foraging in Gathering, unlocked on a fresh state", () => {
    const [gathering] = skillGroups(createInitialState());
    expect(gathering.skills.find((s) => s.id === "foraging")).toEqual({ id: "foraging", unlocked: true });
  });

  it("puts conquest in Production, locked on a fresh state", () => {
    const [, production] = skillGroups(createInitialState());
    expect(production.skills.find((s) => s.id === "conquest")).toEqual({ id: "conquest", unlocked: false });
  });

  it("includes every skill exactly once", () => {
    const ids = skillGroups(createInitialState()).flatMap((g) => g.skills.map((s) => s.id));
    expect([...ids].sort()).toEqual([...SKILL_ORDER].sort());
  });

  it("lists unlocked chips before locked ones, each in SKILL_ORDER", () => {
    const state = createInitialState();
    // Unlock a late skill so both partitions are mixed relative to SKILL_ORDER.
    expect(state.skills.construction.unlocked).toBe(false);
    state.skills.construction = { ...state.skills.construction, unlocked: true };
    for (const group of skillGroups(state)) {
      const firstLocked = group.skills.findIndex((s) => !s.unlocked);
      if (firstLocked >= 0) {
        expect(group.skills.slice(firstLocked).every((s) => !s.unlocked)).toBe(true);
      }
      const order = (chips: SkillChip[]) => chips.map((c) => SKILL_ORDER.indexOf(c.id));
      const unlocked = order(group.skills.filter((s) => s.unlocked));
      const locked = order(group.skills.filter((s) => !s.unlocked));
      expect(unlocked).toEqual([...unlocked].sort((a, b) => a - b));
      expect(locked).toEqual([...locked].sort((a, b) => a - b));
    }
    const [, production] = skillGroups(state);
    expect(production.skills.findIndex((s) => s.id === "construction")).toBeLessThan(
      production.skills.findIndex((s) => s.id === "conquest"),
    );
  });
});

describe("groupOf", () => {
  it("maps gathering to Gathering and crafting/combat to Production", () => {
    expect(groupOf("woodcutting")).toBe("Gathering");
    expect(groupOf("smithing")).toBe("Production");
    expect(groupOf("conquest")).toBe("Production");
  });
});

describe("nextDiscovery", () => {
  it("names the first step toward a skill the player can already work on", () => {
    const state = createInitialState();
    expect(nextDiscovery(state, "Gathering")).toBe("Foraging Lv 10");
    expect(nextDiscovery(state, "Production")).toBe("Foraging Lv 10");

    for (const id of ["woodcutting", "fishing", "hunting"] as const) state.skills[id].unlocked = true;
    state.skills.foraging.xp = xpForLevel(10);
    expect(nextDiscovery(state, "Gathering")).toBe("Woodcutting Lv 10");
  });

  it("names the age when that is all that stands in the way", () => {
    const state = createInitialState();
    for (const id of SKILL_ORDER) state.skills[id].unlocked = id !== "conquest";
    expect(nextDiscovery(state, "Production")).toBe("Reach the Renaissance");
  });

  it("returns null once a group is fully discovered", () => {
    const state = createInitialState();
    for (const id of SKILL_ORDER) state.skills[id].unlocked = true;
    expect(nextDiscovery(state, "Gathering")).toBeNull();
  });
});
