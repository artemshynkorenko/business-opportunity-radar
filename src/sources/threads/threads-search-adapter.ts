import type { NormalizedContent } from '../../domain/index.js';
import type {
  ThreadsPost,
  ThreadsSearchOptions,
  ThreadsSearchResponse,
} from './types.js';

/**
 * Minimal fetch signature the adapter depends on. Node 18+ provides a global
 * `fetch` compatible with this shape. Injectable so tests can mock HTTP
 * without making live network calls.
 */
export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string> }
) => Promise<FetchResponseLike>;

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export interface ThreadsSearchAdapterConfig {
  /**
   * Threads user access token. If omitted, it is read from the
   * THREADS_ACCESS_TOKEN environment variable. Never logged or persisted.
   */
  accessToken?: string;
  /** Base API URL. Defaults to the official Threads Graph host. */
  baseUrl?: string;
  /** Injectable fetch implementation. Defaults to global `fetch`. */
  fetchImpl?: FetchLike;
  /** Hard cap on number of pages fetched per search. Default 5. */
  maxPages?: number;
  /** Hard cap on total posts returned per search. Default 500. */
  maxItems?: number;
  /** Number of retry attempts for transient HTTP failures. Default 2. */
  maxRetries?: number;
  /** Base delay (ms) between retries. Default 0 (no wait) to keep tests fast. */
  retryDelayMs?: number;
}

/** The official Threads keyword search host + version. */
const DEFAULT_BASE_URL = 'https://graph.threads.net/v1.0';

/** Threads API maximum page size. */
const THREADS_MAX_LIMIT = 100;

/** Fields we request from each matched post. */
const REQUESTED_FIELDS = [
  'id',
  'text',
  'media_type',
  'permalink',
  'timestamp',
  'username',
  'has_replies',
  'is_quote_post',
  'is_reply',
].join(',');

/** HTTP status codes considered transient and worth retrying. */
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);

/** Stable source identifier used across the core for Threads-origin content. */
export const THREADS_SOURCE_ID = 'threads';

/**
 * Source adapter for the official Threads keyword_search API.
 *
 * Responsibilities:
 *  - build and issue authenticated requests to keyword_search
 *  - validate inputs (non-empty q, limit <= 100)
 *  - follow cursor pagination within configurable bounds
 *  - retry a bounded number of times on transient HTTP failures
 *  - map raw posts into the source-independent NormalizedContent model
 *
 * This adapter is deliberately isolated from the core pipeline. Its only
 * contract with the core is producing NormalizedContent[]; no Threads-specific
 * concept leaks into the domain beyond the opaque `metadata` bag.
 */
export class ThreadsSearchAdapter {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly maxPages: number;
  private readonly maxItems: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly accessToken: string;

  constructor(config: ThreadsSearchAdapterConfig = {}) {
    const token = config.accessToken ?? process.env.THREADS_ACCESS_TOKEN;
    if (token === undefined || token.length === 0) {
      // Do NOT include the (missing) token or env contents in the message.
      throw new Error(
        'ThreadsSearchAdapter: missing access token. Set THREADS_ACCESS_TOKEN or pass accessToken.'
      );
    }
    this.accessToken = token;

    const resolvedFetch = config.fetchImpl ?? (globalThis.fetch as unknown as FetchLike | undefined);
    if (resolvedFetch === undefined) {
      throw new Error(
        'ThreadsSearchAdapter: no fetch implementation available. Provide fetchImpl.'
      );
    }
    this.fetchImpl = resolvedFetch;

    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.maxPages = config.maxPages ?? 5;
    this.maxItems = config.maxItems ?? 500;
    this.maxRetries = config.maxRetries ?? 2;
    this.retryDelayMs = config.retryDelayMs ?? 0;
  }

