import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, CATEGORY_ORDER, isSkillMilestone, skillMilestoneId } from "../achievements";
import { createInitialState, getSkillLevels, xpForLevel, type GameState } from "../gameEngine";
import { SKILL_ORDER } from "../gameData";
import { achievementList } from "./achievementList";

function list(state: GameState, filter: Parameters<typeof achievementList>[2] = "all") {
  return achievementList(state, getSkillLevels(state), filter);
}

describe("achievementList", () => {
  it("counts everything, milestones under skills", () => {
    const state = createInitialState();
    state.achievements = {
      [skillMilestoneId("foraging", 10)]: 1,
      "skills.allTen": 2,
      "resources.first": 3,
    };
    const result = list(state);
    expect(result.done).toBe(3);
    expect(result.total).toBe(ACHIEVEMENTS.length);
    expect(result.filters.map((f) => f.id)).toEqual(["all", ...CATEGORY_ORDER]);
    expect(result.filters[0]).toEqual({ id: "all", label: "All", done: 3, total: ACHIEVEMENTS.length });
    const skills = result.filters.find((f) => f.id === "skills");
    expect(skills).toMatchObject({
      done: 2,
      total: ACHIEVEMENTS.filter((a) => a.category === "skills").length,
    });
    expect(skills!.total).toBeGreaterThan(SKILL_ORDER.length * 4);
    expect(result.filters.find((f) => f.id === "resources")?.done).toBe(1);
  });

  it("leaves skill milestones out of section items", () => {
    const skills = list(createInitialState()).sections.find((s) => s.category === "skills");
    expect(skills?.items.length).toBeGreaterThan(0);
    expect(skills?.items.some((i) => isSkillMilestone(i.id))).toBe(false);
  });

  it("narrows sections to the chosen filter", () => {
    const state = createInitialState();
    expect(list(state).sections.map((s) => s.category)).toEqual(CATEGORY_ORDER);
    const army = list(state, "army");
    expect(army.sections.map((s) => s.category)).toEqual(["army"]);
    expect(army.sections[0].label).toBe("Army");
    expect(army.done).toBe(list(state).done);
  });

  it("orders done (newest first), in progress, not started, then secret", () => {
    const state = createInitialState();
    for (const id of SKILL_ORDER) state.skills[id].xp = xpForLevel(12);
    state.skills.foraging.xp = xpForLevel(55);
    state.achievements = { "skills.allTen": 100, [skillMilestoneId("foraging", 10)]: 50 };
    const items = list(state, "skills").sections[0].items;
    const ids = items.map((i) => i.id);

    expect(ids[0]).toBe("skills.allTen");
    expect(items[0]).toMatchObject({ done: true, unlockedAt: 100, secret: false });
    expect(items[0].progress).toBeUndefined();

    // allFifty: 1 of N skills at 50; allMax: 0 → not started.
    expect(ids.indexOf("skills.allFifty")).toBeLessThan(ids.indexOf("skills.allMax"));
    expect(items.find((i) => i.id === "skills.allFifty")?.progress).toEqual({
      current: 1,
      target: SKILL_ORDER.length,
    });
    expect(ids.at(-1)).toBe("skills.nice");
  });

  it("sorts done by newest unlock and in-progress by ratio", () => {
    const state = createInitialState();
    state.resources.stone = 500;
    state.achievements = { "resources.first": 10, "resources.leet": 30 };
    const items = list(state, "resources").sections[0].items;
    expect(items.slice(0, 4).map((i) => i.id)).toEqual([
      "resources.leet",
      "resources.first",
      "resources.hoarder",
      "resources.over9000",
    ]);
    expect(items[2].progress).toEqual({ current: 500, target: 1000 });
    const ratios = items.filter((i) => i.progress).map((i) => i.progress!.current / i.progress!.target);
    expect(ratios).toEqual([...ratios].sort((a, b) => b - a));
  });

  it("masks hidden achievements until unlocked", () => {
    const state = createInitialState();
    const nice = list(state, "skills").sections[0].items.find((i) => i.id === "skills.nice");
    expect(nice).toMatchObject({
      name: "???",
      description: "Hidden achievement. Keep playing to find out.",
      secret: true,
      done: false,
    });
    expect(nice?.progress).toBeUndefined();

    state.achievements = { "skills.nice": 5 };
    const found = list(state, "skills").sections[0].items.find((i) => i.id === "skills.nice");
    expect(found).toMatchObject({ name: "Nice.", secret: false, done: true, unlockedAt: 5 });
  });

  it("omits progress when the target is 1", () => {
    const def = ACHIEVEMENTS_BY_ID["resources.first"];
    def.progress = () => ({ current: 0, target: 1 });
    try {
      const first = list(createInitialState(), "resources").sections[0].items.find((i) => i.id === def.id);
      expect(first).toMatchObject({ done: false, secret: false });
      expect(first?.progress).toBeUndefined();
    } finally {
      delete def.progress;
    }
  });
});
