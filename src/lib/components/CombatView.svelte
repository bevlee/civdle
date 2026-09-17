<script lang="ts">
  import type { GachaState, BattleFighter } from "$lib/combatEngine";
  import { HERO_CLASSES, GACHA_COST, MAX_ENEMY_LEVEL, type Hero } from "$lib/combatData";
  import { Button } from "$lib/components/ui/button";

  let {
    gacha,
    lastRolledHero,
    onRoll,
    onAssign,
    onRemoveFromParty,
    onFight,
    onSetLevel,
    onDismissBattle,
    onDismissRoll,
    onDiscard,
  }: {
    gacha: GachaState;
    lastRolledHero: Hero | null;
    onRoll: () => void;
    onAssign: (heroId: string) => void;
    onRemoveFromParty: (slot: number) => void;
    onFight: () => void;
    onSetLevel: (level: number) => void;
    onDismissBattle: () => void;
    onDismissRoll: () => void;
    onDiscard: (heroId: string) => void;
  } = $props();

  let isPlaying = $derived(gacha.battle?.status === "playing");
  let battleDone = $derived(
    gacha.battle && gacha.battle.status !== "playing",
  );

  let partyHeroes = $derived(
    gacha.party.map((id) =>
      id ? gacha.heroes.find((h) => h.id === id) ?? null : null,
    ),
  );

  let partyIds = $derived(new Set(gacha.party.filter((id): id is string => id !== null)));

  let hasPartyHeroes = $derived(gacha.party.some((id) => id !== null));

  let sortedHeroes = $derived(
    [...gacha.heroes].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name)),
  );

  let heroFighters = $derived(
    gacha.battle?.fighters.filter((f) => !f.isEnemy) ?? [],
  );
  let enemyFighters = $derived(
    gacha.battle?.fighters.filter((f) => f.isEnemy) ?? [],
  );

  let recentLog = $derived(
    gacha.battle?.log.slice(-15) ?? [],
  );

  function classEmoji(heroClass: string | null): string {
    if (!heroClass) return "👺";
    return HERO_CLASSES[heroClass as keyof typeof HERO_CLASSES]?.emoji ?? "?";
  }

  function hpPercent(f: BattleFighter): number {
    return Math.max(0, Math.round((f.hp / f.maxHp) * 100));
  }

  function hpColor(pct: number): string {
    if (pct > 60) return "bg-green-500";
    if (pct > 30) return "bg-yellow-500";
    return "bg-red-500";
  }

  function manaPercent(f: BattleFighter): number {
    return Math.round((f.mana / 100) * 100);
  }

  function logColor(type: string): string {
    switch (type) {
      case "ability": return "text-blue-400";
      case "death": return "text-red-400";
      case "info": return "text-yellow-400";
      default: return "text-muted-foreground";
    }
  }

  function levelRarity(level: number): string {
    if (level >= 80) return "text-yellow-400 font-bold";
    if (level >= 50) return "text-purple-400 font-semibold";
    if (level >= 20) return "text-blue-400";
    return "text-muted-foreground";
  }
</script>

