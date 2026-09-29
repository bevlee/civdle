import { describe, expect, it } from "vitest";
import type { UnitCard, UnitId } from "../combatData";
import {
  NO_FILTER,
  activeFilterLabel,
  filterArmy,
  isFiltered,
  ownedTraits,
  promotableIds,
  sortArmy,
  starCounts,
  typeCounts,
} from "./armyFilter";

const card = (id: string, unitId: UnitId, stars: number): UnitCard => ({ id, unitId, stars });

// goblin 1★ melee (swarm, brawler, striker); wolf-rider 2★ melee (assassin, charger, skirmisher);
// orc 3★ ranged (brawler, striker, bruiser); thunderbird 5★ magic (charger, striker, skirmisher).
const army: UnitCard[] = [
  card("a", "goblin", 1),
  card("b", "goblin", 3),
  card("c", "wolf-rider", 7),
  card("d", "orc", 3),
  card("e", "thunderbird", 10),
];

const ids = (cards: UnitCard[]) => cards.map((c) => c.id);

describe("filterArmy", () => {
  it("keeps everything with no filter", () => {
    expect(ids(filterArmy(army, NO_FILTER))).toEqual(["a", "b", "c", "d", "e"]);
    expect(isFiltered(NO_FILTER)).toBe(false);
  });

  it("filters stars by rarity, not by promoted stars", () => {
    // The 3★-promoted goblin is still a 1★ hero; the 7★ wolf rider is 2★.
    expect(ids(filterArmy(army, { ...NO_FILTER, stars: 1 }))).toEqual(["a", "b"]);
    expect(ids(filterArmy(army, { ...NO_FILTER, stars: 2 }))).toEqual(["c"]);
    expect(ids(filterArmy(army, { ...NO_FILTER, stars: 3 }))).toEqual(["d"]);
  });

  it("combines type, trait and stars", () => {
    expect(ids(filterArmy(army, { ...NO_FILTER, type: "melee" }))).toEqual(["a", "b", "c"]);
    expect(ids(filterArmy(army, { ...NO_FILTER, trait: "striker" }))).toEqual(["a", "b", "d", "e"]);
    expect(ids(filterArmy(army, { stars: 1, type: "melee", trait: "striker" }))).toEqual(["a", "b"]);
    expect(filterArmy(army, { stars: 5, type: "melee", trait: null })).toEqual([]);
    expect(isFiltered({ ...NO_FILTER, trait: "tank" })).toBe(true);
  });
});

describe("counts", () => {
  it("counts each star option under the other filters", () => {
    expect(starCounts(army, NO_FILTER)).toEqual([
      { stars: 0, n: 5 },
      { stars: 1, n: 2 },
      { stars: 2, n: 1 },
      { stars: 3, n: 1 },
      { stars: 4, n: 0 },
      { stars: 5, n: 1 },
    ]);
    // The current star choice doesn't change its own row's counts.
    expect(starCounts(army, { stars: 5, type: "melee", trait: null }).map((r) => r.n)).toEqual([3, 2, 1, 0, 0, 0]);
  });

  it("counts each type option under the other filters", () => {
    expect(typeCounts(army, { stars: 0, type: "magic", trait: "striker" })).toEqual([
      { type: "all", n: 4 },
      { type: "melee", n: 2 },
      { type: "ranged", n: 1 },
      { type: "magic", n: 1 },
    ]);
  });
});

describe("ownedTraits", () => {
  it("lists each owned trait once, by name", () => {
    expect(ownedTraits([card("a", "goblin", 1), card("b", "orc", 3)])).toEqual([
      "brawler",
      "bruiser",
      "striker",
      "swarm",
    ]);
    expect(ownedTraits([])).toEqual([]);
  });
});

describe("activeFilterLabel", () => {
  it("joins the active parts", () => {
    expect(activeFilterLabel(NO_FILTER)).toBe("");
    expect(activeFilterLabel({ stars: 3, type: "melee", trait: "assassin" })).toBe("3★ · Melee · Assassin");
    expect(activeFilterLabel({ stars: 0, type: "all", trait: "tank" })).toBe("Tank");
  });
});

describe("promotableIds", () => {
  it("marks cards with a spare copy below max stars", () => {
    expect([...promotableIds(army)].sort()).toEqual(["a", "b"]);
    expect(promotableIds([card("x", "orc", 10), card("y", "orc", 3)])).toEqual(new Set(["y"]));
    expect(promotableIds([card("x", "orc", 3)]).size).toBe(0);
  });
});

describe("sortArmy", () => {
  it("sorts by stars then rarity, either way, without mutating", () => {
    const copy = [...army];
    expect(ids(sortArmy(army, "stars", true))).toEqual(["e", "c", "d", "b", "a"]);
    expect(ids(sortArmy(army, "stars", false))).toEqual(["a", "b", "d", "c", "e"]);
    expect(army).toEqual(copy);
  });

  it("sorts by name", () => {
    expect(ids(sortArmy(army, "name", false))).toEqual(["a", "b", "d", "e", "c"]);
  });
});
