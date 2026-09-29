import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, CATEGORY_ORDER } from "../achievements";
import { createInitialState, getSkillLevels, xpForLevel, type GameState } from "../gameEngine";
import { achievementList, formatUnlockDate } from "./achievementList";

function list(state: GameState, filter: Parameters<typeof achievementList>[2] = "all") {
  return achievementList(state, getSkillLevels(state), filter);
}

describe("achievementList", () => {
  it("counts everything, best-skill tiers under skills", () => {
    const state = createInitialState();
    state.achievements = {
      "skills.best10": 1,
      "skills.allTen": 2,
      "resources.first": 3,
    };
    const result = list(state);
    expect(result.done).toBe(3);
    expect(result.total).toBe(ACHIEVEMENTS.length);
    expect(result.filters.map((f) => f.id)).toEqual(["all", ...CATEGORY_ORDER]);
    expect(result.filters[0]).toEqual({ id: "all", label: "All", done: 3, total: ACHIEVEMENTS.length });
    expect(result.filters.find((f) => f.id === "skills")).toMatchObject({
      done: 2,
      total: ACHIEVEMENTS.filter((a) => a.category === "skills").length,
    });
    expect(result.filters.find((f) => f.id === "resources")?.done).toBe(1);
  });

  it("labels chips short and sections long", () => {
    const result = list(createInitialState());
    expect(result.filters.map((f) => f.label)).toEqual([
      "All",
      "Skills",
      "Resources",
      "Ages",
      "Army",
      "Combat",
      "Depths",
      "Misc",
    ]);
    expect(result.sections.find((s) => s.category === "skills")?.label).toBe("Skill Milestones");
    expect(result.sections.find((s) => s.category === "misc")?.label).toBe("Miscellaneous");
  });

  it("lists every achievement in its section, best-skill tiers included", () => {
    const sections = list(createInitialState()).sections;
    expect(sections.flatMap((s) => s.items).length).toBe(ACHIEVEMENTS.length);
    const skillIds = sections.find((s) => s.category === "skills")!.items.map((i) => i.id);
    expect(skillIds).toEqual(expect.arrayContaining(["skills.best10", "skills.best99"]));
  });

  it("narrows sections to the chosen filter", () => {
    const state = createInitialState();
    expect(list(state).sections.map((s) => s.category)).toEqual(CATEGORY_ORDER);
    const army = list(state, "army");
    expect(army.sections.map((s) => s.category)).toEqual(["army"]);
    expect(army.sections[0].label).toBe("Army");
    expect(army.done).toBe(list(state).done);
  });

  it("orders done (newest first), in progress by ratio, then secret", () => {
    const state = createInitialState();
    state.skills.foraging.xp = xpForLevel(20);
    state.achievements = { "skills.allTen": 100, "skills.best10": 50 };
    const items = list(state, "skills").sections[0].items;

    expect(items.map((i) => i.id)).toEqual([
      "skills.allTen",
      "skills.best10",
      "skills.best25",
      "skills.best50",
      "skills.best75",
      "skills.best99",
      "skills.nice",
    ]);
    expect(items[0]).toMatchObject({ done: true, unlockedAt: 100, secret: false });
    expect(items[0].progress).toBeUndefined();
    expect(items[2].progress).toEqual({ current: 20, target: 25 });
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
    // Mutates shared ACHIEVEMENTS data; safe because vitest isolates each file, and the finally restores it.
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

describe("formatUnlockDate", () => {
  const now = new Date(2026, 8, 29).getTime();

  it("shows month and day for this year", () => {
    expect(formatUnlockDate(new Date(2026, 8, 14, 15).getTime(), now, "en-US")).toBe("Sep 14");
  });

  it("adds the year for an earlier year", () => {
    expect(formatUnlockDate(new Date(2025, 11, 3).getTime(), now, "en-US")).toBe("Dec 3, 2025");
  });
});
