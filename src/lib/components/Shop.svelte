<script lang="ts">
  import { GLOBAL_UPGRADES, SKILL_ORDER, SKILLS, type SkillId } from "$lib/gameData";
  import { type GameState, canBuyGlobalUpgrade, hasMaxedSkill } from "$lib/gameEngine";
  import { cn } from "$lib/utils";

  /** Skill-point upgrades: Mastery first once a skill is maxed, then one group per unlocked skill. */
  let {
    state,
    levels,
    hintOpen = $bindable(false),
    onBuy,
    onBuyGlobal,
  }: {
    state: GameState;
    levels: Record<SkillId, number>;
    /** What skill points are, shown above the balance. */
    hintOpen?: boolean;
    onBuy: (skillId: SkillId, upgradeId: string) => void;
    onBuyGlobal: (upgradeId: string) => void;
  } = $props();

  let infoButton: HTMLButtonElement | undefined; // Plain: only read when the hint is dismissed.

  interface Row {
    id: string;
    name: string;
    description: string;
    cost: number;
    owned: boolean;
    canBuy: boolean;
    buy: () => void;
  }

  interface Group {
    id: string;
    name: string;
    mastery: boolean;
    rows: Row[];
  }

  let groups = $derived.by<Group[]>(() => {
    const out: Group[] = [];
    if (hasMaxedSkill(state)) {
      out.push({
        id: "mastery",
        name: "Mastery",
        mastery: true,
        rows: GLOBAL_UPGRADES.map((u) => ({
          id: u.id,
          name: u.name,
          description: u.description,
          cost: u.cost,
          owned: state.globalUpgrades.includes(u.id),
          canBuy: canBuyGlobalUpgrade(state, u.id),
          buy: () => onBuyGlobal(u.id),
        })),
      });
    }
    for (const skillId of SKILL_ORDER) {
      if (!state.skills[skillId].unlocked) continue;
      const owned = state.skills[skillId].upgrades;
      out.push({
        id: skillId,
        name: `${SKILLS[skillId].name} · Lv ${levels[skillId]}`,
        mastery: false,
        rows: SKILLS[skillId].upgrades.map((u) => ({
          id: u.id,
          name: u.name,
          description: u.description,
          cost: u.cost,
          owned: owned.includes(u.id),
          canBuy: !owned.includes(u.id) && state.skillPoints >= u.cost,
          buy: () => onBuy(skillId, u.id),
        })),
      });
    }
    return out;
  });
</script>

<div class="flex flex-col gap-[18px]">
  <!-- Always in the DOM (hidden when closed) so the ⓘ button's aria-controls resolves. -->
  <div
    id="sp-hint"
    hidden={!hintOpen}
    class="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-card py-2.5 pr-2 pl-3"
  >
    <span
      class="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-primary font-serif text-xs font-bold text-primary-foreground italic"
      aria-hidden="true">i</span
    >
    <p class="flex-1 text-[13px] leading-snug text-pretty">
      <b class="font-semibold">Skill points</b> are earned each time any skill levels up. Spend them here on
      permanent upgrades for that skill.
    </p>
    <button
      class="tap-target -my-1 flex size-7 shrink-0 items-center justify-center text-base text-muted-foreground hover:text-foreground"
      aria-label="Dismiss"
      onclick={() => {
        hintOpen = false;
        infoButton?.focus();
      }}
    >
      ×
    </button>
  </div>

  <div class="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-3.5">
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="flex items-center gap-1.5 text-[15px] font-semibold">
        Skill points
        <button
          class="tap-target -m-2 flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="About skill points"
          bind:this={infoButton}
          aria-expanded={hintOpen}
          aria-controls="sp-hint"
          onclick={() => (hintOpen = !hintOpen)}
        >
          <span
            class="flex size-3.5 items-center justify-center rounded-full border border-current font-serif text-[10px] font-bold italic"
            aria-hidden="true">i</span
          >
        </button>
      </span>
      <span class="text-[13px] text-muted-foreground">+1 every skill level-up</span>
    </span>
    <span class="text-[26px] font-bold tabular-nums">{state.skillPoints.toLocaleString()}</span>
  </div>

  {#each groups as group (group.id)}
    <section class="flex flex-col gap-2" aria-label={group.name}>
      <div class="flex items-baseline justify-between gap-3">
        <h3
          class={cn(
            "min-w-0 flex-1 text-xs font-semibold tracking-[.06em] uppercase",
            group.mastery ? "text-amber-400" : "text-muted-foreground",
          )}
        >
          {group.name}
        </h3>
        <span class="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {group.rows.filter((r) => r.owned).length}/{group.rows.length}
        </span>
      </div>
      <ul
        class={cn(
          "flex flex-col overflow-hidden rounded-[14px] border bg-card",
          group.mastery ? "border-amber-400/30" : "border-border",
        )}
      >
        {#each group.rows as row (row.id)}
          <li class="flex min-h-15 items-center gap-3 border-b border-border/60 py-2 pr-2 pl-3.5 last:border-b-0">
            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class={cn("text-[15px] font-semibold", row.owned && "text-muted-foreground")}>{row.name}</span>
              <span class="text-[13px] leading-snug text-pretty text-muted-foreground">{row.description}</span>
            </span>
            {#if row.owned}
              <span class="flex h-10 min-w-19 shrink-0 items-center justify-center px-3 text-sm font-semibold text-emerald-400">
                Owned
              </span>
            {:else}
              <button
                class={cn(
                  "tap-target h-10 min-w-19 shrink-0 rounded-[10px] border px-3 text-sm font-semibold tabular-nums transition-colors",
                  row.canBuy
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/85"
                    : "border-border text-muted-foreground",
                )}
                disabled={!row.canBuy}
                aria-label={`Buy ${row.name} for ${row.cost} skill points`}
                onclick={row.buy}
              >
                {row.cost} SP
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</div>
