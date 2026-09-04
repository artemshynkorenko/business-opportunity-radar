/**
 * Threads API — source-specific types.
 *
 * These types are intentionally isolated to the Threads adapter. They describe
 * the shape of the official Threads keyword_search endpoint request/response
 * and MUST NOT leak into the source-independent core domain.
 *
 * Endpoint: https://graph.threads.net/v1.0/keyword_search
 * Docs: https://developers.facebook.com/docs/threads
 */

/** Threads media type values as returned/accepted by the API. */
export type ThreadsMediaType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'AUDIO' | 'REPOST_FACADE';

/** search_type parameter accepted by keyword_search. */
export type ThreadsSearchType = 'TOP' | 'RECENT';

/**
 * Public search options for a keyword search.
 * These map directly onto the documented Threads API query parameters.
 */
export interface ThreadsSearchOptions {
  /** Required search keyword/phrase. Must be non-empty. */
  q: string;
  /** TOP (default, ranked) or RECENT (chronological). Maps to `search_type`. */
  searchType?: ThreadsSearchType;
  /** Optional server-side search mode. Maps to `search_mode`. */
  searchMode?: string;
  /** Restrict to a media type. Maps to `media_type`. */
  mediaType?: ThreadsMediaType;
  /** Lower bound (inclusive) on post time. ISO 8601 string or unix seconds. Maps to `since`. */
  since?: string;
  /** Upper bound (inclusive) on post time. ISO 8601 string or unix seconds. Maps to `until`. */
  until?: string;
  /** Page size. Threads API maximum is 100. Maps to `limit`. */
  limit?: number;
  /** Restrict to a single author handle. Maps to `author_username`. */
  authorUsername?: string;
}

/**
 * Fields requested from and returned by the Threads keyword_search endpoint
 * for each matched post. Optional fields may be absent in a response.
 */
export interface ThreadsPost {
  id: string;
  text?: string;
  media_type?: ThreadsMediaType;
  permalink?: string;
  timestamp?: string;
  username?: string;
  has_replies?: boolean;
  is_quote_post?: boolean;
  is_reply?: boolean;
}

/** Cursor-based paging block as returned by the Graph-style API. */
export interface ThreadsPaging {
  cursors?: {
    before?: string;
    after?: string;
  };
  next?: string;
}

/** Envelope returned by keyword_search. */
export interface ThreadsSearchResponse {
  data: ThreadsPost[];
  paging?: ThreadsPaging;
}

/** Error envelope returned by the Threads/Graph API. */
export interface ThreadsErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}
