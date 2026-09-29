// One action's result as a single line for the phone action bar, e.g. "+1 Tools · −1 Wood · −1 Stone".

import { RESOURCES, type ResourceAmount } from "../gameData";

export function gainLine(gains: ResourceAmount[], spent: ResourceAmount[] = []): string {
  return [
    ...gains.map((g) => `+${g.amount} ${RESOURCES[g.resource].name}`),
    ...spent.map((s) => `−${s.amount} ${RESOURCES[s.resource].name}`),
  ].join(" · ");
}
