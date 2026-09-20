<script lang="ts">
  import type { BattlePlayback } from "$lib/battlePlayback";
  import { onMount } from "svelte";
  import { timeline } from "$lib/combatAnimation";

  let { playback, id, attackType, x, y, dx, dy, angle, ultimate = false, onDone }: {
    playback: BattlePlayback;
    id: string; attackType: "ranged" | "magic";
    x: number; y: number; dx: number; dy: number; angle: number;
    ultimate?: boolean; onDone: (id: string) => void;
  } = $props();
  let duration = $derived(ultimate ? timeline.ultimateMs : timeline.attackMs);
  onMount(() => {
    const cancel = playback.schedule(() => onDone(id), duration * timeline.impactAt);
    return cancel;
  });
</script>

<div class="projectile" class:ultimate aria-hidden="true"
  style:left={`${x}px`} style:top={`${y}px`} style:--dx={`${dx}px`} style:--dy={`${dy}px`}
  style:--delay={`${duration * timeline.launchAt}ms`} style:--flight={`${duration * (timeline.impactAt - timeline.launchAt)}ms`}>
  <div class="projectile-body" style:transform={`translate(-50%, -50%) rotate(${angle}deg)`}>
    {#if attackType === "ranged"}
      <svg width={ultimate ? 34 : 26} height="12" viewBox="0 0 34 12" class="arrow">
        <path d="M1 6H26M2 2L7 6L2 10" fill="none" stroke="#fbbf24" stroke-width="2" />
        <path d="M25 1L34 6L25 11Z" fill="#f59e0b" />
      </svg>
    {:else}
      <div class="magic-bolt"></div>
    {/if}
  </div>
</div>

<style>
  .projectile { position: absolute; z-index: 12; pointer-events: none; animation: fly var(--flight) linear var(--delay) both; }
  .arrow { filter: drop-shadow(0 0 4px #ffc832cc); }
  .magic-bolt { width: 12px; height: 12px; border-radius: 50%; background: #c4b5fd; box-shadow: 0 0 8px 3px #a78bfaad, 0 0 16px 6px #8b5cf666; }
  .ultimate .magic-bolt { width: 18px; height: 18px; background: #eee7ff; }
  @keyframes fly {
    0% { transform: translate(0, 0); opacity: 0; }
    5% { opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) { .projectile { display: none; } }
</style>
