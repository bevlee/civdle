<script lang="ts">
  import "../app.css";
  import * as Tooltip from "$lib/components/ui/tooltip";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <title>Civdle</title>
</svelte:head>

<Tooltip.Provider>
  {@render children()}
</Tooltip.Provider>
