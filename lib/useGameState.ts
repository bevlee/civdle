"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONSUMABLES, ResourceId, SKILLS, SkillId } from "./gameData";
import {
  ApplyActionOutcome,
  GameState,
  aggregateConsumableEffects,
  applyAction,
  computeActionResult,
  createInitialState,
  getActiveConsumableDefs,
  getAgeBonus,
  getCurrentAgeIndex,
  getSkillLevels,
  processOfflineProgress,
} from "./gameEngine";

const SAVE_KEY = "civdle-save";
const SAVE_INTERVAL_MS = 5000;
const PROGRESS_INTERVAL_MS = 100;

function loadFromStorage(): GameState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !parsed.skills) return createInitialState();
    if (!parsed.globalUpgrades) parsed.globalUpgrades = [];
    if (!parsed.activeConsumables) parsed.activeConsumables = [];
    return parsed;
  } catch {
    return createInitialState();
  }
}

function saveToStorage(state: GameState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, lastSavedAt: Date.now() }));
  } catch {
    // localStorage unavailable (private mode, quota) — silently skip saving.
  }
}

export function useGameState() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingUnlocks, setPendingUnlocks] = useState<SkillId[]>([]);
  const [progress, setProgress] = useState(0);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionStartRef = useRef<number>(0);
  const actionDurationRef = useRef<number>(0);

  // One-time load + offline catch-up: hydrates React state from an external
  // system (localStorage), which can only happen after mount.
  useEffect(() => {
    const loadedState = loadFromStorage();
    const elapsedSeconds = (Date.now() - loadedState.lastSavedAt) / 1000;
    const offline = processOfflineProgress(loadedState, elapsedSeconds);
    const finalState: GameState = { ...offline.state, lastSavedAt: Date.now() };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    setState(finalState);
    setLoaded(true);
    if (offline.actionsProcessed > 0) {
      setMessage(
        `Welcome back! ${offline.actionsProcessed} action${offline.actionsProcessed === 1 ? "" : "s"} completed while away.`
      );
    }
  }, []);

  // Periodic + unload save. Gated on `loaded` so this can never persist the
  // default pre-load state over a real save (notably during React Strict
  // Mode's dev-only mount→cleanup→mount cycle, before the load effect's
  // offline-catch-up state has committed).
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => saveToStorage(stateRef.current), SAVE_INTERVAL_MS);
    const handleUnload = () => saveToStorage(stateRef.current);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      saveToStorage(stateRef.current);
    };
  }, [loaded]);

  const handleOutcome = useCallback((outcome: ApplyActionOutcome) => {
    if (outcome.newlyUnlockedSkills.length > 0) {
      setPendingUnlocks((prev) => {
        const existing = new Set(prev);
        const fresh = outcome.newlyUnlockedSkills.filter((id) => !existing.has(id));
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
    }
    if (outcome.outOfMaterials) {
      setMessage("Out of materials — training stopped.");
    }
  }, []);

  // Recursive action scheduling for the active skill.
  useEffect(() => {
    if (!loaded) return;
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);

    const skillId = state.activeSkill;
    if (!skillId) return;

    const levels = getSkillLevels(state);
    const level = levels[skillId];
    const ageIndex = getCurrentAgeIndex(levels);
    const skillState = state.skills[skillId];
    const skillCategory = SKILLS[skillId].category;
    const activeDefs = getActiveConsumableDefs(state.activeConsumables, state.resources, skillCategory);
    const ce = aggregateConsumableEffects(activeDefs);
    const result = computeActionResult(skillId, level, skillState.upgrades, ageIndex, skillState.selectedRecipeId, state.globalUpgrades, ce);

    if (!result) {
      // Defensive: a persisted save could reference a recipe that's no longer valid.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clamps invalid persisted state
      setState((prev) => (prev.activeSkill === skillId ? { ...prev, activeSkill: null } : prev));
      return;
    }

    actionStartRef.current = Date.now();
    actionDurationRef.current = result.time * 1000;

    actionTimeoutRef.current = setTimeout(() => {
      setState((prev) => {
        if (prev.activeSkill !== skillId) return prev;
        const outcome = applyAction(prev, skillId);
        handleOutcome(outcome);
        if (outcome.outOfMaterials) {
          return { ...outcome.state, activeSkill: null };
        }
        return outcome.state;
      });
    }, result.time * 1000);

    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
  }, [state, loaded, handleOutcome]);

  // Smooth progress bar, decoupled from the heavier action-scheduling effect.
  // Only subscribes to the ticking timer while a skill is active; when idle,
  // `progress` below simply falls back to 0 without needing an effect to set it.
  useEffect(() => {
    if (!state.activeSkill) return;
    progressIntervalRef.current = setInterval(() => {
      const duration = actionDurationRef.current || 1;
      const elapsed = Date.now() - actionStartRef.current;
      setProgress(Math.min(1, Math.max(0, elapsed / duration)));
    }, PROGRESS_INTERVAL_MS);
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [state.activeSkill]);

  const displayProgress = state.activeSkill ? progress : 0;

  const startTraining = useCallback((skillId: SkillId) => {
    setState((prev) => ({ ...prev, activeSkill: skillId }));
  }, []);

  const stopTraining = useCallback(() => {
    setState((prev) => ({ ...prev, activeSkill: null }));
  }, []);

  const selectRecipe = useCallback((skillId: SkillId, recipeId: string) => {
    setState((prev) => ({
      ...prev,
      skills: { ...prev.skills, [skillId]: { ...prev.skills[skillId], selectedRecipeId: recipeId } },
    }));
  }, []);

  const buyUpgrade = useCallback((skillId: SkillId, upgradeId: string) => {
    setState((prev) => {
      const def = SKILLS[skillId];
      const upgrade = def.upgrades.find((u) => u.id === upgradeId);
      const skillState = prev.skills[skillId];
      if (!upgrade || skillState.upgrades.includes(upgradeId) || prev.skillPoints < upgrade.cost) return prev;
      return {
        ...prev,
        skillPoints: prev.skillPoints - upgrade.cost,
        skills: { ...prev.skills, [skillId]: { ...skillState, upgrades: [...skillState.upgrades, upgradeId] } },
      };
    });
  }, []);

  const toggleConsumable = useCallback((resourceId: ResourceId) => {
    setState((prev) => {
      const isActive = prev.activeConsumables.includes(resourceId);
      if (isActive) {
        return { ...prev, activeConsumables: prev.activeConsumables.filter((id) => id !== resourceId) };
      }
      const def = CONSUMABLES.find((c) => c.resource === resourceId);
      if (!def || (prev.resources[resourceId] ?? 0) < 1) return prev;
      const withoutGroup = prev.activeConsumables.filter((id) => {
        const other = CONSUMABLES.find((c) => c.resource === id);
        return !other || other.group !== def.group;
      });
      return { ...prev, activeConsumables: [...withoutGroup, resourceId] };
    });
  }, []);

  const buyGlobalUpgrade = useCallback((upgradeId: string) => {
    setState((prev) => {
      if (prev.globalUpgrades.includes(upgradeId)) return prev;
      return { ...prev, globalUpgrades: [...prev.globalUpgrades, upgradeId] };
    });
  }, []);

  const dismissMessage = useCallback(() => setMessage(null), []);

  const dismissUnlock = useCallback(() => {
    setPendingUnlocks((prev) => prev.slice(1));
  }, []);

  const levels = getSkillLevels(state);
  const ageIndex = getCurrentAgeIndex(levels);
  const ageBonus = getAgeBonus(ageIndex);

  return {
    state,
    loaded,
    levels,
    ageIndex,
    ageBonus,
    progress: displayProgress,
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
  };
}
