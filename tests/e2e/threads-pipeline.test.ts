import { describe, it, expect } from 'vitest';
import {
  ThreadsSearchAdapter,
  THREADS_SOURCE_ID,
} from '../../src/sources/threads/index.js';
import type {
  FetchLike,
  FetchResponseLike,
} from '../../src/sources/threads/index.js';
import type { ThreadsPost, ThreadsSearchResponse } from '../../src/sources/threads/types.js';

import { Pipeline } from '../../src/pipeline/pipeline.js';
import { InMemoryDeduplicator } from '../../src/deduplication/in-memory-deduplicator.js';
import { RuleBasedCandidateDetector } from '../../src/detection/rule-based-detector.js';
import { DeterministicSituationExtractor } from '../../src/extraction/deterministic-extractor.js';
import { WeightedOpportunityScorer } from '../../src/scoring/weighted-opportunity-scorer.js';
import { RelationshipConfidenceCalculator } from '../../src/scoring/relationship-confidence-calculator.js';
import { CapabilityBasedMatcher } from '../../src/matching/capability-based-matcher.js';
import { DefaultOpportunityCardFormatter } from '../../src/cards/default-card-formatter.js';
import { ARTEM_PROFILE } from '../../src/matching/profiles.js';
import type { Author, NormalizedContent } from '../../src/domain/index.js';
import type { NormalizerInterface } from '../../src/normalization/normalizer-interface.js';

/**
 * Integration test:
 *   mocked Threads HTTP -> ThreadsSearchAdapter -> NormalizedContent[] -> Pipeline
 *
 * This verifies the source adapter's output is directly consumable by the
 * source-independent core, with NO changes to the core. No live API calls.
 */

// ---------------------------------------------------------------------------
// Pass-through normalizer.
//
// The adapter already produces NormalizedContent. The Pipeline expects a
// NormalizerInterface it calls internally. This adapter-boundary normalizer
// simply asserts the object is already NormalizedContent and returns it,
// proving the adapter output satisfies the core contract without a second
// mapping step. It performs no source-specific work.
// ---------------------------------------------------------------------------
class PassThroughNormalizer implements NormalizerInterface {
  normalize(raw: unknown, _sourceId: string): NormalizedContent {
    const c = raw as NormalizedContent;
    if (!c || typeof c.contentId !== 'string' || !(c.timestamp instanceof Date)) {
      throw new Error('PassThroughNormalizer: expected NormalizedContent');
    }
    return c;
  }
}

function jsonResponse(body: unknown, status = 200): FetchResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

// A strong opportunity post and an obvious noise post.
const STRONG_POST: ThreadsPost = {
  id: 'th-strong-1',
  text:
    'We are a Chiang Mai manufacturer with an established factory and are looking for an EU distributor partner to expand into the European market.',
  media_type: 'TEXT',
  permalink: 'https://www.threads.net/@thaifactory/post/th-strong-1',
  timestamp: '2026-08-15T09:00:00+0000',
  username: 'thaifactory',
  has_replies: true,
  is_quote_post: false,
  is_reply: false,
};

const NOISE_POST: ThreadsPost = {
  id: 'th-noise-1',
  text: 'Buy this altcoin now! 100x gains, to the moon, ape in before the pump! HODL crypto!',
  media_type: 'TEXT',
  permalink: 'https://www.threads.net/@cryptoshiller/post/th-noise-1',
  timestamp: '2026-08-15T09:05:00+0000',
  username: 'cryptoshiller',
  has_replies: false,
  is_quote_post: false,
  is_reply: false,
};

// Author resolver keyed by the adapter-produced authorId (the username).
const AUTHORS: Record<string, Author> = {
  thaifactory: {
    id: 'thaifactory',
    sourceId: THREADS_SOURCE_ID,
    username: 'thaifactory',
    displayName: 'Chiang Mai Factory Co.',
    verified: false,
  },
};

function buildPipeline(): Pipeline {
  return new Pipeline(
    new PassThroughNormalizer(),
    new InMemoryDeduplicator(),
    new RuleBasedCandidateDetector(),
    new DeterministicSituationExtractor(),
    new WeightedOpportunityScorer(),
    new RelationshipConfidenceCalculator(),
    new CapabilityBasedMatcher(),
    new DefaultOpportunityCardFormatter(),
    async (authorId: string) => {
      const author = AUTHORS[authorId];
      if (!author) throw new Error(`Unknown author: ${authorId}`);
      return author;
    },
    ARTEM_PROFILE
  );
}

describe('Integration: Threads adapter -> Pipeline', () => {
  it('feeds adapter output through the pipeline and produces a situation for the strong post', async () => {
    const body: ThreadsSearchResponse = { data: [STRONG_POST, NOISE_POST] };
    const fetchImpl: FetchLike = async () => jsonResponse(body);
    const adapter = new ThreadsSearchAdapter({ accessToken: 'x', fetchImpl });

    const normalized = await adapter.search({ q: 'distributor thailand' });
    expect(normalized).toHaveLength(2);
    expect(normalized.every((c) => c.sourceId === THREADS_SOURCE_ID)).toBe(true);

    const pipeline = buildPipeline();
    const result = await pipeline.run(normalized, THREADS_SOURCE_ID);

    // The strong post is a candidate; the crypto noise is rejected in detection.
    expect(result.scanRun.contentProcessed).toBe(2);
    expect(result.situations).toHaveLength(1);
    expect(result.scanRun.errors).toHaveLength(0);

    const situation = result.situations[0];
    expect(situation.sourceContentIds).toContain('th-strong-1');
    // Real permalink propagates end-to-end into the card.
    expect(result.cards[0].sourceLink).toBe('https://www.threads.net/@thaifactory/post/th-strong-1');
  });

  it('produces an opportunity card with a Threads permalink as the source link', async () => {
    const body: ThreadsSearchResponse = { data: [STRONG_POST] };
    const fetchImpl: FetchLike = async () => jsonResponse(body);
    const adapter = new ThreadsSearchAdapter({ accessToken: 'x', fetchImpl });

    const normalized = await adapter.search({ q: 'distributor' });
    const pipeline = buildPipeline();
    const result = await pipeline.run(normalized, THREADS_SOURCE_ID);

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].sourceLink).toMatch(/^https:\/\/www\.threads\.net\//);
    expect(result.cards[0].score).toBeGreaterThan(0);
  });

  it('deduplicates on a second pipeline run with the same deduplicator', async () => {
    const body: ThreadsSearchResponse = { data: [STRONG_POST] };
    const fetchImpl: FetchLike = async () => jsonResponse(body);
    const adapter = new ThreadsSearchAdapter({ accessToken: 'x', fetchImpl });
    const normalized = await adapter.search({ q: 'distributor' });

    const deduplicator = new InMemoryDeduplicator();
    const pipeline = new Pipeline(
      new PassThroughNormalizer(),
      deduplicator,
      new RuleBasedCandidateDetector(),
      new DeterministicSituationExtractor(),
      new WeightedOpportunityScorer(),
      new RelationshipConfidenceCalculator(),
      new CapabilityBasedMatcher(),
      new DefaultOpportunityCardFormatter(),
      async (authorId: string) => {
        const author = AUTHORS[authorId];
        if (!author) throw new Error(`Unknown author: ${authorId}`);
        return author;
      },
      ARTEM_PROFILE
    );

    const first = await pipeline.run(normalized, THREADS_SOURCE_ID);
    expect(first.duplicatesSkipped).toBe(0);
    const second = await pipeline.run(normalized, THREADS_SOURCE_ID);
    expect(second.duplicatesSkipped).toBe(normalized.length);
  });
});
