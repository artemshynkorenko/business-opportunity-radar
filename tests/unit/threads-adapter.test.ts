import { describe, it, expect, vi } from 'vitest';
import {
  ThreadsSearchAdapter,
  THREADS_SOURCE_ID,
} from '../../src/sources/threads/index.js';
import type {
  FetchLike,
  FetchResponseLike,
  ThreadsSearchAdapterConfig,
} from '../../src/sources/threads/index.js';
import type {
  ThreadsPost,
  ThreadsSearchResponse,
} from '../../src/sources/threads/types.js';

// ---------------------------------------------------------------------------
// Mock helpers — no live network calls anywhere in this file.
// ---------------------------------------------------------------------------

const TOKEN = 'test-token-abc123';

/** Mocked fetch: loose arg tuple so zero-arg impls assign; return is fixed. */
type MockFetch = ReturnType<typeof vi.fn<unknown[], Promise<FetchResponseLike>>>;

/** Read the request URL of the Nth mocked fetch call. */
function calledUrl(mock: MockFetch, index = 0): string {
  return mock.mock.calls[index][0] as string;
}

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
    id: 'post-1',
    text: 'Looking for a distributor in the EU market.',
    media_type: 'TEXT',
    permalink: 'https://www.threads.net/@acme/post/post-1',
    timestamp: '2026-08-01T10:00:00+0000',
    username: 'acme',
    has_replies: false,
    is_quote_post: false,
    is_reply: false,
    ...overrides,
  };
}

/** Build an adapter with a mocked fetch returning the given queued responses. */
function makeAdapter(
  responses: FetchResponseLike[] | FetchLike,
  config: Partial<ThreadsSearchAdapterConfig> = {}
): { adapter: ThreadsSearchAdapter; fetchMock: MockFetch } {
  let fetchMock: MockFetch;

  if (typeof responses === 'function') {
    fetchMock = vi.fn(responses as (...args: unknown[]) => Promise<FetchResponseLike>);
  } else {
    const queue = [...responses];
    fetchMock = vi.fn(async () => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error('mock fetch: no more queued responses');
      }
      return next;
    });
  }

  const adapter = new ThreadsSearchAdapter({
    accessToken: TOKEN,
    fetchImpl: fetchMock as unknown as FetchLike,
    retryDelayMs: 0,
    ...config,
  });

  return { adapter, fetchMock };
}

// ---------------------------------------------------------------------------

