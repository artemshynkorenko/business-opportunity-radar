import type { Author, UserCapability } from '../../domain/index.js';
import { Pipeline } from '../../pipeline/pipeline.js';
import { InMemoryDeduplicator } from '../../deduplication/in-memory-deduplicator.js';
import { RuleBasedCandidateDetector } from '../../detection/rule-based-detector.js';
import { DeterministicSituationExtractor } from '../../extraction/deterministic-extractor.js';
import { WeightedOpportunityScorer } from '../../scoring/weighted-opportunity-scorer.js';
import { RelationshipConfidenceCalculator } from '../../scoring/relationship-confidence-calculator.js';
import { CapabilityBasedMatcher } from '../../matching/capability-based-matcher.js';
import { DefaultOpportunityCardFormatter } from '../../cards/default-card-formatter.js';
import { USER_CAPABILITIES } from '../../matching/user-capabilities.js';
import type { SituationRepository } from '../../persistence/repositories.js';
import { PassThroughNormalizer } from './passthrough-normalizer.js';

/**
 * Options for assembling a default local Pipeline for Threads-sourced content.
 */
export interface BuildThreadsPipelineOptions {
  /**
   * Resolves an authorId (the Threads username, per the adapter's mapping) into
   * an Author. Required because the core Pipeline resolves authors before
   * extraction. For Threads, the keyword_search response does not include rich
   * author profiles, so a minimal resolver is appropriate.
   */
  authorResolver: (authorId: string) => Promise<Author>;
  /** Capabilities to match against. Defaults to the canonical USER_CAPABILITIES. */
  userCapabilities?: UserCapability[];
  /** Optional Situation repository for idempotent persistence (in-memory only). */
  situationRepository?: SituationRepository;
}

/**
 * Assemble a core Pipeline wired with the existing default components, using a
 * PassThroughNormalizer because Threads content arrives already normalized.
 *
 * This reuses the exact concrete implementations already used elsewhere; it
 * introduces no new core logic. It exists only so the runner, smoke command,
 * and tests can build an equivalent local pipeline without duplicating wiring.
 */
export function buildDefaultThreadsPipeline(options: BuildThreadsPipelineOptions): Pipeline {
  return new Pipeline(
    new PassThroughNormalizer(),
    new InMemoryDeduplicator(),
    new RuleBasedCandidateDetector(),
    new DeterministicSituationExtractor(),
    new WeightedOpportunityScorer(),
    new RelationshipConfidenceCalculator(),
    new CapabilityBasedMatcher(),
    new DefaultOpportunityCardFormatter(),
    options.authorResolver,
    options.userCapabilities ?? USER_CAPABILITIES,
    options.situationRepository
  );
}

/**
 * A minimal Author derived purely from the stable authorId (Threads username).
 * The keyword_search response has no richer author profile; this avoids
 * fabricating data the source did not provide.
 */
export function minimalThreadsAuthorResolver(sourceId: string) {
  return async (authorId: string): Promise<Author> => ({
    id: authorId,
    sourceId,
    username: authorId,
  });
}
