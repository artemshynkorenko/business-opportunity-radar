import type { NormalizedContent } from '../../domain/index.js';
import type { NormalizerInterface } from '../../normalization/normalizer-interface.js';

/**
 * Pass-through normalizer for already-normalized content.
 *
 * The Threads source adapter emits `NormalizedContent` directly, whereas the
 * core `Pipeline` expects a `NormalizerInterface` it invokes per raw item.
 * This adapter-boundary normalizer bridges the two by asserting each item is
 * already a `NormalizedContent` and returning it unchanged. It performs NO
 * source-specific mapping — that work lives entirely in `ThreadsSearchAdapter`.
 *
 * This exists so the runner and its tests share one implementation instead of
 * redefining the same shim in multiple places.
 */
export class PassThroughNormalizer implements NormalizerInterface {
  normalize(raw: unknown, _sourceId: string): NormalizedContent {
    if (
      raw === null ||
      typeof raw !== 'object' ||
      typeof (raw as NormalizedContent).contentId !== 'string' ||
      !((raw as NormalizedContent).timestamp instanceof Date)
    ) {
      throw new Error('PassThroughNormalizer: expected an already-normalized NormalizedContent object');
    }
    return raw as NormalizedContent;
  }
}
