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

// Disciplinary fines: flat one-off amounts, no sibling discount or fee plan
// involved.
export const FINE_AMOUNTS_PENCE = {
  yellow: 1500,
  red: 2500,
} as const;

export type FineCardType = keyof typeof FINE_AMOUNTS_PENCE;

// A fine the parent still needs to pay (or retry) vs. one that's paid and
// in flight. Flags show against the player for both, and clear only once
// the fine is confirmed paid (or withdrawn by an admin).
export const FINE_UNPAID_STATUSES = ["pending", "failed", "cancelled"];
export const FINE_FLAGGED_STATUSES = [...FINE_UNPAID_STATUSES, "processing"];
