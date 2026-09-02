/**
 * Canonical opportunity score weights.
 * These must sum to exactly 100.
 */
export const SCORE_WEIGHTS = {
  needPain: 15,
  userFit: 20,
  existingBusinessTraction: 15,
  economicPotential: 10,
  demandCapacityMismatch: 10,
  timing: 10,
  actionability: 8,
  geography: 5,
  evidenceCredibility: 4,
  crossSourceConfirmation: 3,
} as const;

export type ScoreFactorKey = keyof typeof SCORE_WEIGHTS;

// Verify at compile time that the weights sum to 100
const _total: 100 = (Object.values(SCORE_WEIGHTS) as number[]).reduce(
  (a, b) => a + b,
  0
) as 100;
void _total;
