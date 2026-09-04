import { describe, it, expect } from 'vitest';
import {
  ThreadsSearchAdapter,
  ThreadsPipelineRunner,
  buildDefaultThreadsPipeline,
  minimalThreadsAuthorResolver,
  THREADS_SOURCE_ID,
} from '../../src/sources/threads/index.js';
import type {
  FetchLike,
  FetchResponseLike,
} from '../../src/sources/threads/index.js';
import type { ThreadsPost, ThreadsSearchResponse } from '../../src/sources/threads/types.js';
import { SituationRepository } from '../../src/persistence/repositories.js';

/**
 * Integration test for the full source-to-core chain:
 *
 *   (mocked) Threads API
 *       -> ThreadsSearchAdapter
 *       -> NormalizedContent[]
 *       -> ThreadsPipelineRunner
 *       -> core Pipeline
 *       -> Situation / OpportunityCard
 *
 * No live Threads API calls: HTTP is mocked via an injected fetch.
 */

const TOKEN = 'integration-test-token-987';

function jsonResponse(body: unknown, status = 200): FetchResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function makePost(overrides: Partial<ThreadsPost> = {}): ThreadsPost {
  return {
    id: 'th-1',
    text: 'placeholder',
    media_type: 'TEXT',
    permalink: 'https://www.threads.net/@user/post/th-1',
    timestamp: '2026-08-20T12:00:00+0000',
    username: 'user',
    has_replies: false,
    is_quote_post: false,
    is_reply: false,
    ...overrides,
  };
}

// A strong opportunity post and an obvious noise post.
const STRONG_POST = makePost({
  id: 'th-strong',
  text:
    'We are an established Chiang Mai manufacturer looking for an EU distributor partner to expand into the European market.',
  permalink: 'https://www.threads.net/@thaifactory/post/th-strong',
  username: 'thaifactory',
  has_replies: true,
});

const NOISE_POST = makePost({
  id: 'th-noise',
  text: 'Buy this altcoin now! 100x gains, to the moon, ape in before the pump! HODL crypto!',
  permalink: 'https://www.threads.net/@cryptoshiller/post/th-noise',
  username: 'cryptoshiller',
});

/** Build a runner whose adapter is fed by the given mocked responses. */
function makeRunner(
  responses: FetchResponseLike[] | FetchLike,
  situationRepository?: SituationRepository
): ThreadsPipelineRunner {
  let fetchImpl: FetchLike;
  if (typeof responses === 'function') {
    fetchImpl = responses;
  } else {
    const queue = [...responses];
    fetchImpl = async () => {
      const next = queue.shift();
      if (next === undefined) throw new Error('mock fetch: no more queued responses');
      return next;
    };
  }

  const adapter = new ThreadsSearchAdapter({
    accessToken: TOKEN,
    fetchImpl,
    maxPages: 1,
    maxItems: 10,
    maxRetries: 1,
    retryDelayMs: 0,
  });

  const pipeline = buildDefaultThreadsPipeline({
    authorResolver: minimalThreadsAuthorResolver(THREADS_SOURCE_ID),
    situationRepository,
  });

  return new ThreadsPipelineRunner(adapter, pipeline);
}

