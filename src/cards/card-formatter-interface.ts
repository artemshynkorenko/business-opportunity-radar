import type { Situation, Match, Author, OpportunityCard } from '../domain/index.js';

export interface OpportunityCardFormatterInterface {
  format(situation: Situation, matches: Match[], author: Author): OpportunityCard;
}
