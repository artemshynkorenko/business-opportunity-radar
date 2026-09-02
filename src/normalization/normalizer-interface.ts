import type { NormalizedContent } from '../domain/index.js';

/**
 * Source-independent normalizer interface.
 * Each source adapter implements this to convert raw source data
 * into a NormalizedContent object — no source-specific fields leak through.
 */
export interface NormalizerInterface {
  normalize(raw: unknown, sourceId: string): NormalizedContent;
}
