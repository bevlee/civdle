"use client";

import { useState } from "react";
import { AgeDisplay } from "@/components/AgeDisplay";
import { Inventory } from "@/components/Inventory";
import { Shop } from "@/components/Shop";
import { SkillPanel } from "@/components/SkillPanel";
import { TrainingView } from "@/components/TrainingView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SKILL_ORDER, SkillId } from "@/lib/gameData";
import { useGameState } from "@/lib/useGameState";

export default function Home() {
  const {
    state,
    loaded,
    levels,
    ageIndex,
    ageBonus,
    progress,
    message,
    dismissMessage,
    startTraining,
    stopTraining,
    selectRecipe,
    buyUpgrade,
    toggleGlobalUpgrade,
  } = useGameState();

  const [clickedSkill, setClickedSkill] = useState<SkillId | null>(null);
  const selectedSkill =
    clickedSkill && state.skills[clickedSkill].unlocked
      ? clickedSkill
      : (SKILL_ORDER.find((id) => state.skills[id].unlocked) ?? null);

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading save...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AgeDisplay ageIndex={ageIndex} ageBonus={ageBonus} skillPoints={state.skillPoints} />

      {message && (
        <div className="flex items-center justify-between bg-accent px-6 py-2 text-sm">
          <span>{message}</span>
          <button onClick={dismissMessage} className="text-muted-foreground hover:text-foreground">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <SkillPanel state={state} levels={levels} selectedSkill={selectedSkill} onSelect={setClickedSkill} />

        <main className="flex-1 overflow-y-auto">
          {selectedSkill ? (
            <TrainingView
              skillId={selectedSkill}
              state={state}
              level={levels[selectedSkill]}
              ageIndex={ageIndex}
              progress={progress}
              onStart={() => startTraining(selectedSkill)}
              onStop={stopTraining}
              onSelectRecipe={(recipeId) => selectRecipe(selectedSkill, recipeId)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a skill to begin.
            </div>
          )}
        </main>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-border">
          <Tabs defaultValue="inventory" className="gap-0">
            <TabsList className="w-full rounded-none">
              <TabsTrigger value="inventory" className="flex-1">
                Inventory
              </TabsTrigger>
              <TabsTrigger value="shop" className="flex-1">
                Shop
              </TabsTrigger>
            </TabsList>
            <TabsContent value="inventory">
              <Inventory resources={state.resources} />
            </TabsContent>
            <TabsContent value="shop">
              <Shop state={state} onBuy={buyUpgrade} onToggleGlobal={toggleGlobalUpgrade} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
