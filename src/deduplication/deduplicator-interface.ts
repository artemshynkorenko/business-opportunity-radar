import type { NormalizedContent } from '../domain/index.js';

export interface DeduplicationResult {
  isDuplicate: boolean;
  reason?: string;
  existingContentId?: string;
}

export interface DeduplicatorInterface {
  /** Check if content has been seen before. */
  check(content: NormalizedContent): DeduplicationResult;
  /** Mark content as seen after candidate detection passes. */
  markSeen(content: NormalizedContent): void;
}
