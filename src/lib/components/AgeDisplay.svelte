<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import FloatingText from "./FloatingText.svelte";
  import Hint from "./Hint.svelte";
  import { AGES } from "$lib/gameData";
  import { describeAgeBonus, type AgeAdvanceStatus, type AgeBonus } from "$lib/gameEngine";
  import { ageRewards, checklistProgress, type ChecklistItem } from "$lib/view/ageChecklist";
  import type { AgeAdvanceEventData } from "$lib/gameState.svelte";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import { cn } from "$lib/utils";

  let {
    ageIndex,
    ageBonus,
    skillPoints,
    warSpoils,
    checklist,
    ageAdvanceStatus,
    onAdvance,
    events,
    ageEvent,
    onDismissEvent,
    onOpenShop,
  }: {
    ageIndex: number;
    ageBonus: AgeBonus;
    skillPoints: number;
    warSpoils: number;
    /** What the next age still asks for (see ageChecklist). */
    checklist: ChecklistItem[];
    ageAdvanceStatus: AgeAdvanceStatus;
    onAdvance: () => void;
    events: QueuedEvent[];
    /** The age advance being celebrated right now; the overlay owns dismissing it. */
    ageEvent: QueuedEvent<AgeAdvanceEventData> | null;
    onDismissEvent: (id: string) => void;
    /** Open the Town's Shop, where skill points are spent. */
    onOpenShop?: () => void;
  } = $props();

  let age = $derived(AGES[ageIndex]);
  let bonusText = $derived(describeAgeBonus(ageBonus));
  let nextRewards = $derived(ageAdvanceStatus.nextAge ? ageRewards(ageAdvanceStatus.nextAge) : []);
  let progress = $derived(checklistProgress(checklist));

  let skillPointEvents = $derived(
    events.filter(
      (e): e is QueuedEvent<{ amount: number }> => e.type === "skillPoint",
    ),
  );

  let spoilsEvents = $derived(
    events.filter(
      (e): e is QueuedEvent<{ amount: number }> => e.type === "spoilsGain",
    ),
  );

  const statClass =
    "cursor-help items-center gap-2 px-1.5 py-1 -mx-1.5 -my-1 transition-colors hover:bg-muted/60";

  // Requirements and rewards live in a dropdown under the Advance button.
  let detailsOpen = $state(false);
  let advanceMenu = $state<HTMLDivElement>();

  function handleAdvanceClick() {
    // Until the age can be reached, the button explains what is still needed.
    if (ageAdvanceStatus.canAdvance) {
      detailsOpen = false;
      onAdvance();
    } else {
      detailsOpen = !detailsOpen;
    }
  }

  function closeOnOutsideClick(event: PointerEvent) {
    if (detailsOpen && advanceMenu && !advanceMenu.contains(event.target as Node)) detailsOpen = false;
  }
</script>

<svelte:window
  onpointerdown={closeOnOutsideClick}
  onkeydown={(event) => { if (event.key === "Escape") detailsOpen = false; }}
/>