describe('ThreadsSearchAdapter', () => {
  describe('successful search', () => {
    it('returns normalized content for a single-page result', async () => {
      const body: ThreadsSearchResponse = { data: [makePost()] };
      const { adapter } = makeAdapter([jsonResponse(body)]);

      const results = await adapter.search({ q: 'distributor' });

      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe(THREADS_SOURCE_ID);
    });

    it('issues the request against the keyword_search endpoint with q and fields', async () => {
      const { adapter, fetchMock } = makeAdapter([jsonResponse({ data: [] })]);

      await adapter.search({ q: 'sourcing thailand' });

      const url = calledUrl(fetchMock);
      expect(url).toContain('/keyword_search');
      expect(url).toContain('q=sourcing+thailand');
      expect(url).toContain('fields=');
    });

    it('maps all documented API parameters into the query string', async () => {
      const { adapter, fetchMock } = makeAdapter([jsonResponse({ data: [] })]);

      await adapter.search({
        q: 'partner',
        searchType: 'RECENT',
        searchMode: 'default',
        mediaType: 'IMAGE',
        since: '2026-01-01',
        until: '2026-12-31',
        limit: 50,
        authorUsername: 'someone',
      });

      const url = calledUrl(fetchMock);
      expect(url).toContain('search_type=RECENT');
      expect(url).toContain('search_mode=default');
      expect(url).toContain('media_type=IMAGE');
      expect(url).toContain('since=2026-01-01');
      expect(url).toContain('until=2026-12-31');
      expect(url).toContain('limit=50');
      expect(url).toContain('author_username=someone');
    });
  });

  describe('response -> NormalizedContent mapping', () => {
    it('maps core fields correctly', async () => {
      const post = makePost({
        id: 'abc-42',
        text: 'We manufacture in Chiang Mai and need an EU distributor.',
        timestamp: '2026-08-01T10:00:00+0000',
      });
      const { adapter } = makeAdapter([jsonResponse({ data: [post] })]);

      const [content] = await adapter.search({ q: 'distributor' });

      expect(content.contentId).toBe('abc-42');
      expect(content.sourceId).toBe('threads');
      expect(content.text).toBe('We manufacture in Chiang Mai and need an EU distributor.');
      expect(content.timestamp).toBeInstanceOf(Date);
      expect(content.timestamp.toISOString()).toBe('2026-08-01T10:00:00.000Z');
      expect(content.contentType).toBe('post');
    });

    it('carries Threads-specific fields into metadata, not the core fields', async () => {
      const post = makePost({
        media_type: 'VIDEO',
        has_replies: true,
        is_quote_post: true,
        is_reply: false,
      });
      const { adapter } = makeAdapter([jsonResponse({ data: [post] })]);

      const [content] = await adapter.search({ q: 'partner' });

      expect(content.metadata.mediaType).toBe('VIDEO');
      expect(content.metadata.hasReplies).toBe(true);
      expect(content.metadata.isQuotePost).toBe(true);
      expect(content.metadata.isReply).toBe(false);
    });

    it('classifies a reply as comment contentType', async () => {
      const post = makePost({ is_reply: true });
      const { adapter } = makeAdapter([jsonResponse({ data: [post] })]);

      const [content] = await adapter.search({ q: 'partner' });

      expect(content.contentType).toBe('comment');
    });
  });

  describe('permalink mapping', () => {
    it('maps permalink verbatim from the response', async () => {
      const post = makePost({ permalink: 'https://www.threads.net/@acme/post/xyz' });
      const { adapter } = makeAdapter([jsonResponse({ data: [post] })]);

      const [content] = await adapter.search({ q: 'partner' });

      expect(content.permalink).toBe('https://www.threads.net/@acme/post/xyz');
    });
  });

  describe('username / author mapping', () => {
    it('uses username as the stable authorId', async () => {
      const post = makePost({ username: 'somchai_mfg' });
      const { adapter } = makeAdapter([jsonResponse({ data: [post] })]);

      const [content] = await adapter.search({ q: 'partner' });

      expect(content.authorId).toBe('somchai_mfg');
      expect(content.metadata.username).toBe('somchai_mfg');
    });

    it('falls back to post id as authorId when username is missing', async () => {
      const post = makePost({ id: 'p-99', username: undefined });
      const { adapter } = makeAdapter([jsonResponse({ data: [post] })]);

      const [content] = await adapter.search({ q: 'partner' });

      expect(content.authorId).toBe('p-99');
    });
  });

  describe('multiple posts', () => {
    it('maps every post in a page preserving order', async () => {
      const body: ThreadsSearchResponse = {
        data: [
          makePost({ id: 'a', username: 'ua' }),
          makePost({ id: 'b', username: 'ub' }),
          makePost({ id: 'c', username: 'uc' }),
        ],
      };
      const { adapter } = makeAdapter([jsonResponse(body)]);

      const results = await adapter.search({ q: 'partner' });

      expect(results.map((r) => r.contentId)).toEqual(['a', 'b', 'c']);
      expect(results.map((r) => r.authorId)).toEqual(['ua', 'ub', 'uc']);
    });
  });

  describe('pagination', () => {
    it('follows paging.next across pages and concatenates results', async () => {
      const page1: ThreadsSearchResponse = {
        data: [makePost({ id: 'p1' })],
        paging: { next: 'https://graph.threads.net/v1.0/keyword_search?after=CURSOR2' },
      };
      const page2: ThreadsSearchResponse = {
        data: [makePost({ id: 'p2' })],
        paging: { next: 'https://graph.threads.net/v1.0/keyword_search?after=CURSOR3' },
      };
      const page3: ThreadsSearchResponse = { data: [makePost({ id: 'p3' })] };

      const { adapter, fetchMock } = makeAdapter([
        jsonResponse(page1),
        jsonResponse(page2),
        jsonResponse(page3),
      ]);

      const results = await adapter.search({ q: 'partner' });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(results.map((r) => r.contentId)).toEqual(['p1', 'p2', 'p3']);
      // Second call must use the exact `next` URL returned by page 1.
      expect(calledUrl(fetchMock, 1)).toBe(page1.paging?.next);
    });

    it('stops when there is no next page', async () => {
      const page1: ThreadsSearchResponse = {
        data: [makePost({ id: 'p1' })],
        // paging present but no `next`
        paging: { cursors: { after: 'END' } },
      };
      const { adapter, fetchMock } = makeAdapter([jsonResponse(page1)]);

      const results = await adapter.search({ q: 'partner' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
    });
  });

  describe('empty result', () => {
    it('returns an empty array when data is empty', async () => {
      const { adapter } = makeAdapter([jsonResponse({ data: [] })]);
      const results = await adapter.search({ q: 'nothing here' });
      expect(results).toEqual([]);
    });

    it('treats a missing data array as empty', async () => {
      const { adapter } = makeAdapter([jsonResponse({})]);
      const results = await adapter.search({ q: 'nothing here' });
      expect(results).toEqual([]);
    });
  });

  describe('API error', () => {
    it('throws on a non-transient 400 with the API error message', async () => {
      const errBody = { error: { message: 'Invalid parameter', code: 100 } };
      const { adapter, fetchMock } = makeAdapter([jsonResponse(errBody, 400)]);

      await expect(adapter.search({ q: 'partner' })).rejects.toThrow(/Invalid parameter/);
      // 400 is non-transient -> no retries.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('retries transient 500 errors up to the bound, then succeeds', async () => {
      const okBody: ThreadsSearchResponse = { data: [makePost({ id: 'ok' })] };
      const { adapter, fetchMock } = makeAdapter(
        [jsonResponse({ error: { message: 'server' } }, 500), jsonResponse(okBody)],
        { maxRetries: 2 }
      );

      const results = await adapter.search({ q: 'partner' });

      expect(results.map((r) => r.contentId)).toEqual(['ok']);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('gives up after exhausting retries on persistent transient errors', async () => {
      const { adapter, fetchMock } = makeAdapter(
        [
          jsonResponse({ error: { message: 'busy' } }, 503),
          jsonResponse({ error: { message: 'busy' } }, 503),
          jsonResponse({ error: { message: 'busy' } }, 503),
        ],
        { maxRetries: 2 }
      );

      await expect(adapter.search({ q: 'partner' })).rejects.toThrow(/failed after 3 attempt/);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('retries network-level failures then rethrows a sanitized error', async () => {
      const fetchMock = vi.fn(async () => {
        throw new Error(`socket hang up token=${TOKEN}`);
      });
      const adapter = new ThreadsSearchAdapter({
        accessToken: TOKEN,
        fetchImpl: fetchMock as unknown as FetchLike,
        maxRetries: 1,
        retryDelayMs: 0,
      });

      let error: Error | undefined;
      try {
        await adapter.search({ q: 'partner' });
      } catch (e) {
        error = e as Error;
      }

      expect(fetchMock).toHaveBeenCalledTimes(2);
      // Token must never leak into surfaced errors.
      expect(error?.message).not.toContain(TOKEN);
      expect(error?.message).toContain('[REDACTED]');
    });
  });

  describe('missing token', () => {
    it('throws when neither config token nor env var is set', () => {
      const original = process.env.THREADS_ACCESS_TOKEN;
      delete process.env.THREADS_ACCESS_TOKEN;
      try {
        expect(
          () =>
            new ThreadsSearchAdapter({
              fetchImpl: (async () => jsonResponse({ data: [] })) as unknown as FetchLike,
            })
        ).toThrow(/missing access token/i);
      } finally {
        if (original !== undefined) process.env.THREADS_ACCESS_TOKEN = original;
      }
    });

    it('reads the token from THREADS_ACCESS_TOKEN when not passed explicitly', async () => {
      const original = process.env.THREADS_ACCESS_TOKEN;
      process.env.THREADS_ACCESS_TOKEN = 'env-token-999';
      const fetchMock: MockFetch = vi.fn(async () => jsonResponse({ data: [] }));
      try {
        const adapter = new ThreadsSearchAdapter({
          fetchImpl: fetchMock as unknown as FetchLike,
        });
        await adapter.search({ q: 'partner' });
        const url = calledUrl(fetchMock);
        expect(url).toContain('access_token=env-token-999');
      } finally {
        if (original !== undefined) process.env.THREADS_ACCESS_TOKEN = original;
        else delete process.env.THREADS_ACCESS_TOKEN;
      }
    });
  });

  describe('invalid q', () => {
    it('rejects an empty q without issuing a request', async () => {
      const { adapter, fetchMock } = makeAdapter([]);
      await expect(adapter.search({ q: '' })).rejects.toThrow(/non-empty/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a whitespace-only q', async () => {
      const { adapter } = makeAdapter([]);
      await expect(adapter.search({ q: '   ' })).rejects.toThrow(/non-empty/);
    });
  });

  describe('invalid limit', () => {
    it('rejects a limit above the Threads maximum of 100', async () => {
      const { adapter, fetchMock } = makeAdapter([]);
      await expect(adapter.search({ q: 'partner', limit: 101 })).rejects.toThrow(/maximum of 100/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a non-positive limit', async () => {
      const { adapter } = makeAdapter([]);
      await expect(adapter.search({ q: 'partner', limit: 0 })).rejects.toThrow(/positive integer/);
    });

    it('accepts a limit of exactly 100', async () => {
      const { adapter, fetchMock } = makeAdapter([jsonResponse({ data: [] })]);
      await adapter.search({ q: 'partner', limit: 100 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('bounded pagination', () => {
    it('never fetches more than maxPages even if next is always present', async () => {
      // Every response advertises a next page, so only the bound can stop it.
      const infinite: FetchLike = async () =>
        jsonResponse({
          data: [makePost({ id: `p-${Math.random()}` })],
          paging: { next: 'https://graph.threads.net/v1.0/keyword_search?after=LOOP' },
        });

      const { adapter, fetchMock } = makeAdapter(infinite, { maxPages: 3 });

      const results = await adapter.search({ q: 'partner' });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
    });

    it('never returns more than maxItems', async () => {
      const infinite: FetchLike = async () =>
        jsonResponse({
          data: [
            makePost({ id: `a-${Math.random()}` }),
            makePost({ id: `b-${Math.random()}` }),
          ],
          paging: { next: 'https://graph.threads.net/v1.0/keyword_search?after=LOOP' },
        });

      const { adapter } = makeAdapter(infinite, { maxPages: 100, maxItems: 3 });

      const results = await adapter.search({ q: 'partner' });

      expect(results).toHaveLength(3);
    });
  });

  describe('missing optional fields', () => {
    it('produces valid NormalizedContent when optional fields are absent', async () => {
      const sparse: ThreadsPost = { id: 'only-id' };
      const { adapter } = makeAdapter([jsonResponse({ data: [sparse] })]);

      const [content] = await adapter.search({ q: 'partner' });

      expect(content.contentId).toBe('only-id');
      expect(content.authorId).toBe('only-id'); // fell back to id
      expect(content.text).toBe('');
      expect(content.permalink).toBe('');
      expect(content.contentType).toBe('post');
      expect(content.timestamp).toBeInstanceOf(Date);
      expect(content.metadata.mediaType).toBeUndefined();
    });
  });

  describe('token confidentiality', () => {
    it('does not surface the token in a non-transient API error', async () => {
      const { adapter } = makeAdapter([jsonResponse({ error: { message: 'bad' } }, 401)]);
      let error: Error | undefined;
      try {
        await adapter.search({ q: 'partner' });
      } catch (e) {
        error = e as Error;
      }
      expect(error?.message).not.toContain(TOKEN);
    });
  });
});
