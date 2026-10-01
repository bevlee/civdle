// Queued popups (a new skill, the achievements toast) wait while the player has a sheet
// or dialog of their own open, so two focus-trapping dialogs never stack.

import { untrack } from "svelte";

let holds = $state(0);

// Updating the counter reads it too; untracked, so the effect that holds (or is torn down)
// never subscribes to it and re-runs itself.
function bump(by: number) {
  untrack(() => {
    holds += by;
  });
}

export const popupHold = {
  get active(): boolean {
    return holds > 0;
  },
};

/** Hold queued popups until the returned function is called (calling it again does nothing). */
export function holdPopups(): () => void {
  bump(1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    bump(-1);
  };
}