<header class="relative flex flex-col gap-2 border-b border-border px-3 py-2 sm:gap-3 sm:px-6 sm:py-4">
  <div class="flex items-center justify-between gap-2 sm:gap-4">
    <div class="flex min-w-0 items-center gap-2 sm:gap-3">
      <!-- Phones drop the wordmark so the age and Advance controls fit beside the stats. -->
      <h1 class="hidden text-base font-bold tracking-tight sm:block sm:text-lg">Civdle</h1>
      <Badge variant="secondary" class="shrink-0 text-xs sm:text-sm">{age.name}</Badge>
      {#if ageAdvanceStatus.nextAge}
        <!-- On phones the dropdown spans the header; from sm up it hangs under the button. -->
        <div class="flex shrink-0 sm:relative" bind:this={advanceMenu}>
          <Button
            size="sm"
            onclick={handleAdvanceClick}
            variant={ageAdvanceStatus.canAdvance ? "default" : "secondary"}
            class={cn("h-7 rounded-r-none px-2.5 text-xs", ageAdvanceStatus.canAdvance ? "animate-pulse-glow" : "text-muted-foreground")}
            title={ageAdvanceStatus.canAdvance ? `Advance to ${ageAdvanceStatus.nextAge.name}` : `What ${ageAdvanceStatus.nextAge.name} needs`}
          >
            Advance
          </Button>
          <Button
            size="sm"
            variant={ageAdvanceStatus.canAdvance ? "default" : "secondary"}
            class="relative h-7 rounded-l-none border-l border-background/40 px-1.5 text-xs"
            aria-expanded={detailsOpen}
            aria-controls="age-advance"
            aria-label={`Requirements and rewards for ${ageAdvanceStatus.nextAge.name}, ${progress.met} of ${progress.total} met`}
            onclick={() => (detailsOpen = !detailsOpen)}
          >
            {#if !ageAdvanceStatus.canAdvance}
              <span class="mr-1 tabular-nums" aria-hidden="true">{progress.met}/{progress.total}</span>
            {/if}
            <span aria-hidden="true" class={cn("transition-transform", detailsOpen && "rotate-180")}>▾</span>
          </Button>
          {#if detailsOpen}
            <div
              id="age-advance"
              class="absolute inset-x-3 top-full z-50 mt-1 flex sm:inset-x-auto sm:left-0 sm:mt-1.5 sm:w-[22rem] flex-col gap-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
            >
              <p class="text-sm font-semibold">{ageAdvanceStatus.nextAge.name}</p>
              <div class="flex flex-col gap-1.5">
                <span class="text-xs font-semibold text-muted-foreground">Requirements</span>
                {#each checklist as item (item.label)}
                  <div class={cn("flex justify-between gap-4 text-xs", item.met ? "text-emerald-400" : "text-foreground")}>
                    <span>{item.met ? "✓ " : ""}{item.label}</span>
                    <span class="tabular-nums">{Math.min(item.current, item.required)} / {item.required}</span>
                  </div>
                {/each}
              </div>
              <div class="flex flex-col gap-1.5">
                <span class="text-xs font-semibold text-amber-300">Reward</span>
                <div class="flex flex-wrap gap-1.5 text-xs">
                  {#each nextRewards as reward (reward)}
                    <span class="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-300">
                      {reward}
                    </span>
                  {/each}
                </div>
              </div>
              {#if bonusText}
                <span class="text-xs text-muted-foreground">Current bonus: {bonusText}</span>
              {/if}
              {#if ageAdvanceStatus.canAdvance}
                <Button size="sm" onclick={handleAdvanceClick}>Advance to {ageAdvanceStatus.nextAge.name}</Button>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
      {#if bonusText}
        <span class="hidden text-xs text-muted-foreground sm:inline">{bonusText}</span>
      {/if}
      {#if ageEvent}
        {#key ageEvent.id}
          <FloatingText
            id={ageEvent.id}
            text={ageEvent.data.bonusText}
            class="text-sm text-amber-400"
            duration={1400}
            onDone={() => {}}
          />
        {/key}
      {/if}
    </div>
    <div class="flex shrink-0 items-center gap-3 sm:gap-4">
      <div class="relative flex items-center">
        <Hint side="bottom" class={statClass} title="⚔ Tribute" text="Earned by winning battles and from the Depths. Spend it on summons and card packs for your army.">
          <span class="text-sm text-muted-foreground">⚔ <span class="hidden sm:inline">Tribute</span></span>
          <Badge variant="secondary" class="text-sm tabular-nums">
            {warSpoils}
          </Badge>
        </Hint>
        {#each spoilsEvents as event (event.id)}
          <FloatingText
            id={event.id}
            text={`+${event.data.amount} ⚔`}
            class="right-0 left-auto text-sm text-emerald-400"
            onDone={onDismissEvent}
          />
        {/each}
      </div>
      <div class="relative flex items-center">
        <Hint side="bottom" title="Skill Points" text="Earned each time a skill levels up. Spend them in the Town's Shop on permanent upgrades.">
          {#snippet trigger({ props })}
            <button
              {...props}
              class={cn(statClass, "flex cursor-pointer rounded-sm")}
              aria-label={`${skillPoints} skill points. Open the Shop`}
              onclick={(e) => {
                (props.onclick as ((e: MouseEvent) => void) | undefined)?.(e);
                onOpenShop?.();
              }}
            >
              <span class="text-sm text-muted-foreground"><span class="sm:hidden">SP</span><span class="hidden sm:inline">Skill Points</span></span>
              <Badge class="text-sm tabular-nums">{skillPoints}</Badge>
            </button>
          {/snippet}
        </Hint>
        {#each skillPointEvents as event (event.id)}
          <FloatingText
            id={event.id}
            text={`+${event.data.amount} SP`}
            class="right-0 left-auto text-sm text-emerald-400"
            onDone={onDismissEvent}
          />
        {/each}
      </div>
    </div>
  </div>
</header>