<div class="flex flex-col gap-3">
  <!-- Header -->
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-1.5">
      <span class="text-lg">💰</span>
      <span class="text-sm font-bold tabular-nums">{gacha.gold}</span>
    </div>

    <div class="flex items-center gap-1">
      <button
        class="rounded px-1.5 py-0.5 text-xs hover:bg-accent disabled:opacity-30"
        disabled={isPlaying || gacha.enemyLevel <= 1}
        onclick={() => onSetLevel(gacha.enemyLevel - 1)}
      >◄</button>
      <span class="min-w-[5rem] text-center text-sm font-medium">
        Level {gacha.enemyLevel}/{gacha.maxEnemyLevel}
      </span>
      <button
        class="rounded px-1.5 py-0.5 text-xs hover:bg-accent disabled:opacity-30"
        disabled={isPlaying || gacha.enemyLevel >= gacha.maxEnemyLevel}
        onclick={() => onSetLevel(gacha.enemyLevel + 1)}
      >►</button>
    </div>

    <Button
      size="sm"
      disabled={isPlaying || !hasPartyHeroes}
      onclick={onFight}
    >
      ⚔ Fight
    </Button>
  </div>

  <!-- Battle Arena -->
  {#if gacha.battle}
    <div class="rounded-lg border border-border bg-muted/30 p-3">
      <div class="flex items-start justify-between gap-3">
        <!-- Heroes -->
        <div class="flex flex-col gap-1.5">
          {#each heroFighters as f (f.id)}
            {@const hp = hpPercent(f)}
            <div class="flex items-center gap-2 rounded border border-border/50 bg-background/50 px-2 py-1.5 text-xs {f.hp <= 0 ? 'opacity-30' : ''}">
              <span>{classEmoji(f.heroClass)}</span>
              <div class="flex min-w-[6rem] flex-col gap-0.5">
                <div class="flex items-center justify-between">
                  <span class="font-medium">{f.name}</span>
                  <span class="text-[10px] text-muted-foreground">L{f.level}</span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div class="h-full transition-all duration-300 {hpColor(hp)}" style="width:{hp}%"></div>
                </div>
                {#if f.abilityName}
                  <div class="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div class="h-full bg-blue-500 transition-all duration-300" style="width:{manaPercent(f)}%"></div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <span class="mt-4 text-lg font-bold text-muted-foreground/50">VS</span>

        <!-- Enemies -->
        <div class="flex flex-col gap-1.5">
          {#each enemyFighters as f (f.id)}
            {@const hp = hpPercent(f)}
            <div class="flex items-center gap-2 rounded border border-red-500/20 bg-red-500/5 px-2 py-1.5 text-xs {f.hp <= 0 ? 'opacity-30' : ''}">
              <span>👺</span>
              <div class="flex min-w-[5rem] flex-col gap-0.5">
                <div class="flex items-center justify-between">
                  <span class="font-medium">{f.name}</span>
                  <span class="text-[10px] text-muted-foreground">L{f.level}</span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div class="h-full transition-all duration-300 {hpColor(hp)}" style="width:{hp}%"></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Battle Log -->
      <div class="mt-2 flex max-h-24 flex-col-reverse overflow-y-auto rounded border border-border/30 bg-background/30 p-1.5 text-[11px] leading-relaxed">
        <div>
          {#each recentLog as entry, i}
            <p class={logColor(entry.type)}>{entry.text}</p>
          {/each}
        </div>
      </div>

      <!-- Battle Result -->
      {#if battleDone}
        <div class="mt-2 flex items-center justify-between">
          {#if gacha.battle?.status === "won"}
            <span class="text-sm font-semibold text-green-400">
              Victory! +{gacha.enemyLevel} gold
            </span>
          {:else}
            <span class="text-sm font-semibold text-red-400">
              Defeated — try again
            </span>
          {/if}
          <Button size="sm" variant="outline" onclick={onDismissBattle}>
            Dismiss
          </Button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Gacha Roll Result -->
  {#if lastRolledHero}
    <div class="flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2">
      <div class="flex items-center gap-2">
        <span class="text-lg">{classEmoji(lastRolledHero.heroClass)}</span>
        <div>
          <span class="text-sm font-semibold">{lastRolledHero.name}</span>
          <span class="ml-1 text-xs {levelRarity(lastRolledHero.level)}">
            L{lastRolledHero.level} {HERO_CLASSES[lastRolledHero.heroClass].name}
          </span>
        </div>
        <div class="text-[10px] text-muted-foreground">
          HP:{lastRolledHero.maxHp} ATK:{lastRolledHero.atk} SPD:{lastRolledHero.spd}
        </div>
      </div>
      <button
        class="text-xs text-muted-foreground hover:text-foreground"
        onclick={onDismissRoll}
      >✕</button>
    </div>
  {/if}

  <!-- Party Slots -->
  <div>
    <h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Your Party
    </h3>
    <div class="grid grid-cols-3 gap-2">
      {#each partyHeroes as hero, i}
        <button
          class="flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-colors
            {hero
              ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
              : 'border-dashed border-border/50 text-muted-foreground/50'}"
          disabled={isPlaying}
          onclick={() => { if (hero) onRemoveFromParty(i); }}
        >
          {#if hero}
            <span class="text-lg">{classEmoji(hero.heroClass)}</span>
            <span class="font-medium">{hero.name}</span>
            <span class={levelRarity(hero.level)}>L{hero.level}</span>
            <span class="text-[10px] text-muted-foreground">
              {HERO_CLASSES[hero.heroClass].name}
            </span>
          {:else}
            <span class="text-lg opacity-30">+</span>
            <span>Empty</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Hero Collection -->
  <div>
    <div class="mb-1.5 flex items-center justify-between">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Heroes ({gacha.heroes.length})
      </h3>
      <Button
        size="sm"
        variant="outline"
        disabled={gacha.gold < GACHA_COST || isPlaying}
        onclick={onRoll}
      >
        🎲 Roll ({GACHA_COST}💰)
      </Button>
    </div>
    <div class="flex max-h-52 flex-col gap-0.5 overflow-y-auto">
      {#each sortedHeroes as hero (hero.id)}
        {@const inParty = partyIds.has(hero.id)}
        <div class="flex items-center justify-between rounded border border-border/40 px-2 py-1 text-xs hover:bg-accent/30">
          <div class="flex items-center gap-1.5">
            <span>{classEmoji(hero.heroClass)}</span>
            <span class="font-medium">{hero.name}</span>
            <span class={levelRarity(hero.level)}>L{hero.level}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] tabular-nums text-muted-foreground">
              HP:{hero.maxHp} ATK:{hero.atk} SPD:{hero.spd}
            </span>
            {#if inParty}
              <span class="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                Party
              </span>
            {:else}
              <div class="flex gap-1">
                <button
                  class="rounded bg-accent px-1.5 py-0.5 text-[10px] hover:bg-accent/80 disabled:opacity-30"
                  disabled={isPlaying || !gacha.party.includes(null)}
                  onclick={() => onAssign(hero.id)}
                >
                  + Add
                </button>
                <button
                  class="rounded px-1 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                  disabled={isPlaying}
                  onclick={() => onDiscard(hero.id)}
                  title="Discard hero"
                >
                  ✕
                </button>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
