export type BattleSpeed = 0.5 | 1 | 2;
export interface PlaybackSettings { speed: BattleSpeed; paused: boolean }

/** A shared virtual clock keeps combat decisions, impacts and cleanup in sync. */
export class BattlePlayback {
  #time = 0;
  #realTime = Date.now();
  #settings: PlaybackSettings = { speed: 1, paused: false };
  #jobs = new Set<{ due: number; callback: () => void; timer?: ReturnType<typeof setTimeout> }>();

  now() {
    return this.#time + (this.#settings.paused ? 0 : (Date.now() - this.#realTime) * this.#settings.speed);
  }

  configure(settings: PlaybackSettings) {
    this.#time = this.now();
    this.#realTime = Date.now();
    this.#settings = settings;
    for (const job of this.#jobs) this.#arm(job);
  }

  schedule(callback: () => void, delayMs: number): () => void {
    const job = { due: this.now() + delayMs, callback, timer: undefined as ReturnType<typeof setTimeout> | undefined };
    this.#jobs.add(job);
    this.#arm(job);
    return () => { clearTimeout(job.timer); this.#jobs.delete(job); };
  }

  #arm(job: { due: number; callback: () => void; timer?: ReturnType<typeof setTimeout> }) {
    clearTimeout(job.timer);
    if (this.#settings.paused) return;
    job.timer = setTimeout(() => {
      this.#jobs.delete(job);
      job.callback();
    }, Math.max(0, job.due - this.now()) / this.#settings.speed);
  }

  clear() {
    for (const job of this.#jobs) clearTimeout(job.timer);
    this.#jobs.clear();
  }
}

/** Control both CSS animations and the blink's Web Animation without restarting. */
export function syncBattleAnimations(node: HTMLElement, initial: PlaybackSettings) {
  let settings = initial;
  function sync() {
    for (const animation of node.getAnimations({ subtree: true })) {
      if (animation.playState === "finished") continue;
      animation.updatePlaybackRate(settings.speed);
      if (settings.paused) animation.pause();
      else if (animation.playState === "paused") animation.play();
    }
  }
  const observer = new MutationObserver(sync);
  observer.observe(node, { subtree: true, childList: true, attributes: true });
  sync();
  return { update(next: PlaybackSettings) { settings = next; sync(); }, destroy() { observer.disconnect(); } };
}

export function ultimateCharge(turns: number, cadence: number) {
  const filled = turns % cadence;
  return { filled, remaining: cadence - filled, ready: filled === cadence - 1 };
}
