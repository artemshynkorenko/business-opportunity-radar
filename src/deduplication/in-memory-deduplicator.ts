import type { NormalizedContent } from '../domain/index.js';
import type { DeduplicatorInterface, DeduplicationResult } from './deduplicator-interface.js';

/**
 * Computes a djb2 string hash of the given string.
 * Returns a hex string. No external dependencies.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 ^ char
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    // Keep within 32-bit signed integer range
    hash = hash | 0;
  }
  // Convert to unsigned hex string
  return (hash >>> 0).toString(16);
}

/**
 * Compute a fingerprint for a piece of content.
 * The fingerprint is based on sourceId + normalized text.
 * Same sourceId + same text → same fingerprint.
 * Different sourceId → always different fingerprint (by design).
 */
function computeFingerprint(content: NormalizedContent): string {
  const normalizedText = content.text.trim().toLowerCase().replace(/\s+/g, ' ');
  return djb2Hash(content.sourceId + '::' + normalizedText);
}

/**
 * In-memory deduplicator.
 *
 * Primary identity: contentId (exact match = duplicate regardless of source).
 * Secondary: content fingerprint = hash of (sourceId + normalized text).
 *   - Fingerprint match is a duplicate ONLY when sourceIds also match.
 *   - Cross-source identical text is NOT a duplicate — it may be legitimate
 *     cross-source confirmation, which is a feature of the radar, not a bug.
 *
 * Call reset() to clear state between independent test runs.
 */
export class InMemoryDeduplicator implements DeduplicatorInterface {
  /** Maps contentId → contentId (for exact-id dedup) */
  private readonly seenIds = new Map<string, string>();

  /** Maps fingerprint → { sourceId, contentId } (for same-source text dedup) */
  private readonly seenFingerprints = new Map<string, { sourceId: string; contentId: string }>();

  check(content: NormalizedContent): DeduplicationResult {
    // 1. Exact contentId match
    if (this.seenIds.has(content.contentId)) {
      return {
        isDuplicate: true,
        reason: 'Exact contentId match',
        existingContentId: this.seenIds.get(content.contentId),
      };
    }

    // 2. Same-source fingerprint match
    const fingerprint = computeFingerprint(content);
    const existing = this.seenFingerprints.get(fingerprint);
    if (existing !== undefined && existing.sourceId === content.sourceId) {
      return {
        isDuplicate: true,
        reason: 'Same source, identical content fingerprint',
        existingContentId: existing.contentId,
      };
    }

    return { isDuplicate: false };
  }

  markSeen(content: NormalizedContent): void {
    this.seenIds.set(content.contentId, content.contentId);
    const fingerprint = computeFingerprint(content);
    // Only store the first occurrence of a fingerprint for a given sourceId
    if (!this.seenFingerprints.has(fingerprint)) {
      this.seenFingerprints.set(fingerprint, {
        sourceId: content.sourceId,
        contentId: content.contentId,
      });
    }
  }

  /** Clear all state. Useful between independent test runs. */
  reset(): void {
    this.seenIds.clear();
    this.seenFingerprints.clear();
  }
}
