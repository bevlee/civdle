<script lang="ts">
  import { onMount } from "svelte";
  import { COMBAT_SLIDES, COMBAT_TOPICS } from "$lib/combatGuide";
  import CombatGuideVisual from "./CombatGuideVisual.svelte";

  let { onClose }: { onClose: () => void } = $props();
  let dialog: HTMLDialogElement;
  let step = $state(0);
  let current = $derived(COMBAT_SLIDES[step]);

  onMount(() => {
    dialog.showModal();
    return () => dialog.close();
  });

  function goTo(index: number) {
    step = Math.max(0, Math.min(COMBAT_SLIDES.length - 1, index));
    dialog.scrollTop = 0;
  }

  function move(delta: number) {
    goTo(step + delta);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby="combat-guide-title" onclose={onClose}
  onkeydown={(event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  }}>
  <header>
    <div><p class="eyebrow">Field manual</p><strong>Combat guide</strong></div>
    <button class="close" aria-label="Close combat guide" onclick={() => dialog.close()}>✕</button>
  </header>
  <nav aria-label="Tutorial topics">
    {#each COMBAT_TOPICS as slide, index (slide.id)}
      <button class:active={current.id === slide.id} aria-current={current.id === slide.id ? "step" : undefined}
        onclick={() => goTo(COMBAT_SLIDES.findIndex(page => page.id === slide.id))}>{index + 1}. {slide.label}</button>
    {/each}
  </nav>
  <section aria-live="polite" aria-atomic="true">
    <p class="eyebrow">{current.label} · Page {current.page + 1} of {current.pageCount}</p>
    <h2 id="combat-guide-title">{current.title}</h2>
    <p class="intro">{current.intro}</p>

    {#key `${current.id}-${current.page}`}
      <CombatGuideVisual topic={current.id} page={current.page} />
    {/key}

    <div class="points">
      {#each current.points as point}
        <article><h3>{point.title}</h3><p>{point.body}</p></article>
      {/each}
    </div>
    <aside>{current.tip}</aside>
  </section>
  <footer>
    <button disabled={step === 0} onclick={() => move(-1)}>← Back</button>
    <span>{step + 1} of {COMBAT_SLIDES.length}</span>
    <button class="primary" onclick={() => step === COMBAT_SLIDES.length - 1 ? dialog.close() : move(1)}>{step === COMBAT_SLIDES.length - 1 ? "Ready to fight" : "Next →"}</button>
  </footer>
</dialog>

<style>
  dialog { margin: auto; padding: 0; width: min(760px, calc(100vw - 24px)); max-height: min(880px, calc(100dvh - 24px)); overflow-y: auto; border: 1px solid var(--border); border-radius: 16px; background: var(--popover); color: var(--popover-foreground); box-shadow: 0 24px 80px #0009; }
  dialog::backdrop { background: #000b; backdrop-filter: blur(4px); }
  header, footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 24px; }
  header { border-bottom: 1px solid var(--border); }
  .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: .16em; color: #d9b66d; margin-bottom: 4px; }
  button { cursor: pointer; border: 1px solid var(--border); border-radius: 7px; padding: 8px 12px; font-size: 12px; }
  button:hover { background: var(--muted); }
  button:focus-visible { outline: 2px solid #d9b66d; outline-offset: 3px; }
  button:disabled { opacity: .35; cursor: default; }
  .close { border: none; }
  nav { display: flex; flex-wrap: wrap; gap: 6px; padding: 16px 24px 0; }
  nav button { color: var(--muted-foreground); padding: 6px 9px; }
  nav button.active { color: #edcf93; border-color: #d9b66d88; background: #d9b66d15; }
  section { padding: 24px; }
  h2 { font-size: clamp(22px, 4vw, 30px); font-weight: 750; line-height: 1.2; margin-bottom: 12px; }
  .intro { font-size: 14px; line-height: 1.6; color: var(--muted-foreground); }
  .points { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
  article { border: 1px solid var(--border); border-radius: 9px; padding: 14px; }
  h3 { font-size: 13px; font-weight: 650; margin-bottom: 6px; }
  article p, aside { font-size: 12px; line-height: 1.65; color: var(--muted-foreground); }
  aside { margin-top: 16px; padding: 12px 14px; border-left: 2px solid #d9b66d; background: #d9b66d08; }
  footer { position: sticky; bottom: 0; background: var(--popover); border-top: 1px solid var(--border); }
  footer span { color: var(--muted-foreground); font-size: 11px; }
  .primary { background: #d9b66d; color: #211c12; font-weight: 650; }
  .primary:hover { background: #edcf93; }
  @media (max-width: 520px) { .points { grid-template-columns: 1fr; } header, footer, section { padding: 16px; } nav { padding: 12px 16px 0; } }
</style>
