import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, checkAchievements, skillMilestoneId } from "./achievements";
import { createInitialState, xpForLevel, type GameState } from "./gameEngine";
import { SKILL_ORDER } from "./gameData";
import { createCard } from "./combatData";

function fresh(): GameState {
  return createInitialState();
}

describe("achievement definitions", () => {
  it("have unique ids", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("include lv 10/20/50/99 milestones for every skill", () => {
    for (const skill of SKILL_ORDER) {
      for (const level of [10, 20, 50, 99]) {
        expect(ACHIEVEMENTS_BY_ID[skillMilestoneId(skill, level)]).toBeDefined();
      }
    }
  });

  it("unlock nothing on a fresh save", () => {
    const { newlyUnlocked } = checkAchievements(fresh());
    expect(newlyUnlocked).toEqual([]);
  });
});

describe("checkAchievements", () => {
  it("returns the same state object when nothing unlocked", () => {
    const state = fresh();
    expect(checkAchievements(state).state).toBe(state);
  });

  it("unlocks skill milestones up to the current level", () => {
    const state = fresh();
    state.skills.foraging.xp = xpForLevel(20);
    const { state: next, newlyUnlocked } = checkAchievements(state, 123);
    expect(newlyUnlocked).toContain(skillMilestoneId("foraging", 10));
    expect(newlyUnlocked).toContain(skillMilestoneId("foraging", 20));
    expect(newlyUnlocked).not.toContain(skillMilestoneId("foraging", 50));
    expect(next.achievements[skillMilestoneId("foraging", 10)]).toBe(123);
  });

  it("does not re-report an achievement that is already unlocked", () => {
    const state = fresh();
    state.skills.foraging.xp = xpForLevel(10);
    const first = checkAchievements(state);
    const second = checkAchievements(first.state);
    expect(second.newlyUnlocked).toEqual([]);
    expect(second.state).toBe(first.state);
  });

  it("requires strictly more than 9000 for It's Over 9000", () => {
    const state = fresh();
    state.resources.food = 9000;
    expect(checkAchievements(state).newlyUnlocked).not.toContain("resources.over9000");
    state.resources.food = 9001;
    expect(checkAchievements(state).newlyUnlocked).toContain("resources.over9000");
  });

  it("reports progress for numeric goals", () => {
    const state = fresh();
    state.resources.wood = 250.7;
    const def = ACHIEVEMENTS_BY_ID["resources.hoarder"];
    expect(def.progress?.(state, {} as never)).toEqual({ current: 250, target: 1000 });
  });

  it("unlocks Nice. only at exactly level 69", () => {
    const state = fresh();
    state.skills.mining.xp = xpForLevel(70);
    expect(checkAchievements(state).newlyUnlocked).not.toContain("skills.nice");
    state.skills.mining.xp = xpForLevel(69);
    expect(checkAchievements(state).newlyUnlocked).toContain("skills.nice");
  });

  it("unlocks stat-driven achievements", () => {
    const state = fresh();
    state.stats.battlesLost = 5;
    state.stats.cardsSummoned = 1;
    const { newlyUnlocked } = checkAchievements(state);
    expect(newlyUnlocked).toContain("combat.skillIssue");
    expect(newlyUnlocked).toContain("army.firstSummon");
  });

  it("unlocks Shiny! for a max-star card", () => {
    const state = fresh();
    state.gacha.cards.push(createCard("peasant", 10));
    expect(checkAchievements(state).newlyUnlocked).toContain("army.maxStars");
  });
});
