export type PartySlots = (string | null)[];

/**
 * Returns a new party array with `cardId` placed in `slotIndex`.
 *
 * - A card already in the party vacates its old slot.
 * - If the target slot is occupied and the moving card came from another
 *   slot, the two cards swap so nothing is silently dropped.
 * - If the moving card came from the inventory, the occupant is displaced
 *   back to the inventory.
 */
export function movePartyCard(party: PartySlots, cardId: string, slotIndex: number): PartySlots {
  if (slotIndex < 0 || slotIndex >= party.length) return party;
  const fromIndex = party.indexOf(cardId);
  if (fromIndex === slotIndex) return party;
  const next = [...party];
  const displaced = next[slotIndex];
  next[slotIndex] = cardId;
  if (fromIndex >= 0) next[fromIndex] = displaced;
  return next;
}
