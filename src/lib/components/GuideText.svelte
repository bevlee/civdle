<script lang="ts">
  import { GLOSSARY, splitGuideText, type GuideSegment } from "$lib/guideGlossary";
  import Hint from "./Hint.svelte";

  // Guide copy with glossary keywords as hover cards. Pass `segments` when the
  // page shares one seen-set across blocks; otherwise `text` is split on its own.
  let { text = "", segments }: { text?: string; segments?: GuideSegment[] } = $props();
  let parts = $derived(segments ?? splitGuideText(text));
</script>

{#each parts as part}{#if part.key}<Hint title={GLOSSARY[part.key].title} text={GLOSSARY[part.key].body} portalTo="#combat-guide" class="guide-keyword" contentClass="max-w-80 text-sm">{part.text}</Hint>{:else}{part.text}{/if}{/each}

<style>
  :global(.guide-keyword) {
    display: inline;
    cursor: help;
    color: #edcf93;
    text-decoration: underline dotted #d9b66d;
    text-underline-offset: 3px;
  }
</style>
