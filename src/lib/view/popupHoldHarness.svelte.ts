// Test harness: mounts the same `$effect(() => holdPopups())` a component would, in an
// effect root (runes only compile in .svelte.ts files, so the test can't do this itself).
import { flushSync } from "svelte";
import { holdPopups } from "./popupHold.svelte";

/** Mount a holder like a component would; returns a function that unmounts it. */
export function mountHolder(): () => void {
  const destroy = $effect.root(() => {
    $effect(() => holdPopups());
  });
  flushSync();
  return destroy;
}
