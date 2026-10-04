import { describe, expect, it } from "vitest";
import { GLOSSARY, splitGuideText } from "./guideGlossary";

const keys = (text: string, seen?: Set<string>) => splitGuideText(text, seen).filter(s => s.key).map(s => [s.text, s.key]);

describe("splitGuideText", () => {
  it("keeps the full text in order", () => {
    const text = "Ultimates can crit, but cannot be dodged.";
    expect(splitGuideText(text).map(s => s.text).join("")).toBe(text);
  });

  it("marks keywords case-insensitively, keeping the original casing", () => {
    expect(keys("Spend Tribute on summons.")).toEqual([["Tribute", "tribute"], ["summons", "summon"]]);
  });

  it("prefers the longest term", () => {
    expect(keys("Watch the ultimate charge, then basic attacks.")).toEqual([["ultimate charge", "chargeMarkers"], ["basic attacks", "basicAttack"]]);
  });

  it("tells Ascendant and ascended apart", () => {
    expect(keys("Ascendant heroes, once ascended, ...")).toEqual([["Ascendant", "ascendant"], ["ascended", "ascended"]]);
  });

  it("only matches whole words", () => {
    expect(keys("Copying is not a copy.")).toEqual([["copy", "copy"]]);
  });

  it("marks each entry once across a shared seen set", () => {
    const seen = new Set<string>();
    expect(keys("An ultimate, another ultimate, and copies.", seen)).toEqual([["ultimate", "ultimate"], ["copies", "copy"]]);
    expect(keys("Ultimates use copies of a trait.", seen)).toEqual([["trait", "trait"]]);
  });

  it("gives every entry a title, body and term", () => {
    for (const entry of Object.values(GLOSSARY)) {
      expect(entry.title && entry.body && entry.terms.length).toBeTruthy();
    }
  });
});
