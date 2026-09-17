import { describe, expect, it } from "vitest";
import { createCard, type Encounter } from "./combatData";
import { enemyModsFor, startBattle, stepBattle } from "./combatEngine";

const always = (v: number) => () => v;

function enc(cards: ReturnType<typeof createCard>[], archetype: Encounter["archetype"] = "volley"): Encounter {
  return { archetype, cards: cards.map((c, i) => ({ ...c, id: `enemy-${i}` })) };
}

describe("stepBattle", () => {
  it("resolves one turn per step, fastest first", () => {
    const s0 = startBattle([createCard("wolf-rider")], enc([createCard("zombie")], "warband"));
    const s1 = stepBattle(s0, always(0));
    expect(s1.turn).toBe(1);
    expect(s1.lastAction?.actorId).toBe(s0.fighters[0].id); // spd 13 vs 4
    expect(s1.lastAction?.hits).toHaveLength(1);
    expect(s1.fighters[0].turns).toBe(1);
    expect(s1.fighters[1].turns).toBe(0);
  });

  it("makes every third turn an ultimate that deals about double", () => {
    // Griffin (spd 14) gets three turns before the slowed Dendroid (spd 4) acts once.
    let s = startBattle([createCard("griffin", 5)], enc([createCard("dendroid", 6)], "warband"));
    const actorId = s.fighters[0].id;
    const dmg: number[] = [];
    const kinds: string[] = [];
    let guard = 0;
    while (kinds.length < 3 && guard++ < 20) {
      s = stepBattle(s, always(0));
      if (s.lastAction?.actorId === actorId) {
        kinds.push(s.lastAction.kind);
        dmg.push(s.lastAction.hits[0].damage);
      }
    }
    expect(kinds).toEqual(["attack", "attack", "ultimate"]);
    expect(dmg[2] / dmg[0]).toBeGreaterThan(1.7);
    expect(dmg[2] / dmg[0]).toBeLessThan(2.3);
  });

  it("flags strong hits from the triangle", () => {
    const s = stepBattle(startBattle([createCard("wolf-rider")], enc([createCard("archer")])), always(0));
    expect(s.lastAction?.hits[0].strong).toBe(true);
    const w = stepBattle(startBattle([createCard("wolf-rider")], enc([createCard("sprite")])), always(0));
    expect(w.lastAction?.hits[0].weak).toBe(true);
  });

  it("runs to a result", () => {
    let s = startBattle([createCard("devil")], enc([createCard("goblin")]));
    let guard = 0;
    while (s.status === "playing" && guard++ < 100) s = stepBattle(s, always(0.5));
    expect(s.status).toBe("won");
    let l = startBattle([createCard("goblin")], enc([createCard("devil")]));
    guard = 0;
    while (l.status === "playing" && guard++ < 200) l = stepBattle(l, always(0.5));
    expect(l.status).toBe("lost");
  });

  it("applies the coven archetype's 2-turn ultimates to enemies", () => {
    const s = startBattle([createCard("goblin", 10)], enc([createCard("mage")], "coven"));
    expect(s.enemyMods.ultEvery).toBe(2);
    expect(s.playerMods.ultEvery).toBe(3);
  });
});

describe("encounter stat multiplier", () => {
  it("scales enemy HP, ATK and DEF but not the player's", () => {
    const base = enc([createCard("zombie")], "volley");
    const scaled: Encounter = { ...base, statMult: 2 };
    const a = startBattle([createCard("goblin")], base);
    const b = startBattle([createCard("goblin")], scaled);
    expect(b.fighters[1].maxHp / a.fighters[1].maxHp).toBeCloseTo(2, 0);
    expect(b.fighters[1].atk / a.fighters[1].atk).toBeCloseTo(2, 0);
    expect(b.fighters[1].def / a.fighters[1].def).toBeCloseTo(2, 0);
    expect(b.fighters[0].maxHp).toBe(a.fighters[0].maxHp);
    expect(enemyModsFor(scaled).hpMult).toBeCloseTo(2 * enemyModsFor(base).hpMult, 10);
  });
});
