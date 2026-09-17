<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import {
    AGES,
    RESOURCES,
    type ResourceId,
    SKILL_ORDER,
    SKILLS,
    type SkillId,
  } from "$lib/gameData";
  import { xpForLevel } from "$lib/gameEngine";
  import type { CivdleGame } from "$lib/gameState.svelte";

  let { game }: { game: CivdleGame } = $props();

  let collapsed = $state(false);
  let resourceAmount = $state(100);
  let skillLevel = $state(10);
  let spAmount = $state(50);
  let goldAmount = $state(100);
</script>

{#if collapsed}
  <button
    class="fixed bottom-3 right-3 z-50 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-400 shadow-lg backdrop-blur hover:bg-yellow-500/20"
    onclick={() => (collapsed = false)}
  >
    Debug
  </button>
{:else}
  <div
    class="fixed bottom-0 right-0 z-50 flex max-h-[60vh] w-80 flex-col rounded-tl-xl border-l border-t border-yellow-500/30 bg-background/95 shadow-2xl backdrop-blur"
  >
    <div
      class="flex items-center justify-between border-b border-yellow-500/20 px-4 py-2"
    >
      <span class="text-sm font-bold text-yellow-400">Debug Panel</span>
      <button
        class="text-xs text-muted-foreground hover:text-foreground"
        onclick={() => (collapsed = true)}
      >
        ✕
      </button>
    </div>

    <div class="flex flex-col gap-3 overflow-y-auto p-3 text-sm">
      <!-- Skill Levels -->
      <section>
        <h4
          class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-500/70"
        >
          Skills
        </h4>
        <div class="mb-2 flex items-center gap-2">
          <label class="text-xs text-muted-foreground">Set to Lv</label>
          <input
            type="number"
            min="1"
            max="99"
            bind:value={skillLevel}
            class="w-14 rounded border border-border bg-muted px-1.5 py-0.5 text-xs tabular-nums"
          />
          <Button
            size="sm"
            variant="outline"
            class="h-6 text-xs"
            onclick={() => {
              for (const id of SKILL_ORDER) {
                game.debugSetSkillXp(id, xpForLevel(skillLevel));
              }
            }}
          >
            All
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-1">
          {#each SKILL_ORDER as id (id)}
            {@const level = game.levels[id]}
            <button
              class="flex items-center justify-between rounded border border-border px-2 py-1 text-xs hover:bg-accent"
              onclick={() =>
                game.debugSetSkillXp(id, xpForLevel(skillLevel))}
            >
              <span class="truncate">{SKILLS[id].name}</span>
              <span class="ml-1 tabular-nums text-muted-foreground">
                {level}
              </span>
            </button>
          {/each}
        </div>
        <div class="mt-1.5 flex gap-1">
          <Button
            size="sm"
            variant="outline"
            class="h-6 flex-1 text-xs"
            onclick={() => game.debugUnlockAllSkills()}
          >
            Unlock All
          </Button>
        </div>
      </section>

      <Separator />

      <!-- Resources -->
      <section>
        <h4
          class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-500/70"
        >
          Resources
        </h4>
        <div class="mb-2 flex items-center gap-2">
          <label class="text-xs text-muted-foreground">Grant</label>
          <input
            type="number"
            min="1"
            bind:value={resourceAmount}
            class="w-16 rounded border border-border bg-muted px-1.5 py-0.5 text-xs tabular-nums"
          />
          <Button
            size="sm"
            variant="outline"
            class="h-6 text-xs"
            onclick={() => {
              for (const id of Object.keys(RESOURCES) as ResourceId[]) {
                game.debugGrantResource(id, resourceAmount);
              }
            }}
          >
            All
          </Button>
        </div>
        <div class="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto">
          {#each Object.entries(RESOURCES) as [id, def] (id)}
            {@const amount = Math.floor(game.state.resources[id as ResourceId] ?? 0)}
            <button
              class="flex items-center justify-between rounded border border-border px-2 py-1 text-xs hover:bg-accent"
              onclick={() =>
                game.debugGrantResource(id as ResourceId, resourceAmount)}
            >
              <span class="truncate">{def.name}</span>
              <span class="ml-1 tabular-nums text-muted-foreground">
                {amount}
              </span>
            </button>
          {/each}
        </div>
      </section>

      <Separator />

      <!-- Skill Points & Age -->
      <section>
        <h4
          class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-500/70"
        >
          Misc
        </h4>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <label class="text-xs text-muted-foreground">SP</label>
            <input
              type="number"
              min="1"
              bind:value={spAmount}
              class="w-14 rounded border border-border bg-muted px-1.5 py-0.5 text-xs tabular-nums"
            />
            <Button
              size="sm"
              variant="outline"
              class="h-6 text-xs"
              onclick={() => game.debugGrantSkillPoints(spAmount)}
            >
              Grant
            </Button>
            <span class="text-xs tabular-nums text-muted-foreground">
              ({game.state.skillPoints})
            </span>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs text-muted-foreground">Age</label>
            <select
              class="rounded border border-border bg-muted px-1.5 py-0.5 text-xs"
              value={game.ageIndex}
              onchange={(e) =>
                game.debugSetAge(
                  Number((e.target as HTMLSelectElement).value),
                )}
            >
              {#each AGES as age, i (age.id)}
                <option value={i}>{age.name}</option>
              {/each}
            </select>
          </div>
        </div>
      </section>

      <Separator />

      <!-- Gacha / Combat -->
      <section>
        <h4
          class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-500/70"
        >
          Gacha
        </h4>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <label class="text-xs text-muted-foreground">Gold</label>
            <input
              type="number"
              min="1"
              bind:value={goldAmount}
              class="w-16 rounded border border-border bg-muted px-1.5 py-0.5 text-xs tabular-nums"
            />
            <Button
              size="sm"
              variant="outline"
              class="h-6 text-xs"
              onclick={() => game.debugGrantGold(goldAmount)}
            >
              Grant
            </Button>
            <span class="text-xs tabular-nums text-muted-foreground">
              ({game.state.gacha.gold})
            </span>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs text-muted-foreground">Enemy Lv</label>
            <select
              class="rounded border border-border bg-muted px-1.5 py-0.5 text-xs"
              value={game.state.gacha.maxEnemyLevel}
              onchange={(e) =>
                game.debugSetEnemyLevel(
                  Number((e.target as HTMLSelectElement).value),
                )}
            >
              {#each Array.from({ length: 10 }, (_, i) => i + 1) as lv}
                <option value={lv}>{lv}</option>
              {/each}
            </select>
          </div>
        </div>
      </section>

      <Separator />

      <Button
        size="sm"
        variant="destructive"
        class="text-xs"
        onclick={() => {
          if (confirm("Reset all save data?")) game.debugResetSave();
        }}
      >
        Reset Save
      </Button>
    </div>
  </div>
{/if}
