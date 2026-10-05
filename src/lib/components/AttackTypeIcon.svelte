<script lang="ts">
  import Sword from "@lucide/svelte/icons/sword";
  import BowArrow from "@lucide/svelte/icons/bow-arrow";
  import WandSparkles from "@lucide/svelte/icons/wand-sparkles";
  import type { AttackType } from "$lib/combatData";
  import { cn } from "$lib/utils";

  let { type, class: className }: { type: AttackType; class?: string } = $props();

  // SVG rather than emoji so all three draw at the same size on every platform.
  const ICONS = { melee: Sword, ranged: BowArrow, magic: WandSparkles };
  const COLORS = { melee: "text-red-400", ranged: "text-green-400", magic: "text-violet-400" };

  let Icon = $derived(ICONS[type]);
</script>

<!-- Sized in em so it matches the text around it; the type name always sits next to it or in a title. -->
<Icon
  aria-hidden="true"
  strokeWidth={2.25}
  class={cn("inline-block size-[1.1em] shrink-0 align-[-0.2em]", COLORS[type], className)}
/>
