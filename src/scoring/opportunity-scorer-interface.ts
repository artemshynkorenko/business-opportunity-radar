import type { Situation, UserCapability, OpportunityScore } from '../domain/index.js';

export interface OpportunityScorerInterface {
  score(situation: Situation, userCapabilities: UserCapability[]): OpportunityScore;
}
