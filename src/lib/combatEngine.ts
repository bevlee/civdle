import type { Hero, EnemyHero, HeroClass } from "./combatData";
import { HERO_CLASSES, AP_SCALE, MAX_MANA, MANA_PER_TURN, PARTY_SIZE } from "./combatData";

export interface BattleFighter {
  id: string;
  name: string;
  heroClass: HeroClass | null;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  spd: number;
  mana: number;
  ap: number;
  isEnemy: boolean;
  abilityName: string | null;
}

export interface BattleLogEntry {
  text: string;
  type: "attack" | "ability" | "death" | "info";
}

export interface BattleState {
  fighters: BattleFighter[];
  log: BattleLogEntry[];
  status: "playing" | "won" | "lost";
  tick: number;
}

export interface GachaState {
  gold: number;
  heroes: Hero[];
  party: (string | null)[];
  enemyLevel: number;
  maxEnemyLevel: number;
  battle: BattleState | null;
}

export function createInitialGachaState(): GachaState {
  const fred: Hero = {
    id: "fred-starter",
    name: "Fred",
    heroClass: "warrior",
    level: 1,
    maxHp: 55,
    atk: 10,
    spd: 10.3,
  };
  return {
    gold: 0,
    heroes: [fred],
    party: [fred.id, null, null],
    enemyLevel: 1,
    maxEnemyLevel: 1,
    battle: null,
  };
}

function heroToFighter(hero: Hero): BattleFighter {
  const classDef = HERO_CLASSES[hero.heroClass];
  return {
    id: hero.id,
    name: hero.name,
    heroClass: hero.heroClass,
    level: hero.level,
    hp: hero.maxHp,
    maxHp: hero.maxHp,
    atk: hero.atk,
    spd: hero.spd,
    mana: 0,
    ap: 0,
    isEnemy: false,
    abilityName: classDef.abilityName,
  };
}

function enemyToFighter(enemy: EnemyHero): BattleFighter {
  return {
    id: enemy.id,
    name: enemy.name,
    heroClass: null,
    level: enemy.level,
    hp: enemy.maxHp,
    maxHp: enemy.maxHp,
    atk: enemy.atk,
    spd: enemy.spd,
    mana: 0,
    ap: 0,
    isEnemy: true,
    abilityName: null,
  };
}

export function startBattle(heroes: Hero[], enemies: EnemyHero[]): BattleState {
  return {
    fighters: [...heroes.map(heroToFighter), ...enemies.map(enemyToFighter)],
    log: [{ text: "Battle started!", type: "info" }],
    status: "playing",
    tick: 0,
  };
}

export function tickBattle(state: BattleState): BattleState {
  if (state.status !== "playing") return state;

  const fighters = state.fighters.map((f) => ({ ...f }));
  const log: BattleLogEntry[] = [];
  const tick = state.tick + 1;

  for (const f of fighters) {
    if (f.hp > 0) f.ap += f.spd * AP_SCALE;
  }

  const ready = fighters
    .filter((f) => f.hp > 0 && f.ap >= 100)
    .sort((a, b) => b.ap - a.ap);

  const acted = new Map<string, number>();

  for (const ref of ready) {
    const f = fighters.find((x) => x.id === ref.id)!;
    if (f.hp <= 0) continue;
    const times = acted.get(f.id) ?? 0;
    if (times >= 3) continue;
    acted.set(f.id, times + 1);

    f.ap -= 100;

    if (f.abilityName) {
      f.mana = Math.min(MAX_MANA, f.mana + MANA_PER_TURN);
    }

    const enemies = fighters.filter((x) => x.hp > 0 && x.isEnemy !== f.isEnemy);
    if (enemies.length === 0) continue;

    if (f.mana >= MAX_MANA && f.abilityName) {
      f.mana = 0;
      if (f.heroClass === "warrior") {
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        const damage = f.atk * 3;
        target.hp = Math.max(0, target.hp - damage);
        log.push({ text: `${f.name} uses Power Strike on ${target.name} for ${damage}!`, type: "ability" });
        if (target.hp <= 0) log.push({ text: `${target.name} defeated!`, type: "death" });
      } else if (f.heroClass === "monk") {
        const allAllies = fighters.filter((x) => x.hp > 0 && x.isEnemy === f.isEnemy);
        const wounded = allAllies.filter((x) => x.hp < x.maxHp);
        if (wounded.length > 0) {
          const target = wounded.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b));
          const heal = Math.floor(20 + f.level * 3);
          const before = target.hp;
          target.hp = Math.min(target.maxHp, target.hp + heal);
          log.push({ text: `${f.name} uses Inner Peace on ${target.name}, +${target.hp - before} HP`, type: "ability" });
        } else {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          target.hp = Math.max(0, target.hp - f.atk);
          log.push({ text: `${f.name} attacks ${target.name} for ${f.atk}`, type: "attack" });
          if (target.hp <= 0) log.push({ text: `${target.name} defeated!`, type: "death" });
        }
      }
    } else {
      const target = enemies[Math.floor(Math.random() * enemies.length)];
      target.hp = Math.max(0, target.hp - f.atk);
      log.push({ text: `${f.name} attacks ${target.name} for ${f.atk}`, type: "attack" });
      if (target.hp <= 0) log.push({ text: `${target.name} defeated!`, type: "death" });
    }
  }

  const aliveHeroes = fighters.filter((f) => !f.isEnemy && f.hp > 0);
  const aliveEnemies = fighters.filter((f) => f.isEnemy && f.hp > 0);

  let status: "playing" | "won" | "lost" = "playing";
  if (aliveEnemies.length === 0) {
    status = "won";
    log.push({ text: "Victory!", type: "info" });
  } else if (aliveHeroes.length === 0) {
    status = "lost";
    log.push({ text: "Defeated...", type: "info" });
  }

  return { fighters, log: [...state.log, ...log], status, tick };
}
