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

  it("makes every third turn an ultimate with attack-type-specific multiplier", () => {
    // Griffin (melee, spd 14) gets three turns before the slowed Dendroid (spd 4) acts once.
    // Melee ult multiplier is 3x, so expect roughly 3x basic damage.
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
    // Melee ult is 3x, allow some variance from execute bonus / rounding
    expect(dmg[2] / dmg[0]).toBeGreaterThan(2.5);
    expect(dmg[2] / dmg[0]).toBeLessThan(4.0);
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

describe("position-based targeting", () => {
  it("targets front-row enemies first (position 2 before back row)", () => {
    // Create a party of one strong attacker vs two enemies at positions 1 (back) and 2 (front).
    // The attacker should always hit position 2 first.
    const player = createCard("devil", 5);
    const e = enc([createCard("zombie"), createCard("zombie")]);
    const s0 = startBattle([player], e);

    // Verify enemies are at positions 1 and 2
    const enemies = s0.fighters.filter((f) => f.isEnemy);
    expect(enemies.map((e) => e.position).sort()).toEqual([1, 2]);

    // Step until the player acts
    let s = s0;
    let guard = 0;
    while (guard++ < 20) {
      s = stepBattle(s, always(0.5));
      if (s.lastAction && !s.fighters.find((f) => f.id === s.lastAction!.actorId)?.isEnemy) {
        break;
      }
    }

    // The player's first hit should target the position-2 enemy
    const targetId = s.lastAction!.hits[0].targetId;
    const targeted = s.fighters.find((f) => f.id === targetId)!;
    expect(targeted.position).toBe(2);
  });
});

describe("attack-type-specific ultimates", () => {
  // Helper: run steps until a specific fighter uses their ultimate.
  // Returns the state right after that ultimate.
  function runUntilUltimate(
    playerCards: ReturnType<typeof createCard>[],
    encounter: Encounter,
    actorFilter: (f: { id: string; isEnemy: boolean }) => boolean,
    randVal = 0.5,
  ) {
    let s = startBattle(playerCards, encounter);
    let guard = 0;
    while (guard++ < 100) {
      s = stepBattle(s, always(randVal));
      if (s.lastAction?.kind === "ultimate") {
        const actor = s.fighters.find((f) => f.id === s.lastAction!.actorId);
        if (actor && actorFilter(actor)) return s;
      }
    }
    throw new Error("Ultimate not reached within 100 steps");
  }

  it("melee ultimate hits exactly 1 target", () => {
    // Behemoth (melee, spd 9) at 10 stars vs 3 base stone-golems (spd 6).
    // Player one-shots enemies, but the ult (turn 3) should still hit exactly 1.
    const s = runUntilUltimate(
      [createCard("behemoth", 10)],
      enc([createCard("stone-golem"), createCard("stone-golem"), createCard("stone-golem")], "warband"),
      (f) => !f.isEnemy,
    );
    expect(s.lastAction!.kind).toBe("ultimate");
    expect(s.lastAction!.hits).toHaveLength(1);
  });

  it("ranged ultimate hits back-row enemies", () => {
    // Thunderbird (ranged, spd 14) at 10 stars vs 5 base stone-golems (spd 6).
    // Basic attacks on turns 1-2 kill 2 front-row enemies (pos 2 then 4).
    // Ranged ult (turn 3) should hit back-row survivors (pos 1, 3, 5).
    const s = runUntilUltimate(
      [createCard("thunderbird", 10)],
      enc(
        [createCard("stone-golem"), createCard("stone-golem"), createCard("stone-golem"), createCard("stone-golem"), createCard("stone-golem")],
        "warband",
      ),
      (f) => !f.isEnemy,
    );
    expect(s.lastAction!.kind).toBe("ultimate");
    const hitPositions = s.lastAction!.hits
      .map((h) => s.fighters.find((f) => f.id === h.targetId)!.position)
      .sort();
    // All targets should be back-row
    for (const pos of hitPositions) {
      expect([1, 3, 5]).toContain(pos);
    }
    expect(s.lastAction!.hits.length).toBeGreaterThanOrEqual(2);
  });

  it("magic ultimate hits all alive enemies", () => {
    // Titan (magic, spd 11) at 10 stars vs 5 base stone-golems (spd 6).
    // Magic ult targets all alive enemies at once.
    const s = runUntilUltimate(
      [createCard("titan", 10)],
      enc(
        [createCard("stone-golem"), createCard("stone-golem"), createCard("stone-golem"), createCard("stone-golem"), createCard("stone-golem")],
        "warband",
      ),
      (f) => !f.isEnemy,
    );
    expect(s.lastAction!.kind).toBe("ultimate");
    // Magic ult hits all alive enemies (some may have died to basics on turns 1-2)
    const hitTargets = s.lastAction!.hits.map((h) => h.targetId);
    // All hits should be against enemies
    for (const tid of hitTargets) {
      expect(s.fighters.find((f) => f.id === tid)!.isEnemy).toBe(true);
    }
    // Should hit more than 1 target (distinguishes from melee)
    expect(s.lastAction!.hits.length).toBeGreaterThanOrEqual(2);
  });

  it("ultimate hits have no dodged flag", () => {
    // Verify ultimate hits never produce a dodged result.
    const s = runUntilUltimate(
      [createCard("behemoth", 10)],
      enc([createCard("stone-golem"), createCard("stone-golem"), createCard("stone-golem")], "warband"),
      (f) => !f.isEnemy,
    );
    expect(s.lastAction!.kind).toBe("ultimate");
    expect(s.lastAction!.hits.every((h) => !h.dodged)).toBe(true);
  });
});

describe("per-fighter combat stats", () => {
  it("initialises stats to zero in startBattle", () => {
    const s = startBattle([createCard("wolf-rider")], enc([createCard("zombie")], "warband"));
    for (const f of s.fighters) {
      expect(f.stats).toEqual({ damageDealt: 0, healingDone: 0, damageTaken: 0 });
    }
  });

  it("accumulates damageDealt and damageTaken on a basic attack", () => {
    const s0 = startBattle([createCard("wolf-rider")], enc([createCard("zombie")], "warband"));
    const s1 = stepBattle(s0, always(0.5));
    const actor = s1.fighters.find((f) => f.id === s1.lastAction!.actorId)!;
    const target = s1.fighters.find((f) => f.id === s1.lastAction!.hits[0].targetId)!;
    const dmg = s1.lastAction!.hits[0].damage;
    expect(dmg).toBeGreaterThan(0);
    expect(actor.stats.damageDealt).toBe(dmg);
    expect(target.stats.damageTaken).toBe(dmg);
  });

  it("accumulates stats across multiple turns", () => {
    let s = startBattle([createCard("devil", 5)], enc([createCard("dendroid", 6)], "warband"));
    let totalDealt = 0;
    let totalTaken = 0;
    const playerId = s.fighters[0].id;
    const enemyId = s.fighters[1].id;
    for (let i = 0; i < 3; i++) {
      s = stepBattle(s, always(0.5));
      if (s.lastAction && s.lastAction.actorId === playerId) {
        totalDealt += s.lastAction.hits.reduce((sum, h) => sum + h.damage, 0);
      }
      if (s.lastAction && s.lastAction.actorId === enemyId) {
        totalTaken += s.lastAction.hits.reduce((sum, h) => sum + h.damage, 0);
      }
    }
    const player = s.fighters.find((f) => f.id === playerId)!;
    expect(player.stats.damageDealt).toBe(totalDealt);
    expect(player.stats.damageTaken).toBe(totalTaken);
  });

  it("does not mutate previous state's stats (deep copy)", () => {
    const s0 = startBattle([createCard("wolf-rider")], enc([createCard("zombie")], "warband"));
    const s1 = stepBattle(s0, always(0.5));
    // Original state's stats must remain zero
    for (const f of s0.fighters) {
      expect(f.stats.damageDealt).toBe(0);
      expect(f.stats.damageTaken).toBe(0);
    }
    // New state should have non-zero stats
    const actor = s1.fighters.find((f) => f.id === s1.lastAction!.actorId)!;
    expect(actor.stats.damageDealt).toBeGreaterThan(0);
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
