import { describe, expect, it } from "vitest";
import { actionBarState, stillTrainingLine } from "./actionBar";

const base = {
  viewedSkill: "crafting" as const,
  viewedRecipeId: "tools",
  viewedLevel: 5,
  activeSkill: null,
  activeRecipeId: null,
  resources: { wood: 5, stone: 5, plantFibres: 5 },
  timeText: "2.60s",
  xpText: "+9 XP",
};

describe("actionBarState", () => {
  it("offers stop when viewing the running skill and recipe", () => {
    expect(actionBarState({ ...base, activeSkill: "crafting", activeRecipeId: "tools" })).toEqual({
      kind: "stop",
      label: "Stop",
    });
  });

  it("reports the level a locked recipe needs", () => {
    expect(actionBarState({ ...base, viewedRecipeId: "baskets" })).toEqual({
      kind: "locked",
      label: "Unlocks at Lv 15",
    });
  });

  it("prefers locked over short and switch", () => {
    const state = actionBarState({
      ...base,
      viewedRecipeId: "baskets",
      resources: {},
      activeSkill: "foraging",
      activeRecipeId: "forage",
    });
    expect(state).toEqual({ kind: "locked", label: "Unlocks at Lv 15" });
  });

  it("prefers stop over locked", () => {
    const state = actionBarState({ ...base, viewedRecipeId: "baskets", activeSkill: "crafting", activeRecipeId: "baskets" });
    expect(state.kind).toBe("stop");
  });

  it("reports the first missing input", () => {
    expect(actionBarState({ ...base, resources: { wood: 5, stone: 0 } })).toEqual({
      kind: "short",
      label: "Short on Stone",
      sub: "Needs 1 Stone",
    });
  });

  it("offers a switch when another skill is running", () => {
    expect(actionBarState({ ...base, activeSkill: "foraging", activeRecipeId: "forage" })).toEqual({
      kind: "switch",
      label: "Switch to Tools",
      sub: "2.60s · +9 XP",
    });
  });

  it("offers a switch when the same skill runs a different recipe", () => {
    expect(
      actionBarState({ ...base, viewedRecipeId: "cordage", activeSkill: "crafting", activeRecipeId: "tools" }),
    ).toEqual({ kind: "switch", label: "Switch to Cordage", sub: "2.60s · +9 XP" });
  });

  it("prefers short over switch", () => {
    const state = actionBarState({ ...base, resources: {}, activeSkill: "foraging", activeRecipeId: "forage" });
    expect(state).toEqual({ kind: "short", label: "Short on Wood", sub: "Needs 1 Wood" });
  });

  it("offers train when idle", () => {
    expect(actionBarState(base)).toEqual({ kind: "train", label: "Train Tools", sub: "2.60s · +9 XP" });
  });

  it("offers train for a gathering recipe with no inputs", () => {
    expect(actionBarState({ ...base, viewedSkill: "foraging", viewedRecipeId: "forage", resources: {} })).toEqual({
      kind: "train",
      label: "Train Forage",
      sub: "2.60s · +9 XP",
    });
  });
});

describe("stillTrainingLine", () => {
  it("names the running skill and recipe", () => {
    expect(stillTrainingLine("crafting", "tools")).toBe("Crafting · Tools");
    expect(stillTrainingLine("foraging", "forage")).toBe("Foraging · Forage");
  });
});
