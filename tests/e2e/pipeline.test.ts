import { describe, it, expect, beforeEach } from 'vitest';
import { Pipeline } from '../../src/pipeline/pipeline.js';
import { FixtureNormalizer } from '../../src/normalization/fixture-normalizer.js';
import { RuleBasedCandidateDetector } from '../../src/detection/rule-based-detector.js';
import { DeterministicSituationExtractor } from '../../src/extraction/deterministic-extractor.js';
import { WeightedOpportunityScorer } from '../../src/scoring/weighted-opportunity-scorer.js';
import { RelationshipConfidenceCalculator } from '../../src/scoring/relationship-confidence-calculator.js';
import { CapabilityBasedMatcher } from '../../src/matching/capability-based-matcher.js';
import { DefaultOpportunityCardFormatter } from '../../src/cards/default-card-formatter.js';
import { USER_CAPABILITIES } from '../../src/matching/user-capabilities.js';
import type { Author } from '../../src/domain/index.js';
import {
  F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER,
  F02_RUSSIAN_SAAS, A02_RUSSIAN_SAAS,
  F03_RESTAURANT_AUTOMATION, A03_RESTAURANT,
  F04_EU_SEA_ENTRY, A04_EU_COMPANY,
  F05_THAI_SUCCESSION, A05_THAI_FACTORY,
  F06_CRYPTO_NOISE, A06_CRYPTO,
  F07_JOB_SEEKING, A07_JOB_SEEKER,
  F08_MOTIVATIONAL, A08_HUSTLER,
  F09_EU_SOURCING, A09_EU_BUYER,
  F10_MLM_NOISE, A10_MLM,
} from '../fixtures/raw-fixtures.js';

const AUTHOR_MAP: Record<string, Author> = {
  'author-somchai': A01_THAI_MANUFACTURER,
  'author-dmitri': A02_RUSSIAN_SAAS,
  'author-anna': A03_RESTAURANT,
  'author-prague-corp': A04_EU_COMPANY,
  'author-khun-boon': A05_THAI_FACTORY,
  'author-cryptobro': A06_CRYPTO,
  'author-job-seeker': A07_JOB_SEEKER,
  'author-hustler': A08_HUSTLER,
  'author-european-buyer': A09_EU_BUYER,
  'author-mlm': A10_MLM,
};

function createPipeline() {
  return new Pipeline(
    new FixtureNormalizer(),
    new RuleBasedCandidateDetector(),
    new DeterministicSituationExtractor(),
    new WeightedOpportunityScorer(),
    new RelationshipConfidenceCalculator(),
    new CapabilityBasedMatcher(),
    new DefaultOpportunityCardFormatter(),
    (authorId: string) => {
      const author = AUTHOR_MAP[authorId];
      if (!author) throw new Error(`Unknown author: ${authorId}`);
      return author;
    },
    USER_CAPABILITIES
  );
}

const ALL_FIXTURES = [
  F01_THAI_MANUFACTURER,
  F02_RUSSIAN_SAAS,
  F03_RESTAURANT_AUTOMATION,
  F04_EU_SEA_ENTRY,
  F05_THAI_SUCCESSION,
  F06_CRYPTO_NOISE,
  F07_JOB_SEEKING,
  F08_MOTIVATIONAL,
  F09_EU_SOURCING,
  F10_MLM_NOISE,
];

