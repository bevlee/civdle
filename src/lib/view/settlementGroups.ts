// Sorts settlement buildings into ready / gathering / locked / built for the phone Settlement screen.

import type { ResourceId, SkillId } from "../gameData";
import { settlementPurchaseBlock, type GameState } from "../gameEngine";
import { SETTLEMENT_UPGRADES, SETTLEMENT_UPGRADE_ORDER, type SettlementUpgradeId } from "../settlementData";

export interface BuildingCost {
  resource: ResourceId;
  have: number;
  need: number;
  short: boolean;
}

export interface BuildingView {
  id: SettlementUpgradeId;
  built: boolean;
  ready: boolean;
  lockedReason?: string;
  met: number;
  cost: BuildingCost[];
}

export interface SettlementGroups {
  ready: BuildingView[];
  gathering: BuildingView[];
  locked: BuildingView[];
  built: BuildingView[];
}

function buildingView(state: GameState, levels: Record<SkillId, number>, id: SettlementUpgradeId): BuildingView {
  const block = settlementPurchaseBlock(state, levels, id);
  const cost = SETTLEMENT_UPGRADES[id].cost.map(({ resource, amount }) => {
    const have = Math.floor(state.resources[resource] ?? 0);
    return { resource, have, need: amount, short: have < amount };
  });
  const met = cost.length === 0 ? 1 : cost.reduce((sum, c) => sum + Math.min(c.have / c.need, 1), 0) / cost.length;
  const view: BuildingView = { id, built: block?.kind === "built", ready: block === null, met, cost };
  if (block?.kind === "locked") view.lockedReason = block.reason;
  return view;
}

export function settlementGroups(state: GameState, levels: Record<SkillId, number>): SettlementGroups {
  const groups: SettlementGroups = { ready: [], gathering: [], locked: [], built: [] };
  for (const id of SETTLEMENT_UPGRADE_ORDER) {
    const view = buildingView(state, levels, id);
    if (view.built) groups.built.push(view);
    else if (view.lockedReason) groups.locked.push(view);
    else if (view.ready) groups.ready.push(view);
    else groups.gathering.push(view);
  }
  groups.gathering.sort((a, b) => b.met - a.met);
  return groups;
}
