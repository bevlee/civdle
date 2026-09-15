"use client";

import { useState } from "react";
import { AgeDisplay } from "@/components/AgeDisplay";
import { CombatView } from "@/components/CombatView";
import { Inventory } from "@/components/Inventory";
import { Shop } from "@/components/Shop";
import { SkillPanel } from "@/components/SkillPanel";
import { SkillUnlockModal } from "@/components/SkillUnlockModal";
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
    pendingUnlocks,
    dismissUnlock,
    startTraining,
    stopTraining,
    selectRecipe,
    buyUpgrade,
    buyGlobalUpgrade,
    toggleConsumable,
    placeUnitOnGrid,
    removeUnitFromGrid,
    sendWave,
  } = useGameState();

  const [clickedSkill, setClickedSkill] = useState<SkillId | null>(null);
  const [activeTab, setActiveTab] = useState<"skills" | "combat">("skills");
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

  const sidebar = (
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
          <Shop state={state} onBuy={buyUpgrade} onBuyGlobal={buyGlobalUpgrade} />
        </TabsContent>
      </Tabs>
    </aside>
  );

  return (
    <div className="flex flex-1 flex-col">
      <AgeDisplay ageIndex={ageIndex} ageBonus={ageBonus} skillPoints={state.skillPoints} />

      <div className="flex border-b border-border px-4">
        <button
          onClick={() => setActiveTab("skills")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "skills" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Skills
        </button>
        {state.combat.unlocked && (
          <button
            onClick={() => setActiveTab("combat")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "combat" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Combat
          </button>
        )}
      </div>

      {message && (
        <div className="flex items-center justify-between bg-accent px-6 py-2 text-sm">
          <span>{message}</span>
          <button onClick={dismissMessage} className="text-muted-foreground hover:text-foreground">
            Dismiss
          </button>
        </div>
      )}

      {activeTab === "skills" && (
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
                onToggleConsumable={toggleConsumable}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a skill to begin.
              </div>
            )}
          </main>

          {sidebar}
        </div>
      )}

      {activeTab === "combat" && (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <CombatView
              combat={state.combat}
              resources={state.resources}
              ageIndex={ageIndex}
              onPlace={placeUnitOnGrid}
              onRemove={removeUnitFromGrid}
              onSendWave={sendWave}
            />
          </main>

          {sidebar}
        </div>
      )}

      {pendingUnlocks.length > 0 && (
        <SkillUnlockModal
          key={pendingUnlocks[0]}
          skillId={pendingUnlocks[0]}
          onDismiss={dismissUnlock}
        />
      )}
    </div>
  );
}
