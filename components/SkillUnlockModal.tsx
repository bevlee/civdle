"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RESOURCES, SKILLS, SkillId } from "@/lib/gameData";

export function SkillUnlockModal({
  skillId,
  onDismiss,
}: {
  skillId: SkillId;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const def = SKILLS[skillId];
  const recipes = def.recipes;
  const prereqs = def.prereqs;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 200);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-6 sm:items-start sm:justify-end sm:p-8">
      <div
        className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border border-border bg-background shadow-2xl transition-all duration-300 ${
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-95 opacity-0"
        }`}
      >
        {/* Header band */}
        <div className="bg-primary/10 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Skill Discovered
          </p>
          <h3 className="mt-1 text-xl font-bold tracking-tight">{def.name}</h3>
          <Badge variant="secondary" className="mt-1.5 text-xs">
            {def.category === "gathering" ? "Gathering" : "Crafting"}
          </Badge>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4">
          {/* Flavor text */}
          <p className="text-sm italic leading-relaxed text-muted-foreground">
            &ldquo;{def.description}&rdquo;
          </p>

          {/* What it unlocks */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Unlocks
            </p>
            <div className="flex flex-col gap-2">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-start gap-3 rounded-lg bg-muted/50 px-3 py-2"
                >
                  <span className="mt-0.5 text-sm font-medium">
                    {recipe.name}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {recipe.inputs.length > 0 && (
                      <>
                        {recipe.inputs
                          .map((i) => RESOURCES[i.resource].name)
                          .join(", ")}
                        {" → "}
                      </>
                    )}
                    {recipe.outputs
                      .map((o) => RESOURCES[o.resource].name)
                      .join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Prerequisites that were met */}
          {prereqs.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Achieved
              </p>
              <p className="text-xs text-muted-foreground">
                {prereqs
                  .map(
                    (p) => `${SKILLS[p.skill].name} Level ${p.level}`
                  )
                  .join(", ")}
              </p>
            </div>
          )}

          <Button variant="secondary" onClick={handleDismiss} className="w-full">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
