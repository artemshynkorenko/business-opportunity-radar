import { describe, it, expect } from 'vitest';
import { Pipeline } from '../../src/pipeline/pipeline.js';
import { FixtureNormalizer } from '../../src/normalization/fixture-normalizer.js';
import { InMemoryDeduplicator } from '../../src/deduplication/in-memory-deduplicator.js';
import { RuleBasedCandidateDetector } from '../../src/detection/rule-based-detector.js';
import { DeterministicSituationExtractor } from '../../src/extraction/deterministic-extractor.js';
import { WeightedOpportunityScorer } from '../../src/scoring/weighted-opportunity-scorer.js';
import { RelationshipConfidenceCalculator } from '../../src/scoring/relationship-confidence-calculator.js';
import { CapabilityBasedMatcher } from '../../src/matching/capability-based-matcher.js';
import { DefaultOpportunityCardFormatter } from '../../src/cards/default-card-formatter.js';
import { ARTEM_PROFILE } from '../../src/matching/profiles.js';
import type { Author } from '../../src/domain/index.js';
import {
  F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER,
  F09_EU_SOURCING, A09_EU_BUYER,
  F11_UNKNOWN_AUTHOR,
} from '../fixtures/raw-fixtures.js';

const KNOWN_AUTHORS: Record<string, Author> = {
  'author-somchai': A01_THAI_MANUFACTURER,
  'author-european-buyer': A09_EU_BUYER,
};

function makePipeline(resolver: (authorId: string) => Promise<Author>) {
  return new Pipeline(
    new FixtureNormalizer(),
    new InMemoryDeduplicator(),
    new RuleBasedCandidateDetector(),
    new DeterministicSituationExtractor(),
    new WeightedOpportunityScorer(),
    new RelationshipConfidenceCalculator(),
    new CapabilityBasedMatcher(),
    new DefaultOpportunityCardFormatter(),
    resolver,
    ARTEM_PROFILE
  );
}

describe('Pipeline — async author resolution', () => {
  describe('successful async resolution', () => {
    it('resolves author asynchronously and produces a situation', async () => {
      const pipeline = makePipeline(async (authorId) => {
        // Simulate async delay
        await new Promise((resolve) => setTimeout(resolve, 1));
        const author = KNOWN_AUTHORS[authorId];
        if (!author) throw new Error(`Unknown: ${authorId}`);
        return author;
      });

      const result = await pipeline.run([F01_THAI_MANUFACTURER], 'fixture');
      expect(result.situations).toHaveLength(1);
      expect(result.scanRun.errors).toHaveLength(0);
    });

    it('processes multiple items with async resolver', async () => {
      const pipeline = makePipeline(async (authorId) => {
        const author = KNOWN_AUTHORS[authorId];
        if (!author) throw new Error(`Unknown: ${authorId}`);
        return author;
      });

      const result = await pipeline.run([F01_THAI_MANUFACTURER, F09_EU_SOURCING], 'fixture');
      expect(result.situations).toHaveLength(2);
      expect(result.scanRun.errors).toHaveLength(0);
    });
  });

  describe('resolver throws — item skipped, error recorded', () => {
    it('unknown author causes error to be recorded', async () => {
      const pipeline = makePipeline(async (authorId) => {
        const author = KNOWN_AUTHORS[authorId];
        if (!author) throw new Error(`Unknown author: ${authorId}`);
        return author;
      });

      const result = await pipeline.run([F11_UNKNOWN_AUTHOR], 'fixture');
      expect(result.situations).toHaveLength(0);
      expect(result.scanRun.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.scanRun.errors.some((e) => e.includes('author-nonexistent'))).toBe(true);
    });

    it('resolver rejection skips that item but does not stop the pipeline', async () => {
      const pipeline = makePipeline(async (authorId) => {
        if (authorId === 'author-nonexistent') {
          return Promise.reject(new Error(`Author not found: ${authorId}`));
        }
        const author = KNOWN_AUTHORS[authorId];
        if (!author) throw new Error(`Unknown: ${authorId}`);
        return author;
      });

      // F11 (unknown) + F01 (known) + F09 (known)
      const result = await pipeline.run(
        [F11_UNKNOWN_AUTHOR, F01_THAI_MANUFACTURER, F09_EU_SOURCING],
        'fixture'
      );

      // Two items should succeed
      expect(result.situations.length).toBeGreaterThanOrEqual(2);
      // One error for F11
      expect(result.scanRun.errors.length).toBe(1);
      expect(result.scanRun.errors[0]).toContain('author-nonexistent');
    });

    it('multiple items: one author lookup fails, rest complete successfully', async () => {
      let callCount = 0;
      const pipeline = makePipeline(async (authorId) => {
        callCount++;
        const author = KNOWN_AUTHORS[authorId];
        if (!author) throw new Error(`Unresolvable: ${authorId}`);
        return author;
      });

      const result = await pipeline.run(
        [F01_THAI_MANUFACTURER, F11_UNKNOWN_AUTHOR, F09_EU_SOURCING],
        'fixture'
      );

      // F01 and F09 both pass candidate detection; F11 also passes (it's a business need)
      // So we expect at least 2 situations (F01 and F09), 1 error (F11)
      expect(result.situations.length).toBeGreaterThanOrEqual(2);
      expect(result.scanRun.errors.length).toBeGreaterThanOrEqual(1);
      // Resolver was called at least for the candidates that passed detection
      expect(callCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('fallback behavior', () => {
    it('failed author resolution does NOT produce a situation (no fallback author used)', async () => {
      const pipeline = makePipeline(async (_authorId) => {
        throw new Error('Resolver always fails');
      });

      const result = await pipeline.run([F01_THAI_MANUFACTURER], 'fixture');
      // No situations because author resolution failed for every item
      expect(result.situations).toHaveLength(0);
      expect(result.scanRun.errors.length).toBeGreaterThanOrEqual(1);
    });
  });
});
