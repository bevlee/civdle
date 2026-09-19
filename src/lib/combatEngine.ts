// Pure auto-battle engine. `stepBattle` resolves exactly one unit's turn so the
// UI can pause and animate between turns.

import type { AttackType, Encounter, Trait, UnitCard, UnitId } from "./combatData";
import {
  ENEMY_ARCHETYPES,
  PARTY_SIZE,
  STARTING_GOLD,
  ULT_MULT,
  UNITS,
  computeCardStats,
  getTypeMultiplier,
} from "./combatData";
import type { ArmyMods } from "./traits";
import { computeArmyMods } from "./traits";
import type { Position } from "./position";
import { indexToPosition, selectTarget, selectUltimateTargets } from "./position";

export interface FighterStats {
  damageDealt: number;
  healingDone: number;
  damageTaken: number;
}

export interface Fighter {
  id: string;
  unitId: UnitId;
  name: string;
  stars: number;
  attackType: AttackType;
  position: Position;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  ap: number;
  turns: number;
  isEnemy: boolean;
  traits: Trait[];
  stats: FighterStats;
}

export interface Hit {
  targetId: string;
  damage: number;
  crit: boolean;
  strong: boolean;
  weak: boolean;
  dodged: boolean;
  killed: boolean;
}

export interface BattleAction {
  kind: "attack" | "ultimate";
  actorId: string;
  hits: Hit[];
  healed: number;
  turnHeal: number;
}

export interface BattleLogEntry {
  text: string;
  type: "attack" | "ultimate" | "death" | "info";
}

export interface BattleState {
  fighters: Fighter[];
  playerMods: ArmyMods;
  enemyMods: ArmyMods;
  status: "playing" | "won" | "lost";
  turn: number;
  lastAction: BattleAction | null;
  log: BattleLogEntry[];
}

export type BattleMode = "story" | "depths";

export interface DepthsState {
  /** The next depth to fight; `level - 1` depths have been cleared. */
  level: number;
  /** Keep fighting automatically (the only mode that may be auto-ground). */
  auto: boolean;
  encounter: Encounter | null;
}

export interface GachaState {
  gold: number;
  cards: UnitCard[];
  party: (string | null)[];
  /** Next Main Story level to fight. Past MAX_ENEMY_LEVEL means the story is complete. */
  storyLevel: number;
  /** The current Main Story encounter. */
  encounter: Encounter | null;
  depths: DepthsState;
  battle: BattleState | null;
  battleMode: BattleMode | null;
  tutorialStep: number;
}

export function createInitialDepthsState(): DepthsState {
  return { level: 1, auto: false, encounter: null };
}

export function createInitialGachaState(): GachaState {
  return {
    gold: STARTING_GOLD,
    cards: [],
    party: Array.from({ length: PARTY_SIZE }, () => null),
    storyLevel: 1,
    encounter: null,
    depths: createInitialDepthsState(),
    battle: null,
    battleMode: null,
    tutorialStep: 0,
  };
}

function cardToFighter(card: UnitCard, isEnemy: boolean, own: ArmyMods, opp: ArmyMods, position: Position): Fighter {
  const def = UNITS[card.unitId];
  const s = computeCardStats(card.unitId, card.stars);
  return {
    id: card.id,
    unitId: card.unitId,
    name: def.name,
    stars: card.stars,
    attackType: def.attackType,
    position,
    hp: 0,
    maxHp: Math.max(1, Math.floor(s.hp * own.hpMult)),
    atk: Math.max(1, Math.floor(s.atk * own.atkMult)),
    def: Math.max(0, Math.floor(s.def * own.defMult * opp.enemyDefMult)),
    spd: Math.max(1, s.spd + own.spdFlat + opp.enemySpdFlat),
    ap: 0,
    turns: 0,
    isEnemy,
    traits: def.traits,
    stats: { damageDealt: 0, healingDone: 0, damageTaken: 0 },
  };
}

