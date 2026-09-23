<script lang="ts">
	import { Tooltip as TooltipPrimitive } from "bits-ui";

	let {
		delayDuration = 100,
		skipDelayDuration = 300,
		disableHoverableContent = true,
		...restProps
	}: TooltipPrimitive.ProviderProps = $props();
</script>

<TooltipPrimitive.Provider {delayDuration} {skipDelayDuration} {disableHoverableContent} {...restProps} />
