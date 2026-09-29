// One popup at a time: an age advance beats a new-skill sheet (the age is often what unlocked the skill),
// which beats a grouped achievement toast.

import { ACHIEVEMENTS_BY_ID } from "../achievements";
import type { QueuedEvent } from "../eventQueue.svelte";
import type { SkillId } from "../gameData";
import type { AchievementEventData, AgeAdvanceEventData } from "../gameState.svelte";

export type Overlay =
  | { kind: "skillUnlock"; skillId: SkillId }
  | { kind: "ageAdvance"; event: QueuedEvent<AgeAdvanceEventData> }
  | { kind: "achievements"; count: number; names: string[]; achievementIds: string[]; eventIds: string[] };

interface PendingAchievement {
  eventId: string;
  achievementId: string;
}

export class OverlayQueue {
  // Only `current` is reactive, and sync() never reads it, so calling sync() from an $effect can't loop.
  current = $state.raw<Overlay | null>(null);

  #groupWindowMs: number;
  #skill: SkillId | null = null;
  #age: QueuedEvent<AgeAdvanceEventData> | null = null;
  #pending: PendingAchievement[] = [];
  #seen = new Set<string>();
  #toastOpen = false;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #shown: Overlay | null = null;

  constructor(opts: { groupWindowMs?: number } = {}) {
    this.#groupWindowMs = opts.groupWindowMs ?? 400;
  }

  /** Feed in game.pendingUnlocks and game.events whenever either changes. */
  sync(pendingUnlocks: readonly SkillId[], events: readonly QueuedEvent[]): void {
    this.#skill = pendingUnlocks[0] ?? null;
    this.#age = (events.find((e) => e.type === "ageAdvance") as QueuedEvent<AgeAdvanceEventData> | undefined) ?? null;

    const achievements = events.filter((e): e is QueuedEvent<AchievementEventData> => e.type === "achievement");
    const live = new Set(achievements.map((e) => e.id));
    this.#pending = this.#pending.filter((a) => live.has(a.eventId));
    for (const id of this.#seen) if (!live.has(id)) this.#seen.delete(id);
    for (const e of achievements) {
      if (this.#seen.has(e.id)) continue;
      this.#seen.add(e.id);
      this.#pending.push({ eventId: e.id, achievementId: e.data.achievementId });
    }

    if (this.#pending.length === 0) {
      this.#toastOpen = false;
      this.#clearTimer();
    } else if (!this.#toastOpen) {
      if (this.#skill || this.#age) {
        // Queue the toast behind the sheet so it shows the moment the sheet closes.
        this.#toastOpen = true;
        this.#clearTimer();
      } else if (!this.#timer) {
        this.#timer = setTimeout(() => {
          this.#timer = null;
          this.#toastOpen = true;
          this.#update();
        }, this.#groupWindowMs);
      }
    }
    this.#update();
  }

  /** Closes the visible achievement toast and returns the event ids to pass to game.dismissEvent. */
  dismissAchievements(): string[] {
    if (this.#shown?.kind !== "achievements") return [];
    const ids = this.#shown.eventIds;
    this.#pending = [];
    this.#toastOpen = false;
    this.#update();
    return ids;
  }

  /** Stops the pending grouping timer; call when the owner unmounts. */
  destroy(): void {
    this.#clearTimer();
  }

  #clearTimer(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
  }

  #update(): void {
    const next = this.#pick();
    if (overlayKey(next) === overlayKey(this.#shown)) return;
    this.#shown = next;
    this.current = next;
  }

  #pick(): Overlay | null {
    if (this.#age) return { kind: "ageAdvance", event: this.#age };
    if (this.#skill) return { kind: "skillUnlock", skillId: this.#skill };
    if (!this.#toastOpen || this.#pending.length === 0) return null;
    const achievementIds = this.#pending.map((a) => a.achievementId);
    return {
      kind: "achievements",
      count: this.#pending.length,
      names: achievementIds.map((id) => ACHIEVEMENTS_BY_ID[id]?.name ?? id),
      achievementIds,
      eventIds: this.#pending.map((a) => a.eventId),
    };
  }
}

function overlayKey(o: Overlay | null): string {
  if (!o) return "";
  if (o.kind === "skillUnlock") return `skill:${o.skillId}`;
  if (o.kind === "ageAdvance") return `age:${o.event.id}`;
  return `ach:${o.eventIds.join(",")}`;
}