describe('Threads adapter -> runner -> Pipeline (integration)', () => {
  it('produces situations and cards for a strong opportunity post', async () => {
    const body: ThreadsSearchResponse = { data: [STRONG_POST, NOISE_POST] };
    const runner = makeRunner([jsonResponse(body)]);

    const result = await runner.run({ q: 'distributor thailand', searchType: 'RECENT', limit: 10 });

    // Source-level info surfaces the pre-pipeline fetch count.
    expect(result.keyword).toBe('distributor thailand');
    expect(result.contentFetched).toBe(2);
    expect(result.optionsUsed.searchType).toBe('RECENT');

    // Core pipeline results.
    expect(result.pipeline.scanRun.contentProcessed).toBe(2);
    expect(result.pipeline.situations.length).toBe(1);
    expect(result.pipeline.cards.length).toBe(1);
    expect(result.pipeline.scanRun.errors).toHaveLength(0);

    // The strong post became the situation; noise was rejected in detection.
    expect(result.pipeline.situations[0].sourceContentIds).toContain('th-strong');
    // Real Threads permalink propagates end-to-end into the card.
    expect(result.pipeline.cards[0].sourceLink).toBe(
      'https://www.threads.net/@thaifactory/post/th-strong'
    );
    expect(result.pipeline.cards[0].score).toBeGreaterThan(0);
  });

  it('confirms NormalizedContent reaches the pipeline with sourceId "threads"', async () => {
    // A custom pipeline capturing what the normalizer receives would be heavy;
    // instead assert the observable contract: content flows through and the
    // resulting situation carries the Threads-origin permalink and id.
    const body: ThreadsSearchResponse = { data: [STRONG_POST] };
    const runner = makeRunner([jsonResponse(body)]);

    const result = await runner.run({ q: 'distributor', limit: 5 });

    expect(result.contentFetched).toBe(1);
    expect(result.pipeline.situations).toHaveLength(1);
    expect(result.pipeline.situations[0].permalink).toMatch(/^https:\/\/www\.threads\.net\//);
  });

  it('handles empty Threads results cleanly (no situations, no errors)', async () => {
    const runner = makeRunner([jsonResponse({ data: [] })]);

    const result = await runner.run({ q: 'nothing matches here', limit: 10 });

    expect(result.contentFetched).toBe(0);
    expect(result.pipeline.scanRun.contentProcessed).toBe(0);
    expect(result.pipeline.situations).toHaveLength(0);
    expect(result.pipeline.cards).toHaveLength(0);
    expect(result.pipeline.scanRun.errors).toHaveLength(0);
    expect(result.pipeline.duplicatesSkipped).toBe(0);
  });

  it('surfaces API errors from the adapter without leaking the access token', async () => {
    const runner = makeRunner([jsonResponse({ error: { message: 'Invalid OAuth access token' } }, 400)]);

    let error: Error | undefined;
    try {
      await runner.run({ q: 'distributor', limit: 10 });
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeDefined();
    expect(error?.message).toMatch(/Threads API error 400/);
    // The token must never appear in a surfaced error.
    expect(error?.message).not.toContain(TOKEN);
  });

  it('surfaces network-level errors without leaking the access token', async () => {
    const runner = makeRunner(async () => {
      throw new Error(`socket failure token=${TOKEN}`);
    });

    let error: Error | undefined;
    try {
      await runner.run({ q: 'distributor', limit: 10 });
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeDefined();
    expect(error?.message).not.toContain(TOKEN);
  });

  it('persists situations idempotently when a repository is provided', async () => {
    const repo = new SituationRepository();
    const body: ThreadsSearchResponse = { data: [STRONG_POST] };

    const runner1 = makeRunner([jsonResponse(body)], repo);
    await runner1.run({ q: 'distributor', limit: 10 });
    const countAfterFirst = (await repo.findAll()).length;
    expect(countAfterFirst).toBe(1);

    // A second run of equivalent content should not duplicate the situation.
    const runner2 = makeRunner([jsonResponse(body)], repo);
    await runner2.run({ q: 'distributor', limit: 10 });
    const countAfterSecond = (await repo.findAll()).length;
    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it('processes multiple valid posts into multiple situations', async () => {
    const body: ThreadsSearchResponse = {
      data: [
        STRONG_POST,
        makePost({
          id: 'th-sourcing',
          text:
            'European company looking for a manufacturer in Thailand to source and produce our product line at scale.',
          permalink: 'https://www.threads.net/@eubuyer/post/th-sourcing',
          username: 'eubuyer',
        }),
      ],
    };
    const runner = makeRunner([jsonResponse(body)]);

    const result = await runner.run({ q: 'manufacturer', limit: 10 });

    expect(result.contentFetched).toBe(2);
    expect(result.pipeline.situations.length).toBeGreaterThanOrEqual(2);
    expect(result.pipeline.cards.length).toBe(result.pipeline.situations.length);
  });
});