export function enemyModsFor(encounter: Encounter): ArmyMods {
  const mods = computeArmyMods(encounter.cards);
  const arch = ENEMY_ARCHETYPES[encounter.archetype];
  const statMult = encounter.statMult ?? 1;
  mods.hpMult *= arch.hpMult * statMult;
  mods.atkMult *= arch.atkMult * statMult;
  mods.defMult *= arch.defMult * statMult;
  mods.spdFlat += arch.spdFlat;
  mods.ultEvery = Math.min(mods.ultEvery, arch.ultEvery);
  return mods;
}

export function startBattle(playerCards: UnitCard[], encounter: Encounter): BattleState {
  const playerMods = computeArmyMods(playerCards);
  const enemyMods = enemyModsFor(encounter);
  const fighters = [
    ...playerCards.map((c, i) => cardToFighter(c, false, playerMods, enemyMods, indexToPosition(i))),
    ...encounter.cards.map((c, i) => cardToFighter(c, true, enemyMods, playerMods, indexToPosition(i))),
  ];
  for (const f of fighters) f.hp = f.maxHp;
  return {
    fighters,
    playerMods,
    enemyMods,
    status: "playing",
    turn: 0,
    lastAction: null,
    log: [{ text: "Battle started!", type: "info" }],
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function computeDamage(
  attacker: Fighter,
  target: Fighter,
  mods: ArmyMods,
  isUltimate: boolean,
  crit: boolean,
): number {
  const effDef = target.def * (1 - mods.defIgnore);
  let dmg = attacker.atk * clamp(1 + 0.05 * (attacker.atk - effDef), 0.3, 3);
  dmg *= getTypeMultiplier(attacker.attackType, target.attackType);
  if (isUltimate) {
    dmg *= ULT_MULT[attacker.attackType] * mods.ultMult;
  } else {
    dmg *= mods.basicMult;
  }
  if (crit) dmg *= 2;
  if (target.hp < target.maxHp * 0.5) dmg *= 1 + mods.executeBonus;
  return Math.max(1, Math.round(dmg));
}

/** Picks the fighter that reaches 100 AP soonest and advances everyone's AP. */
function advanceInitiative(fighters: Fighter[]): Fighter | null {
  const alive = fighters.filter((f) => f.hp > 0);
  if (alive.length === 0) return null;
  let best: Fighter | null = null;
  let bestDt = Infinity;
  for (const f of alive) {
    const dt = Math.max(0, (100 - f.ap) / f.spd);
    if (dt < bestDt - 1e-9 || (Math.abs(dt - bestDt) < 1e-9 && best && best.isEnemy && !f.isEnemy)) {
      best = f;
      bestDt = dt;
    }
  }
  for (const f of alive) f.ap += f.spd * bestDt;
  if (best) best.ap -= 100;
  return best;
}

export function stepBattle(state: BattleState, rand: () => number = Math.random): BattleState {
  if (state.status !== "playing") return state;

  const fighters = state.fighters.map((f) => ({ ...f, stats: { ...f.stats } }));
  const log: BattleLogEntry[] = [];
  const actor = advanceInitiative(fighters);
  if (!actor) return state;

  const own = actor.isEnemy ? state.enemyMods : state.playerMods;
  actor.turns += 1;

  let turnHeal = 0;
  if (own.turnHealPct > 0 && actor.hp < actor.maxHp) {
    const before = actor.hp;
    actor.hp = Math.min(actor.maxHp, actor.hp + Math.floor(actor.maxHp * own.turnHealPct));
    turnHeal = actor.hp - before;
    actor.stats.healingDone += turnHeal;
  }

  const isUltimate = actor.turns % own.ultEvery === 0;
  const opponents = fighters.filter((f) => f.hp > 0 && f.isEnemy !== actor.isEnemy);
  const hits: Hit[] = [];
  let healed = 0;

  if (opponents.length > 0) {
    const oppMods = actor.isEnemy ? state.playerMods : state.enemyMods;

    if (isUltimate) {
      // Ultimate: attack-type-specific targeting, no dodge, no double-hit
      const targets = selectUltimateTargets(actor.attackType, opponents);
      for (const target of targets) {
        if (target.hp <= 0) continue;
        const crit = rand() < own.critChance;
        const damage = computeDamage(actor, target, own, true, crit);
        const typeMult = getTypeMultiplier(actor.attackType, target.attackType);
        target.hp = Math.max(0, target.hp - damage);
        const killed = target.hp <= 0;
        actor.stats.damageDealt += damage;
        target.stats.damageTaken += damage;
        hits.push({ targetId: target.id, damage, crit, strong: typeMult > 1, weak: typeMult < 1, dodged: false, killed });
        if (own.lifesteal > 0) {
          const before = actor.hp;
          actor.hp = Math.min(actor.maxHp, actor.hp + Math.floor(damage * own.lifesteal));
          const ls = actor.hp - before;
          healed += ls;
          actor.stats.healingDone += ls;
        }
        log.push({
          text: `${actor.name} unleashes an ULTIMATE on ${target.name} for ${damage}${crit ? " (crit!)" : ""}${typeMult > 1 ? " ▲" : ""}`,
          type: "ultimate",
        });
        if (killed) log.push({ text: `${target.name} is defeated!`, type: "death" });
      }
    } else {
      // Basic attack: single target, can dodge, can double-hit
      const target = selectTarget(opponents)!;
      const strikes = rand() < own.doubleHitChance ? 2 : 1;
      for (let i = 0; i < strikes && target.hp > 0; i++) {
        if (rand() < oppMods.dodgeChance) {
          hits.push({ targetId: target.id, damage: 0, crit: false, strong: false, weak: false, dodged: true, killed: false });
          continue;
        }
        const crit = rand() < own.critChance;
        const damage = computeDamage(actor, target, own, false, crit);
        const typeMult = getTypeMultiplier(actor.attackType, target.attackType);
        target.hp = Math.max(0, target.hp - damage);
        const killed = target.hp <= 0;
        actor.stats.damageDealt += damage;
        target.stats.damageTaken += damage;
        hits.push({ targetId: target.id, damage, crit, strong: typeMult > 1, weak: typeMult < 1, dodged: false, killed });
        if (own.lifesteal > 0) {
          const before = actor.hp;
          actor.hp = Math.min(actor.maxHp, actor.hp + Math.floor(damage * own.lifesteal));
          const ls = actor.hp - before;
          healed += ls;
          actor.stats.healingDone += ls;
        }
        log.push({
          text: `${actor.name} attacks ${target.name} for ${damage}${crit ? " (crit!)" : ""}${typeMult > 1 ? " ▲" : ""}`,
          type: "attack",
        });
        if (killed) log.push({ text: `${target.name} is defeated!`, type: "death" });
      }
      if (hits.every((h) => h.dodged)) {
        log.push({ text: `${target.name} dodges ${actor.name}'s attack`, type: "attack" });
      }
    }
  }

  const alivePlayers = fighters.some((f) => !f.isEnemy && f.hp > 0);
  const aliveEnemies = fighters.some((f) => f.isEnemy && f.hp > 0);
  let status: BattleState["status"] = "playing";
  if (!aliveEnemies) {
    status = "won";
    log.push({ text: "Victory!", type: "info" });
  } else if (!alivePlayers) {
    status = "lost";
    log.push({ text: "Defeated...", type: "info" });
  }

  return {
    ...state,
    fighters,
    status,
    turn: state.turn + 1,
    lastAction: { kind: isUltimate ? "ultimate" : "attack", actorId: actor.id, hits, healed, turnHeal },
    log: [...state.log, ...log].slice(-60),
  };
}
