import type { Situation, UserProfile, Match } from '../domain/index.js';

export interface UserMatcherInterface {
  /**
   * Match a situation against the active user profile's capabilities.
   * Interests are NOT capabilities and do not produce capability matches.
   */
  match(situation: Situation, profile: UserProfile): Match[];
}
