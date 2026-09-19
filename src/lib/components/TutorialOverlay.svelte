<script lang="ts">
  import { TUTORIAL_STEPS, TOTAL_TUTORIAL_STEPS } from "$lib/tutorial";

  let { step, onNext, onSkip }: {
    step: number;
    onNext: () => void;
    onSkip: () => void;
  } = $props();

  let current = $derived(step < TOTAL_TUTORIAL_STEPS ? TUTORIAL_STEPS[step] : null);
</script>

{#if current}
  <div class="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs">
    <div class="flex items-start justify-between gap-2">
      <div class="flex flex-col gap-1">
        <p class="font-semibold text-sky-300">{current.title}</p>
        <p>{current.body}</p>
      </div>
      <div class="flex shrink-0 flex-col gap-1">
        <button
          class="rounded bg-sky-500/30 px-2 py-0.5 text-sky-200 hover:bg-sky-500/50"
          onclick={onNext}
        >
          {step < TOTAL_TUTORIAL_STEPS - 1 ? "Next" : "Got it"}
        </button>
        {#if step < TOTAL_TUTORIAL_STEPS - 1}
          <button
            class="text-[10px] text-muted-foreground hover:text-foreground"
            onclick={onSkip}
          >
            Skip all
          </button>
        {/if}
      </div>
    </div>
    <p class="mt-1 text-[10px] text-muted-foreground">
      Step {step + 1} of {TOTAL_TUTORIAL_STEPS}
    </p>
  </div>
{/if}
