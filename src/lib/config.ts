// Update this at the start of each new season.
export const CURRENT_SEASON = "2026/27";

// Sibling discount: applied to a child's fee when the same parent already
// has another player actively registered for the current season. Applies
// to every child after the first (not just the second), each against
// their own chosen fee plan.
export const SIBLING_DISCOUNT_RATE = 0.1;

export function applySiblingDiscount(pence: number, eligible: boolean): number {
  return eligible ? Math.round(pence * (1 - SIBLING_DISCOUNT_RATE)) : pence;
}
