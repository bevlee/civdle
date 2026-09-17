import { describe, expect, it } from "vitest";
import { movePartyCard } from "./party";

describe("movePartyCard", () => {
  it("places an inventory card into an empty slot", () => {
    expect(movePartyCard([null, null, null], "a", 1)).toEqual([null, "a", null]);
  });

  it("replaces the occupant when an inventory card lands on a full slot", () => {
    expect(movePartyCard(["x", "y", null], "a", 0)).toEqual(["a", "y", null]);
  });

  it("moves a party card to an empty slot, vacating its old slot", () => {
    expect(movePartyCard(["a", null, null], "a", 2)).toEqual([null, null, "a"]);
  });

  it("swaps two party cards when dropped on an occupied slot", () => {
    expect(movePartyCard(["a", "b", null], "a", 1)).toEqual(["b", "a", null]);
  });

  it("is a no-op when dropped on its own slot", () => {
    expect(movePartyCard(["a", "b", null], "a", 0)).toEqual(["a", "b", null]);
  });

  it("returns the party unchanged for an out-of-range slot", () => {
    const party = ["a", null, null];
    expect(movePartyCard(party, "b", 3)).toEqual(party);
    expect(movePartyCard(party, "b", -1)).toEqual(party);
  });
});
