// Words for the grouped achievement toast: "3 achievements unlocked" over
// "Foraging Apprentice · Humble Beginnings · +1".

const NAMED = 2;

export function achievementToastTitle(count: number): string {
  return `${count} achievement${count === 1 ? "" : "s"} unlocked`;
}

export function achievementToastNames(names: readonly string[]): string {
  const shown = names.slice(0, NAMED);
  const rest = names.length - shown.length;
  return rest > 0 ? [...shown, `+${rest}`].join(" · ") : shown.join(" · ");
}
