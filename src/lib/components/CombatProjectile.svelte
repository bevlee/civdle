<script lang="ts">
  import { onMount } from "svelte";

  let {
    id,
    attackType,
    fromEnemy = false,
    onDone,
  }: {
    id: string;
    attackType: "ranged" | "magic";
    fromEnemy?: boolean;
    onDone: (id: string) => void;
  } = $props();

  onMount(() => {
    const timeout = setTimeout(() => onDone(id), 500);
    return () => clearTimeout(timeout);
  });
</script>

<div
  class="pointer-events-none absolute top-1/2 z-10 -translate-y-1/2"
  class:left-full={!fromEnemy}
  class:right-full={fromEnemy}
  style={fromEnemy ? "transform-origin: right center" : "transform-origin: left center"}
>
  {#if attackType === "ranged"}
    <div
      class="projectile-arrow"
      class:projectile-fly-right={!fromEnemy}
      class:projectile-fly-left={fromEnemy}
    >
      <svg width="24" height="10" viewBox="0 0 24 10" class="drop-shadow-[0_0_4px_rgba(255,200,50,0.8)]">
        <line x1="0" y1="5" x2="18" y2="5" stroke="#fbbf24" stroke-width="2" />
        <polygon points="18,1 24,5 18,9" fill="#f59e0b" />
        <line x1="0" y1="5" x2="3" y2="2" stroke="#fbbf24" stroke-width="1.5" />
        <line x1="0" y1="5" x2="3" y2="8" stroke="#fbbf24" stroke-width="1.5" />
      </svg>
    </div>
  {:else}
    <div
      class="projectile-magic"
      class:projectile-fly-right={!fromEnemy}
      class:projectile-fly-left={fromEnemy}
    >
      <div class="h-3.5 w-3.5 rounded-full bg-violet-400 shadow-[0_0_8px_3px_rgba(167,139,250,0.7),0_0_16px_6px_rgba(139,92,246,0.4)]"></div>
    </div>
  {/if}
</div>
