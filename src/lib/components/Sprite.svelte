<script lang="ts">
  import { UNIT_SPRITES, type UnitId } from "$lib/combatData";

  export type Pose = "idle" | "attack" | "hit" | "death";

  /** Row index of each pose within a 4×4 sheet (4 frames per row). */
  const POSE_ROW: Record<Pose, number> = { idle: 0, attack: 1, hit: 2, death: 3 };
  const POSE_MS: Record<Pose, number> = { idle: 900, attack: 450, hit: 450, death: 550 };

  let {
    unitId,
    pose = "idle",
    animate = false,
    class: className = "",
  }: {
    unitId: UnitId;
    pose?: Pose;
    /** Loop the idle frames. Action poses always animate; death plays once and holds. */
    animate?: boolean;
    class?: string;
  } = $props();
</script>

<!-- One 4:5 cell of the unit's sprite sheet. Sheets are 512×640: 4 frame
     columns × 4 pose rows, so 400% sizing addresses cells at thirds. -->
{#key pose}
  <div
    class="sprite {className}"
    class:animated={animate || pose !== "idle"}
    class:play-once={pose !== "idle"}
    style="background-image:url('{UNIT_SPRITES[unitId]}'); --row:{POSE_ROW[pose]}; --dur:{POSE_MS[pose]}ms"
    aria-hidden="true"
  ></div>
{/key}

<style>
  .sprite {
    aspect-ratio: 4 / 5;
    background-repeat: no-repeat;
    background-size: 400% 400%;
    background-position-x: 0%;
    background-position-y: calc(var(--row) / 3 * 100%);
    image-rendering: auto;
  }
  .animated {
    animation: sprite-frames var(--dur, 900ms) steps(4, jump-none) infinite;
  }
  .play-once {
    animation-iteration-count: 1;
    animation-fill-mode: forwards;
  }
  @keyframes sprite-frames {
    from {
      background-position-x: 0%;
    }
    to {
      background-position-x: 100%;
    }
  }
</style>
