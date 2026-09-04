import type { Situation, UserProfile, OpportunityScore } from '../domain/index.js';

export interface OpportunityScorerInterface {
  /**
   * Score a situation for the active user profile. User fit and geographic
   * relevance are derived from the profile; the generic scoring mechanics and
   * weights are user-independent.
   */
  score(situation: Situation, profile: UserProfile): OpportunityScore;
}