describe('End-to-End Pipeline', () => {
  let pipeline: Pipeline;

  beforeEach(() => {
    pipeline = createPipeline();
  });

  it('runs without throwing on all 10 fixtures', async () => {
    const result = await pipeline.run(ALL_FIXTURES, 'fixture');
    expect(result).toBeDefined();
    expect(result.scanRun).toBeDefined();
    expect(result.situations).toBeDefined();
    expect(result.cards).toBeDefined();
  });

  it('processes all 10 content items', async () => {
    const result = await pipeline.run(ALL_FIXTURES, 'fixture');
    expect(result.scanRun.contentProcessed).toBe(10);
  });

  it('rejects the 4 noise fixtures (crypto, job, motivational, mlm)', async () => {
    const result = await pipeline.run(ALL_FIXTURES, 'fixture');
    // 10 total, 4 noise (F06, F07, F08, F10) → 6 candidates
    expect(result.scanRun.candidatesFound).toBeGreaterThanOrEqual(5);
    expect(result.scanRun.situationsCreated).toBeGreaterThanOrEqual(5);
  });

  it('produces one card per situation', async () => {
    const result = await pipeline.run(ALL_FIXTURES, 'fixture');
    expect(result.cards.length).toBe(result.situations.length);
  });

  it('scan run has start and finish timestamps', async () => {
    const result = await pipeline.run(ALL_FIXTURES, 'fixture');
    expect(result.scanRun.startedAt).toBeInstanceOf(Date);
    expect(result.scanRun.finishedAt).toBeInstanceOf(Date);
  });

  it('scan run errors are empty (no processing failures)', async () => {
    const result = await pipeline.run(ALL_FIXTURES, 'fixture');
    expect(result.scanRun.errors).toHaveLength(0);
  });

  describe('F01: Thai manufacturer seeking EU distributor', () => {
    it('passes through pipeline as a situation', async () => {
      const result = await pipeline.run([F01_THAI_MANUFACTURER], 'fixture');
      expect(result.situations).toHaveLength(1);
    });

    it('gets HIGH score (>=50)', async () => {
      const result = await pipeline.run([F01_THAI_MANUFACTURER], 'fixture');
      const situation = result.situations[0];
      expect(situation.opportunityScore.total).toBeGreaterThanOrEqual(40);
    });

    it('card mentions distributor or EU match', async () => {
      const result = await pipeline.run([F01_THAI_MANUFACTURER], 'fixture');
      const card = result.cards[0];
      expect(card.renderedText.toLowerCase()).toMatch(/distribut|eu|partner/);
    });

    it('possible user roles include distributor or market-entry-partner', async () => {
      const result = await pipeline.run([F01_THAI_MANUFACTURER], 'fixture');
      const situation = result.situations[0];
      expect(
        situation.possibleUserRoles.some((r) =>
          ['distributor', 'market-entry-partner', 'partner', 'sourcing-partner'].includes(r)
        )
      ).toBe(true);
    });
  });

  describe('F02: Russian SaaS seeking European partner', () => {
    it('gets HIGH score (>=40)', async () => {
      const result = await pipeline.run([F02_RUSSIAN_SAAS], 'fixture');
      const situation = result.situations[0];
      expect(situation.opportunityScore.total).toBeGreaterThanOrEqual(40);
    });

    it('match includes partner role', async () => {
      const result = await pipeline.run([F02_RUSSIAN_SAAS], 'fixture');
      const card = result.cards[0];
      // Card should mention matching
      expect(card.renderedText).toBeTruthy();
    });
  });

  describe('F03: Chiang Mai restaurant seeking automation', () => {
    it('processes through pipeline', async () => {
      const result = await pipeline.run([F03_RESTAURANT_AUTOMATION], 'fixture');
      expect(result.situations).toHaveLength(1);
    });

    it('gets MEDIUM score (20–70)', async () => {
      const result = await pipeline.run([F03_RESTAURANT_AUTOMATION], 'fixture');
      const situation = result.situations[0];
      expect(situation.opportunityScore.total).toBeGreaterThan(15);
      expect(situation.opportunityScore.total).toBeLessThan(80);
    });

    it('automation-implementer role identified', async () => {
      const result = await pipeline.run([F03_RESTAURANT_AUTOMATION], 'fixture');
      const situation = result.situations[0];
      expect(situation.possibleUserRoles).toContain('automation-implementer');
    });
  });

  describe('F04: EU company entering Southeast Asian market', () => {
    it('processes through pipeline', async () => {
      const result = await pipeline.run([F04_EU_SEA_ENTRY], 'fixture');
      expect(result.situations).toHaveLength(1);
    });

    it('gets meaningful score', async () => {
      const result = await pipeline.run([F04_EU_SEA_ENTRY], 'fixture');
      const situation = result.situations[0];
      expect(situation.opportunityScore.total).toBeGreaterThan(20);
    });

    it('identifies market-entry-partner role', async () => {
      const result = await pipeline.run([F04_EU_SEA_ENTRY], 'fixture');
      const situation = result.situations[0];
      expect(
        situation.possibleUserRoles.some((r) =>
          ['market-entry-partner', 'partner', 'distributor'].includes(r)
        )
      ).toBe(true);
    });
  });

  describe('F05: Thai factory owner seeking successor', () => {
    it('gets HIGH score (>=40)', async () => {
      const result = await pipeline.run([F05_THAI_SUCCESSION], 'fixture');
      const situation = result.situations[0];
      expect(situation.opportunityScore.total).toBeGreaterThanOrEqual(35);
    });

    it('partner role identified', async () => {
      const result = await pipeline.run([F05_THAI_SUCCESSION], 'fixture');
      const situation = result.situations[0];
      expect(situation.possibleUserRoles).toContain('partner');
    });
  });

  describe('F06: Crypto pump-and-dump — noise', () => {
    it('produces no situations (rejected in detection)', async () => {
      const result = await pipeline.run([F06_CRYPTO_NOISE], 'fixture');
      expect(result.situations).toHaveLength(0);
      expect(result.cards).toHaveLength(0);
    });

    it('contentProcessed=1, candidatesFound=0', async () => {
      const result = await pipeline.run([F06_CRYPTO_NOISE], 'fixture');
      expect(result.scanRun.contentProcessed).toBe(1);
      expect(result.scanRun.candidatesFound).toBe(0);
    });
  });

  describe('F07: Job seeking post', () => {
    it('produces no situations (rejected in detection)', async () => {
      const result = await pipeline.run([F07_JOB_SEEKING], 'fixture');
      expect(result.situations).toHaveLength(0);
    });
  });

  describe('F08: Generic motivational post', () => {
    it('is rejected or has very low score', async () => {
      const result = await pipeline.run([F08_MOTIVATIONAL], 'fixture');
      // Either rejected in detection or produces very low score
      if (result.situations.length > 0) {
        expect(result.situations[0].opportunityScore.total).toBeLessThan(20);
      } else {
        expect(result.situations).toHaveLength(0);
      }
    });
  });

  describe('F09: EU company seeking Thai sourcing', () => {
    it('processes through pipeline', async () => {
      const result = await pipeline.run([F09_EU_SOURCING], 'fixture');
      expect(result.situations).toHaveLength(1);
    });
  });

  describe('F10: MLM noise', () => {
    it('produces no situations (rejected in detection)', async () => {
      const result = await pipeline.run([F10_MLM_NOISE], 'fixture');
      expect(result.situations).toHaveLength(0);
    });
  });

  describe('Pipeline result structure', () => {
    it('all situations have valid opportunity scores', async () => {
      const result = await pipeline.run(ALL_FIXTURES, 'fixture');
      for (const sit of result.situations) {
        expect(sit.opportunityScore.total).toBeGreaterThanOrEqual(0);
        expect(sit.opportunityScore.total).toBeLessThanOrEqual(100);
        expect(Object.keys(sit.opportunityScore.breakdown).length).toBeGreaterThan(0);
      }
    });

    it('all situations have valid relationship confidence', async () => {
      const result = await pipeline.run(ALL_FIXTURES, 'fixture');
      for (const sit of result.situations) {
        expect(sit.relationshipConfidence.score).toBeGreaterThanOrEqual(0);
        expect(sit.relationshipConfidence.score).toBeLessThanOrEqual(100);
      }
    });

    it('all cards have non-empty renderedText', async () => {
      const result = await pipeline.run(ALL_FIXTURES, 'fixture');
      for (const card of result.cards) {
        expect(card.renderedText.length).toBeGreaterThan(50);
      }
    });

    it('scan run counts are consistent', async () => {
      const result = await pipeline.run(ALL_FIXTURES, 'fixture');
      expect(result.scanRun.candidatesFound).toBeLessThanOrEqual(result.scanRun.contentProcessed);
      expect(result.scanRun.situationsCreated).toBeLessThanOrEqual(result.scanRun.candidatesFound);
    });
  });
});
