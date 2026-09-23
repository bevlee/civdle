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
  import { MAX_ENEMY_LEVEL, MAX_STARS, UNITS, UNIT_IDS, type UnitId } from "$lib/combatData";

  let { game }: { game: CivdleGame } = $props();

  let collapsed = $state(false);
  let resourceAmount = $state(100);
  let skillLevel = $state(10);
  let spAmount = $state(50);
  let goldAmount = $state(100);
  let gloryAmount = $state(100);
  let depthLevel = $state(1);
  let grantUnit = $state<UnitId>("devil");
  let grantStars = $state(5);
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
          <label for="debug-skill-level" class="text-xs text-muted-foreground">Set to Lv</label>
          <input
            id="debug-skill-level"
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
        <Button
          size="sm"
          variant={game.hyperdrive ? "default" : "outline"}
          class="mt-1.5 h-6 w-full text-xs"
          title="Actions are 100x faster"
          onclick={() => game.debugToggleHyperdrive()}
        >
          Hyperdrive: {game.hyperdrive ? "ON" : "OFF"}
        </Button>
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
          <label for="debug-resource-amount" class="text-xs text-muted-foreground">Grant</label>
          <input
            id="debug-resource-amount"
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
            <label for="debug-sp-amount" class="text-xs text-muted-foreground">SP</label>
            <input
              id="debug-sp-amount"
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
            <label for="debug-age" class="text-xs text-muted-foreground">Age</label>
            <select
              id="debug-age"
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
            <Button
              size="sm"
              variant="outline"
              class="h-6 text-xs"
              disabled={game.ageIndex >= AGES.length - 1}
              title="Advance one age with its rewards (4★ heroes, unlocks, age-up effect), skipping requirements"
              onclick={() => game.debugAdvanceAge()}
            >
              Age up +rewards
            </Button>
          </div>
          <p class="text-[10px] text-muted-foreground">
            Select jumps silently; "Age up" grants rewards. Combat {game.combatUnlocked ? "unlocked" : "locked"} ·
            summons up to {game.maxSummonStars}★
          </p>
        </div>
      </section>

      <Separator />

      <!-- Gacha / Combat -->
      <section>
        <h4
          class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-500/70"
        >
          Army
        </h4>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <label for="debug-gold-amount" class="text-xs text-muted-foreground">Spoils</label>
            <input
              id="debug-gold-amount"
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
            <label for="debug-glory-amount" class="text-xs text-muted-foreground">Glory</label>
            <input
              id="debug-glory-amount"
              type="number"
              min="1"
              bind:value={gloryAmount}
              class="w-16 rounded border border-border bg-muted px-1.5 py-0.5 text-xs tabular-nums"
            />
            <Button
              size="sm"
              variant="outline"
              class="h-6 text-xs"
              onclick={() => game.debugGrantResource("glory", gloryAmount)}
            >
              Grant
            </Button>
            <span class="text-xs tabular-nums text-muted-foreground">({game.glory})</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            class="h-6 text-xs"
            disabled={game.hasCelestialAltar}
            title="Unlocks the Glory-priced 5★ summons"
            onclick={() => game.debugGrantSettlementUpgrade("celestialAltar")}
          >
            {game.hasCelestialAltar ? "Celestial Altar built" : "Build Celestial Altar"}
          </Button>

          <div class="flex items-center gap-2">
            <label for="debug-story-level" class="text-xs text-muted-foreground">Story Lv</label>
            <select
              id="debug-story-level"
              class="rounded border border-border bg-muted px-1.5 py-0.5 text-xs"
              value={Math.min(MAX_ENEMY_LEVEL, game.state.gacha.storyLevel)}
              onchange={(e) =>
                game.debugSetStoryLevel(
                  Number((e.target as HTMLSelectElement).value),
                )}
            >
              {#each Array.from({ length: MAX_ENEMY_LEVEL }, (_, i) => i + 1) as lv (lv)}
                <option value={lv}>{lv}{lv % 5 === 0 ? " (boss)" : ""}</option>
              {/each}
            </select>
            <Button
              size="sm"
              variant="outline"
              class="h-6 text-xs"
              onclick={() => game.debugRerollEncounter()}
            >
              Reroll enemy
            </Button>
          </div>

          <div class="flex items-center gap-2">
            <label for="debug-depth-level" class="text-xs text-muted-foreground">Depth</label>
            <input
              id="debug-depth-level"
              type="number"
              min="1"
              bind:value={depthLevel}
              class="w-16 rounded border border-border bg-muted px-1.5 py-0.5 text-xs tabular-nums"
            />
            <Button
              size="sm"
              variant="outline"
              class="h-6 text-xs"
              onclick={() => game.debugSetDepthsLevel(depthLevel)}
            >
              Set
            </Button>
            <span class="text-xs tabular-nums text-muted-foreground">
              (now {game.state.gacha.depths.level})
            </span>
          </div>

          <div class="flex items-center gap-2">
            <label for="debug-grant-unit" class="text-xs text-muted-foreground">Card</label>
            <select
              id="debug-grant-unit"
              class="min-w-0 flex-1 rounded border border-border bg-muted px-1.5 py-0.5 text-xs"
              bind:value={grantUnit}
            >
              {#each UNIT_IDS as id (id)}
                <option value={id}>{UNITS[id].name} ({UNITS[id].baseStars}★)</option>
              {/each}
            </select>
            <input
              type="number"
              min="1"
              max={MAX_STARS}
              bind:value={grantStars}
              class="w-12 rounded border border-border bg-muted px-1.5 py-0.5 text-xs tabular-nums"
              title="Stars"
            />
            <Button
              size="sm"
              variant="outline"
              class="h-6 text-xs"
              onclick={() => game.debugGrantCard(grantUnit, grantStars)}
            >
              Grant
            </Button>
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
