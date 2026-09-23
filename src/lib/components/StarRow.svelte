<script lang="ts">
  import { starSlots, starColor } from "$lib/rarity";
  import { cn } from "$lib/utils";

  let {
    stars,
    ascended = false,
    class: className,
  }: {
    stars: number;
    ascended?: boolean;
    class?: string;
  } = $props();

  let row = $derived(starSlots(stars));
</script>

<span class={cn("inline-flex items-center", className)} aria-label={`${stars} stars`}>
  {#if row.maxed}
    <span class={ascended ? "card-ascended-star" : "text-yellow-300"}>✦</span>
  {:else}
    {#each row.slots as tier, i (i)}
      <span class:star-purple={tier === "purple"} style:color={starColor(tier)}>★</span>
    {/each}
  {/if}
</span>

<style>
  /* Purple stars are "upgraded" gold stars: a soft glow keeps them from reading as dimmer. */
  .star-purple {
    text-shadow: 0 0 4px oklch(0.7 0.22 300 / 0.8);
  }
</style>
