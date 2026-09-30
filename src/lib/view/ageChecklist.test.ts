import { describe, expect, it } from "vitest";
import { AGES, type ResourceId, type SkillId } from "../gameData";
import { createInitialState, getAgeAdvanceStatus, getSkillLevels, type GameState } from "../gameEngine";
import { ageChecklist, ageRewards, checklistJump, checklistProgress, firstUnmet, shortAgeName } from "./ageChecklist";

function checklistFor(
  state: GameState,
  levelOverrides: Partial<Record<SkillId, number>> = {},
  unlockedIds?: SkillId[],
) {
  const levels = { ...getSkillLevels(state), ...levelOverrides };
  return ageChecklist({
    ageAdvanceStatus: getAgeAdvanceStatus(state, levels),
    levels,
    unlocked: (id) => (unlockedIds ? unlockedIds.includes(id) : state.skills[id].unlocked),
    resources: state.resources,
  });
}

const withResources = (state: GameState, resources: Partial<Record<ResourceId, number>>): GameState => ({
  ...state,
  resources: { ...state.resources, ...resources },
});

describe("ageChecklist", () => {
  it("expands a locked skill into the unmet prereqs that unlock it, in order", () => {
    const items = checklistFor(createInitialState());
    expect(items.map((i) => i.label)).toEqual([
      "Foraging Lv 10 → unlocks Woodcutting",
      "🔒 Woodcutting Lv 10 → unlocks Mining",
      "🔒 Mining Lv 10",
      "Stone",
      "Wood",
    ]);
    expect(items[0]).toMatchObject({ skill: "foraging", required: 10, met: false });
    expect(items[3]).toMatchObject({ resource: "stone", required: 150, current: 0, met: false });
  });

  it("skips prereqs that are already met", () => {
    const items = checklistFor(createInitialState(), { foraging: 10 }, ["foraging", "woodcutting"]);
    expect(items.map((i) => i.label)).toEqual(["Woodcutting Lv 10 → unlocks Mining", "🔒 Mining Lv 10", "Stone", "Wood"]);
  });

  it("lists an unlocked condition skill on its own", () => {
    const items = checklistFor(createInitialState(), { mining: 4 }, ["foraging", "woodcutting", "mining"]);
    expect(items[0]).toEqual({ label: "Mining Lv 10", current: 4, required: 10, met: false, skill: "mining" });
  });

  it("marks items met, and floors resource counts", () => {
    const state = withResources(createInitialState(), { stone: 150.7, wood: 99.9 });
    const items = checklistFor(state, { mining: 12 }, ["foraging", "woodcutting", "mining"]);
    expect(items).toEqual([
      { label: "Mining Lv 10", current: 12, required: 10, met: true, skill: "mining" },
      { label: "Stone", current: 150, required: 150, met: true, resource: "stone" },
      { label: "Wood", current: 99, required: 100, met: false, resource: "wood" },
    ]);
  });

  it("is empty at the final age", () => {
    const state = { ...createInitialState(), ageIndex: AGES.length - 1 };
    expect(checklistFor(state)).toEqual([]);
  });
});

describe("firstUnmet", () => {
  it("returns the first unmet item, prereqs before the locked skill", () => {
    expect(firstUnmet(checklistFor(createInitialState()))?.skill).toBe("foraging");
  });

  it("falls through to a resource once the skills are met", () => {
    const state = withResources(createInitialState(), { stone: 200 });
    const items = checklistFor(state, { mining: 10 }, ["foraging", "woodcutting", "mining"]);
    expect(firstUnmet(items)).toMatchObject({ resource: "wood" });
  });

  it("is undefined when everything is met", () => {
    const state = withResources(createInitialState(), { stone: 200, wood: 200 });
    expect(firstUnmet(checklistFor(state, { mining: 10 }, ["mining"]))).toBeUndefined();
  });
});

describe("checklistJump", () => {
  const all = () => true;
  const none = () => false;

  it("sends a skill row to that skill", () => {
    const item = { label: "Woodcutting Lv 10", current: 3, required: 10, met: false, skill: "woodcutting" as const };
    expect(checklistJump(item, all)).toEqual({ skill: "woodcutting", recipeId: null, label: "Train Woodcutting" });
  });

  it("sends a resource row to the recipe that makes it", () => {
    const item = { label: "Iron Bar", current: 0, required: 150, met: false, resource: "ironBar" as const };
    expect(checklistJump(item, all)).toEqual({ skill: "smithing", recipeId: "ironBar", label: "Train Smithing for Iron Bar" });
  });

  it("has nowhere to go for met rows or skills not yet discovered", () => {
    expect(checklistJump({ label: "Coal", current: 5, required: 5, met: true, resource: "coal" }, all)).toBeNull();
    expect(checklistJump({ label: "🔒 Mining Lv 10", current: 0, required: 10, met: false, skill: "mining" }, none)).toBeNull();
    expect(checklistJump({ label: "Iron Bar", current: 0, required: 150, met: false, resource: "ironBar" }, none)).toBeNull();
  });
});

describe("checklistProgress", () => {
  it("counts met items against the total", () => {
    const state = withResources(createInitialState(), { stone: 200 });
    const items = checklistFor(state, { mining: 10 }, ["mining"]);
    expect(checklistProgress(items)).toEqual({ met: 2, total: 3 });
    expect(checklistProgress([])).toEqual({ met: 0, total: 0 });
  });
});

describe("ageRewards", () => {
  it("puts the bonus first and conceals new skills", () => {
    const iron = AGES.find((a) => a.id === "ironAge")!;
    const rewards = ageRewards(iron);
    expect(rewards[0]).toMatch(/actions/);
    expect(rewards).toContain("4★ summons");
    expect(rewards.every(Boolean)).toBe(true);
  });
});

describe("shortAgeName", () => {
  it("drops a trailing ' Age'", () => {
    expect(shortAgeName("Iron Age")).toBe("Iron");
    expect(shortAgeName("Medieval")).toBe("Medieval");
  });
});
