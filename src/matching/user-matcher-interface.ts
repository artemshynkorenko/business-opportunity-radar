import type { Situation, UserCapability, Match } from '../domain/index.js';

export interface UserMatcherInterface {
  match(situation: Situation, capabilities: UserCapability[]): Match[];
}
