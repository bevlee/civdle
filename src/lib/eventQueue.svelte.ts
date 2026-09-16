export interface QueuedEvent<T = unknown> {
  id: string;
  type: string;
  data: T;
}

/**
 * Reactive event queue for transient UI events (floating text, level-ups,
 * age advances) so multiple animations can overlap without stepping on
 * each other's state.
 */
export class EventQueue {
  events = $state<QueuedEvent[]>([]);
  #counter = 0;

  emit<T>(type: string, data: T): string {
    this.#counter += 1;
    const id = `${type}-${this.#counter}`;
    this.events = [...this.events, { id, type, data }];
    return id;
  }

  dismiss(id: string): void {
    this.events = this.events.filter((e) => e.id !== id);
  }
}
