import { describe, expect, it } from "vitest";
import { holdPopups, popupHold } from "./popupHold.svelte";
import { mountHolder } from "./popupHoldHarness.svelte";

describe("popupHold", () => {
  it("holds while any hold is open, and a second release does nothing", () => {
    expect(popupHold.active).toBe(false);
    const releaseA = holdPopups();
    const releaseB = holdPopups();
    expect(popupHold.active).toBe(true);
    releaseA();
    releaseA();
    expect(popupHold.active).toBe(true);
    releaseB();
    expect(popupHold.active).toBe(false);
  });

  it("holds from a component effect without tracking its own counter", () => {
    const unmountA = mountHolder();
    const unmountB = mountHolder();
    expect(popupHold.active).toBe(true);
    unmountA();
    expect(popupHold.active).toBe(true);
    unmountB();
    expect(popupHold.active).toBe(false);
  });
});
