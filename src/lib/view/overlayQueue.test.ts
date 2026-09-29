import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACHIEVEMENTS_BY_ID } from "../achievements";
import type { QueuedEvent } from "../eventQueue.svelte";
import type { SkillId } from "../gameData";
import { OverlayQueue } from "./overlayQueue.svelte";

const IDS = ["skills.allTen", "skills.allFifty", "skills.nice", "resources.first"];
const nameOf = (id: string) => ACHIEVEMENTS_BY_ID[id].name;

// Stand-in for game.events / game.pendingUnlocks that the page would feed in.
function harness() {
  const q = new OverlayQueue();
  let events: QueuedEvent[] = [];
  let unlocks: SkillId[] = [];
  let n = 0;
  const sync = () => q.sync(unlocks, events);
  return {
    q,
    achieve(achievementId: string) {
      events = [...events, { id: `achievement-${++n}`, type: "achievement", data: { achievementId } }];
      sync();
    },
    advanceAge(unlocking?: SkillId) {
      // Like #applyAgeAdvance: the event and any skill it unlocks land in the same tick.
      events = [...events, { id: `ageAdvance-${++n}`, type: "ageAdvance", data: { ageId: "bronzeAge", ageName: "Bronze Age", bonusText: "" } }];
      if (unlocking) unlocks = [...unlocks, unlocking];
      sync();
    },
    unlock(skillId: SkillId) {
      unlocks = [...unlocks, skillId];
      sync();
    },
    dismissUnlock() {
      unlocks = unlocks.slice(1);
      sync();
    },
    dismissEvent(id: string) {
      events = events.filter((e) => e.id !== id);
      sync();
    },
    noise() {
      events = [...events, { id: `actionGain-${++n}`, type: "actionGain", data: {} }];
      sync();
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("OverlayQueue", () => {
  it("is empty with nothing pending", () => {
    const h = harness();
    h.noise();
    expect(h.q.current).toBeNull();
  });

  it("holds achievements behind a skill sheet, then shows them as one toast", () => {
    const h = harness();
    h.unlock("mining");
    h.achieve(IDS[0]);
    vi.advanceTimersByTime(1000);
    h.achieve(IDS[1]);
    h.achieve(IDS[2]);
    vi.advanceTimersByTime(1000);
    expect(h.q.current).toEqual({ kind: "skillUnlock", skillId: "mining" });

    h.dismissUnlock();
    expect(h.q.current).toMatchObject({
      kind: "achievements",
      count: 3,
      names: IDS.slice(0, 3).map(nameOf),
      achievementIds: IDS.slice(0, 3),
      eventIds: ["achievement-1", "achievement-2", "achievement-3"],
    });
  });

  it("groups achievements that land within the window, then merges into the visible toast", () => {
    const h = harness();
    h.achieve(IDS[0]);
    expect(h.q.current).toBeNull();
    vi.advanceTimersByTime(300);
    h.achieve(IDS[1]);
    expect(h.q.current).toBeNull();
    vi.advanceTimersByTime(100);
    expect(h.q.current).toMatchObject({ kind: "achievements", count: 2, names: IDS.slice(0, 2).map(nameOf) });

    vi.advanceTimersByTime(2000);
    h.achieve(IDS[2]);
    expect(h.q.current).toMatchObject({ kind: "achievements", count: 3, names: IDS.slice(0, 3).map(nameOf) });
  });

  it("starts a fresh toast after the last one was dismissed", () => {
    const h = harness();
    h.achieve(IDS[0]);
    h.achieve(IDS[1]);
    vi.advanceTimersByTime(400);
    const ids = h.q.dismissAchievements();
    ids.forEach(h.dismissEvent);
    expect(h.q.current).toBeNull();

    h.achieve(IDS[2]);
    expect(h.q.current).toBeNull();
    vi.advanceTimersByTime(400);
    expect(h.q.current).toMatchObject({ kind: "achievements", count: 1, names: [nameOf(IDS[2])] });
  });

  it("ranks age advance over skill unlock over achievements", () => {
    const h = harness();
    h.achieve(IDS[0]);
    h.advanceAge();
    h.unlock("mining");
    h.unlock("smithing");
    vi.advanceTimersByTime(1000);
    const age = h.q.current;
    expect(age).toMatchObject({ kind: "ageAdvance", event: { id: "ageAdvance-2", data: { ageName: "Bronze Age" } } });

    h.dismissEvent(age?.kind === "ageAdvance" ? age.event.id : "");
    expect(h.q.current).toEqual({ kind: "skillUnlock", skillId: "mining" });

    h.dismissUnlock();
    expect(h.q.current).toEqual({ kind: "skillUnlock", skillId: "smithing" });

    h.dismissUnlock();
    expect(h.q.current).toMatchObject({ kind: "achievements", count: 1 });
  });

  it("shows an age advance before the skill it unlocked in the same tick", () => {
    const h = harness();
    h.achieve(IDS[0]);
    h.advanceAge("mining");
    const age = h.q.current;
    expect(age).toMatchObject({ kind: "ageAdvance", event: { id: "ageAdvance-2" } });

    h.dismissEvent(age?.kind === "ageAdvance" ? age.event.id : "");
    expect(h.q.current).toEqual({ kind: "skillUnlock", skillId: "mining" });

    h.dismissUnlock();
    expect(h.q.current).toMatchObject({ kind: "achievements", count: 1, achievementIds: [IDS[0]] });
  });

  it("hides a visible toast under a new sheet and brings it back merged", () => {
    const h = harness();
    h.achieve(IDS[0]);
    vi.advanceTimersByTime(400);
    h.unlock("mining");
    h.achieve(IDS[1]);
    expect(h.q.current).toMatchObject({ kind: "skillUnlock" });
    h.dismissUnlock();
    expect(h.q.current).toMatchObject({ kind: "achievements", count: 2 });
  });

  it("dismissing the toast returns every event id it covered", () => {
    const h = harness();
    h.achieve(IDS[0]);
    h.achieve(IDS[1]);
    h.achieve(IDS[2]);
    vi.advanceTimersByTime(400);
    expect(h.q.dismissAchievements()).toEqual(["achievement-1", "achievement-2", "achievement-3"]);
    // Gone right away, before the caller has removed the events from the game.
    expect(h.q.current).toBeNull();
    vi.advanceTimersByTime(1000);
    h.noise();
    expect(h.q.current).toBeNull();
  });

  it("dismissing while a sheet covers the toast does nothing", () => {
    const h = harness();
    h.achieve(IDS[0]);
    h.unlock("mining");
    expect(h.q.dismissAchievements()).toEqual([]);
    h.dismissUnlock();
    expect(h.q.current).toMatchObject({ kind: "achievements", count: 1 });
  });

  it("drops achievements whose events were removed elsewhere", () => {
    const h = harness();
    h.achieve(IDS[0]);
    h.achieve(IDS[1]);
    vi.advanceTimersByTime(400);
    h.dismissEvent("achievement-1");
    expect(h.q.current).toMatchObject({ kind: "achievements", count: 1, eventIds: ["achievement-2"] });
    h.dismissEvent("achievement-2");
    expect(h.q.current).toBeNull();
  });

  it("shows the toast as soon as a sheet that opened mid-window closes, without a late timer", () => {
    const h = harness();
    h.achieve(IDS[0]);
    vi.advanceTimersByTime(200);
    h.unlock("mining");
    vi.advanceTimersByTime(400);
    expect(h.q.current).toEqual({ kind: "skillUnlock", skillId: "mining" });

    h.dismissUnlock();
    const toast = h.q.current;
    expect(toast).toMatchObject({ kind: "achievements", count: 1, eventIds: ["achievement-1"] });
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(h.q.current).toBe(toast);
  });

  it("never fires the grouping timer after destroy", () => {
    const h = harness();
    h.achieve(IDS[0]);
    h.q.destroy();
    vi.advanceTimersByTime(1000);
    expect(h.q.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the same object when nothing it shows has changed", () => {
    const h = harness();
    h.unlock("mining");
    const before = h.q.current;
    h.noise();
    expect(h.q.current).toBe(before);
  });
});
