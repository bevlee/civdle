<script lang="ts">
  import BottomSheet from "./BottomSheet.svelte";
  import { SKILLS, type AgeDef } from "$lib/gameData";
  import { ageRewards, firstUnmet, type ChecklistItem } from "$lib/view/ageChecklist";
  import { cn } from "$lib/utils";
  import { holdPopups } from "$lib/view/popupHold.svelte";

  /** What the next age asks for and grants, with the button that advances to it. */
  let {
    open,
    onClose,
    nextAge,
    checklist,
    canAdvance,
    onAdvance,
  }: {
    open: boolean;
    onClose: () => void;
    nextAge: AgeDef | null;
    checklist: ChecklistItem[];
    canAdvance: boolean;
    onAdvance: () => void;
  } = $props();

  let rewards = $derived(nextAge ? ageRewards(nextAge) : []);
  let blocker = $derived.by(() => {
    const item = firstUnmet(checklist);
    if (!item) return "Not yet";
    if (item.skill) return `Not yet — train ${SKILLS[item.skill].name}`;
    return `Not yet — ${item.required - item.current} more ${item.label}`;
  });

  // The sheet only shows when there is a next age; the hold follows what is on screen.
  let shown = $derived(open && nextAge !== null);
  $effect(() => {
    if (shown) return holdPopups();
  });

  function advance() {
    onAdvance();
    onClose();
  }
</script>

<BottomSheet open={shown} {onClose} title={nextAge ? `Next age: ${nextAge.name}` : "Next age"} hideTitle>
  {#if nextAge}
    <div class="flex flex-col gap-4 pt-1">
      <div class="flex flex-col gap-0.5">
        <span class="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">Next age</span>
        <span class="text-[22px] leading-tight font-bold">{nextAge.name}</span>
      </div>

      <section class="flex flex-col gap-2" aria-labelledby="age-sheet-reqs">
        <h3 id="age-sheet-reqs" class="text-[13px] font-semibold text-muted-foreground">Requirements</h3>
        <ul class="flex flex-col gap-3 rounded-xl bg-background px-3.5 py-3">
          {#each checklist as item (item.label)}
            <li class="flex flex-col gap-1.5">
              <div class="flex items-baseline justify-between gap-3 text-[15px] tabular-nums">
                <span class={cn("flex min-w-0 gap-2", item.met && "text-emerald-400")}>
                  <span class={cn("w-4 shrink-0 text-center", !item.met && "text-muted-foreground")} aria-hidden="true">
                    {item.met ? "✓" : "○"}
                  </span>
                  <span class="min-w-0">{item.label}<span class="sr-only">{item.met ? " (met)" : ""}</span></span>
                </span>
                <span class={cn("shrink-0 font-semibold", item.met && "text-emerald-400")}>
                  {Math.min(item.current, item.required)} / {item.required}
                </span>
              </div>
              <div class="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  class={cn("h-full rounded-full", item.met ? "bg-emerald-400" : "bg-foreground/85")}
                  style:width="{Math.min(100, (item.current / Math.max(1, item.required)) * 100)}%"
                ></div>
              </div>
            </li>
          {/each}
        </ul>
      </section>

      {#if rewards.length > 0}
        <section class="flex flex-col gap-2" aria-labelledby="age-sheet-reward">
          <h3 id="age-sheet-reward" class="text-[13px] font-semibold text-amber-400">Reward</h3>
          <ul class="flex flex-wrap gap-1.5 text-[13px]">
            {#each rewards as reward (reward)}
              <li class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-300">{reward}</li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if canAdvance}
        <button
          class="h-[50px] w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-opacity active:opacity-90"
          onclick={advance}
        >
          Advance to {nextAge.name}
        </button>
      {:else}
        <button class="h-[50px] w-full rounded-xl bg-muted px-3 text-base font-semibold text-muted-foreground" disabled>
          <span class="block truncate">{blocker}</span>
        </button>
      {/if}
    </div>
  {/if}
</BottomSheet>