  /**
   * Execute a keyword search and return normalized content.
   * Follows pagination until there are no more pages, or a configured bound
   * (maxPages / maxItems) is reached, whichever comes first.
   */
  async search(options: ThreadsSearchOptions): Promise<NormalizedContent[]> {
    this.validateOptions(options);

    const results: NormalizedContent[] = [];
    let nextUrl: string | undefined = this.buildInitialUrl(options);
    let page = 0;

    while (nextUrl !== undefined && page < this.maxPages && results.length < this.maxItems) {
      const response = await this.fetchPage(nextUrl);
      page++;

      for (const post of response.data) {
        if (results.length >= this.maxItems) {
          break;
        }
        results.push(this.mapPost(post));
      }

      nextUrl = response.paging?.next;
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  private validateOptions(options: ThreadsSearchOptions): void {
    if (typeof options.q !== 'string' || options.q.trim().length === 0) {
      throw new Error('ThreadsSearchAdapter: `q` must be a non-empty search keyword.');
    }
    if (options.limit !== undefined) {
      if (!Number.isInteger(options.limit) || options.limit <= 0) {
        throw new Error('ThreadsSearchAdapter: `limit` must be a positive integer.');
      }
      if (options.limit > THREADS_MAX_LIMIT) {
        throw new Error(
          `ThreadsSearchAdapter: \`limit\` must not exceed the Threads API maximum of ${THREADS_MAX_LIMIT}.`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Request building
  // ---------------------------------------------------------------------------

  private buildInitialUrl(options: ThreadsSearchOptions): string {
    const params = new URLSearchParams();
    params.set('q', options.q.trim());
    params.set('fields', REQUESTED_FIELDS);

    if (options.searchType !== undefined) params.set('search_type', options.searchType);
    if (options.searchMode !== undefined) params.set('search_mode', options.searchMode);
    if (options.mediaType !== undefined) params.set('media_type', options.mediaType);
    if (options.since !== undefined) params.set('since', options.since);
    if (options.until !== undefined) params.set('until', options.until);
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.authorUsername !== undefined) {
      params.set('author_username', options.authorUsername);
    }

    // Token is carried as a query param per the Graph API convention. It is
    // appended last and never logged.
    params.set('access_token', this.accessToken);

    return `${this.baseUrl}/keyword_search?${params.toString()}`;
  }

  // ---------------------------------------------------------------------------
  // HTTP with bounded retry
  // ---------------------------------------------------------------------------

  private async fetchPage(url: string): Promise<ThreadsSearchResponse> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      let response: FetchResponseLike;
      try {
        response = await this.fetchImpl(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
      } catch (networkErr) {
        // Network-level failure (DNS, socket) is treated as transient.
        lastError = this.sanitizeError(networkErr);
        if (attempt < this.maxRetries) {
          await this.delay(attempt);
          continue;
        }
        break;
      }

      if (response.ok) {
        const body = (await response.json()) as ThreadsSearchResponse;
        return this.normalizeEnvelope(body);
      }

      // Non-OK response.
      const detail = await this.safeErrorDetail(response);
      if (TRANSIENT_STATUS.has(response.status)) {
        // Transient: retry within bounds, otherwise fall through to the
        // "exhausted attempts" error below for a consistent surfaced message.
        lastError = new Error(`Threads API transient error ${response.status}: ${detail}`);
        if (attempt < this.maxRetries) {
          await this.delay(attempt);
          continue;
        }
        break;
      }
      // Non-transient: fail immediately with the concrete status.
      throw new Error(`Threads API error ${response.status}: ${detail}`);
    }

    throw new Error(
      `Threads API request failed after ${this.maxRetries + 1} attempt(s): ${
        lastError?.message ?? 'unknown error'
      }`
    );
  }

  private normalizeEnvelope(body: ThreadsSearchResponse | undefined): ThreadsSearchResponse {
    if (body === null || body === undefined || !Array.isArray(body.data)) {
      return { data: [], paging: body?.paging };
    }
    return body;
  }

  private async safeErrorDetail(response: FetchResponseLike): Promise<string> {
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      return body?.error?.message ?? `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}`;
    }
  }

  /**
   * Ensure the access token can never appear in a surfaced error message,
   * even if a lower layer embedded the request URL in its error.
   */
  private sanitizeError(err: unknown): Error {
    const message = err instanceof Error ? err.message : String(err);
    const scrubbed = message.split(this.accessToken).join('[REDACTED]');
    return new Error(scrubbed);
  }

  private delay(attempt: number): Promise<void> {
    if (this.retryDelayMs <= 0) return Promise.resolve();
    // Simple linear backoff; kept minimal on purpose.
    const wait = this.retryDelayMs * (attempt + 1);
    return new Promise((resolve) => setTimeout(resolve, wait));
  }

  // ---------------------------------------------------------------------------
  // Mapping: ThreadsPost -> NormalizedContent
  // ---------------------------------------------------------------------------

  private mapPost(post: ThreadsPost): NormalizedContent {
    const timestamp = this.parseTimestamp(post.timestamp);

    return {
      contentId: post.id,
      sourceId: THREADS_SOURCE_ID,
      // username is the stable, human-meaningful identifier available from the
      // keyword_search response; fall back to the post id if absent.
      authorId: post.username ?? post.id,
      text: post.text ?? '',
      timestamp,
      permalink: post.permalink ?? '',
      contentType: post.is_reply === true ? 'comment' : 'post',
      metadata: {
        mediaType: post.media_type,
        username: post.username,
        hasReplies: post.has_replies,
        isQuotePost: post.is_quote_post,
        isReply: post.is_reply,
      },
    };
  }

  private parseTimestamp(raw: string | undefined): Date {
    if (raw === undefined || raw.length === 0) {
      return new Date(0);
    }
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) {
      // Try unix-seconds form.
      const asNumber = Number(raw);
      if (Number.isFinite(asNumber)) {
        return new Date(asNumber * 1000);
      }
      return new Date(0);
    }
    return parsed;
  }
}
