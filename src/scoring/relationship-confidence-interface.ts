import type { Situation, Author, RelationshipConfidence } from '../domain/index.js';

export interface RelationshipConfidenceCalculatorInterface {
  calculate(situation: Situation, author: Author): RelationshipConfidence;
}
