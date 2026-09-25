<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Progress } from "$lib/components/ui/progress";
  import FloatingText from "./FloatingText.svelte";
  import { SKILLS, type SkillId } from "$lib/gameData";
  import type { QueuedEvent } from "$lib/eventQueue.svelte";
  import { cn } from "$lib/utils";

  let {
    id,
    level,
    pct,
    isActive,
    isSelected,
    onSelect,
    events,
    onDismissEvent,
    compact = false,
  }: {
    id: SkillId;
    level: number;
    pct: number;
    isActive: boolean;
    isSelected: boolean;
    onSelect: (id: SkillId) => void;
    events: QueuedEvent[];
    onDismissEvent: (id: string) => void;
    compact?: boolean;
  } = $props();

  let levelUpEvent = $derived(
    events.find(
      (e): e is QueuedEvent<{ skillId: SkillId; newLevel: number }> =>
        e.type === "levelUp" && (e.data as any).skillId === id,
    ),
  );

  let unlockEvent = $derived(
    events.find(
      (e): e is QueuedEvent<{ skillId: SkillId }> =>
        e.type === "skillUnlock" && (e.data as any).skillId === id,
    ),
  );

  let button: HTMLButtonElement;

  // Keep the selected skill visible in the phone strip, e.g. after an unlock selects it.
  $effect(() => {
    if (compact && isSelected) button.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  $effect(() => {
    if (!unlockEvent) return;
    const timeout = setTimeout(() => onDismissEvent(unlockEvent!.id), 1500);
    return () => clearTimeout(timeout);
  });
</script>

<button
  bind:this={button}
  onclick={() => onSelect(id)}
  class={cn(
    "relative flex flex-col gap-1 overflow-hidden rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
    compact && "w-32 shrink-0 border border-border",
    isSelected && "bg-accent",
    compact && isSelected && "border-primary/60",
    unlockEvent && "animate-slide-in-right",
  )}
>
  {#if levelUpEvent}
    {#key levelUpEvent.id}
      <div
        class="animate-flash-gold pointer-events-none absolute inset-0 bg-amber-400/40"
      ></div>
    {/key}
  {/if}
  <div class="flex items-center justify-between text-sm">
    <span class="flex min-w-0 items-center gap-1.5 font-medium">
      <span class={cn(compact && "truncate")}>{SKILLS[id].name}</span>
      {#if isActive}
        <span class="text-green-500">●</span>
      {/if}
      {#if unlockEvent}
        <Badge class="h-4 px-1 text-[10px] leading-none">NEW</Badge>
      {/if}
    </span>
    <span class="shrink-0 whitespace-nowrap text-muted-foreground">Lv {level}</span>
  </div>
  <Progress value={pct} class="h-1.5" />
  {#if levelUpEvent}
    <FloatingText
      id={levelUpEvent.id}
      text="+LEVEL UP!"
      class="text-xs text-amber-400"
      duration={1100}
      onDone={onDismissEvent}
    />
  {/if}
</button>
