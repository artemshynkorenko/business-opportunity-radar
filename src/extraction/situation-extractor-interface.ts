import type { NormalizedContent, Author, Situation } from '../domain/index.js';

export interface SituationExtractorInterface {
  extract(content: NormalizedContent, author: Author, scanRunId: string): Situation;
}
