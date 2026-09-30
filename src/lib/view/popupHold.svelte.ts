// Queued popups (a new skill, the achievements toast) wait while the player has a sheet
// or dialog of their own open, so two focus-trapping dialogs never stack.

let holds = $state(0);

export const popupHold = {
  get active(): boolean {
    return holds > 0;
  },
};

/** Hold queued popups until the returned function is called (calling it again does nothing). */
export function holdPopups(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
  };
}
