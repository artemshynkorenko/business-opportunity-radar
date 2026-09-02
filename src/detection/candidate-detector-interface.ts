import type { NormalizedContent } from '../domain/index.js';
import type { CandidateResult } from './candidate-result.js';

export interface CandidateDetectorInterface {
  detect(content: NormalizedContent): CandidateResult;
}
