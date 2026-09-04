import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  handleRequest,
  createDemoState,
  type ServerDeps,
  type DemoState,
} from '../../src/web/server.js';
import { deriveSearchStrategy } from '../../src/web/intent-to-strategy.js';
import { OpportunitySearchService } from '../../src/web/opportunity-search-service.js';
import {
  THREADS_SCOPES,
  buildAuthorizeUrl,
  exchangeCodeForToken,
} from '../../src/web/threads-oauth.js';
import type { FetchResponseLike, FetchLike } from '../../src/sources/threads/index.js';
import type { ThreadsSearchResponse, ThreadsPost } from '../../src/sources/threads/types.js';

/**
 * Deterministic tests for the Meta Review Demo web app.
 * No live Threads content: all HTTP is mocked via injected fetch.
 */

// --- Test doubles ---------------------------------------------------------

interface CapturedResponse {
  status: number;
  headers: Record<string, string | number | string[]>;
  body: string;
}

/** A minimal mock ServerResponse capturing what the handler writes. */
function mockRes(): ServerResponse & { captured: CapturedResponse } {
  const captured: CapturedResponse = { status: 0, headers: {}, body: '' };
  const res = {
    captured,
    writeHead(status: number, headers?: Record<string, string | number | string[]>) {
      captured.status = status;
      if (headers) captured.headers = headers;
      return this;
    },
    end(chunk?: string) {
      if (chunk) captured.body += chunk;
      return this;
    },
  } as unknown as ServerResponse & { captured: CapturedResponse };
  return res;
}

/** A GET request mock. */
function mockGet(path: string): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  req.method = 'GET';
  req.url = path;
  return req;
}

/** A POST request mock that emits a urlencoded body. */
function mockPost(path: string, body: string): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  req.method = 'POST';
  req.url = path;
  // Emit the body asynchronously so the handler's listeners attach first.
  queueMicrotask(() => {
    req.emit('data', Buffer.from(body, 'utf8'));
    req.emit('end');
  });
  return req;
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
    id: 'p1',
    text: 'We are a Thai manufacturer looking for a European distributor to expand into the EU market.',
    media_type: 'TEXT',
    permalink: 'https://www.threads.net/@thmfg/post/p1',
    timestamp: '2026-08-01T00:00:00+0000',
    username: 'thmfg',
    ...overrides,
  };
}

const OAUTH_CONFIG = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://demo.test/auth/threads/callback',
};

/** Threads adapter fetch that always returns one strong opportunity post. */
const strongThreadsFetch: FetchLike = async () =>
  jsonResponse({ data: [makePost()] } satisfies ThreadsSearchResponse);

function baseDeps(overrides: Partial<ServerDeps> = {}): ServerDeps {
  return {
    oauthConfig: OAUTH_CONFIG,
    oauthFetch: async () => jsonResponse({ access_token: 'server-side-token', user_id: 42 }),
    threadsFetch: strongThreadsFetch,
    ...overrides,
  };
}

async function run(
  req: IncomingMessage,
  state: DemoState,
  deps: ServerDeps
): Promise<CapturedResponse> {
  const res = mockRes();
  await handleRequest(req, res, state, deps);
  return res.captured;
}

// ===========================================================================

describe('Web demo — intent form', () => {
  it('renders the initial intent form with the Discovery Radar branding and Discover button', async () => {
    const out = await run(mockGet('/'), createDemoState(), baseDeps());
    expect(out.status).toBe(200);
    expect(out.body).toContain('Discovery Radar');
    expect(out.body).toContain('Discover interesting people, conversations and possibilities.');
    expect(out.body).toContain('What are you looking for?');
    expect(out.body).toContain('<textarea');
    // Primary action renamed to "Discover".
    expect(out.body).toContain('>Discover</button>');
    // Old product name / tagline / action copy must be gone from the UI.
    expect(out.body).not.toContain('Business Opportunity Radar');
    expect(out.body).not.toContain('Find opportunities');
    expect(out.body).not.toContain('Discover potentially valuable opportunities from public conversations.');
  });

  it('uses the neutral, non-commercial example (no business/market copy)', async () => {
    const out = await run(mockGet('/'), createDemoState(), baseDeps());
    expect(out.body).toContain('silkworm-larvae enthusiasts in Thailand');
    expect(out.body).not.toContain('Thai manufacturers who want to expand into Europe');
  });

  it('never disables the intent textarea or the Discover button when Threads is not connected', async () => {
    const out = await run(mockGet('/'), createDemoState(), baseDeps());
    // The textarea and button carry no `disabled` attribute.
    const textareaTag = out.body.slice(out.body.indexOf('<textarea'), out.body.indexOf('</textarea>'));
    expect(textareaTag).not.toContain('disabled');
    expect(out.body).not.toMatch(/<button[^>]*disabled/);
  });

  it('shows the secondary Threads connection notice with the new copy when not connected', async () => {
    const out = await run(mockGet('/'), createDemoState(), baseDeps());
    expect(out.body).toContain('Connect Threads to search public conversations');
    expect(out.body).toContain(
      "Radar uses your Threads connection to find conversations that may contain opportunities relevant to what you're looking for. Your Threads account is used for read-only access."
    );
    expect(out.body).toContain('Connect Threads');
    // The connection notice uses the neutral high-contrast block, not the old
    // yellow banner.
    expect(out.body).toContain('class="notice"');
    expect(out.body).not.toContain('class="banner"');
    // Stale/technical copy must be gone.
    expect(out.body).not.toContain('To search public Threads posts, connect a Threads account');
  });

  it('places the intent form ABOVE the secondary connection notice', async () => {
    const out = await run(mockGet('/'), createDemoState(), baseDeps());
    const intentIdx = out.body.indexOf('What are you looking for?');
    const noticeIdx = out.body.indexOf('Connect Threads to search public conversations');
    expect(intentIdx).toBeGreaterThan(-1);
    expect(noticeIdx).toBeGreaterThan(-1);
    expect(intentIdx).toBeLessThan(noticeIdx);
  });

  it('does not show the connection notice once connected', async () => {
    const state = createDemoState();
    state.accessToken = 'server-side-token';
    const out = await run(mockGet('/'), state, baseDeps());
    expect(out.body).not.toContain('Connect Threads');
    expect(out.body).not.toContain('class="notice"');
  });
});

describe('Web demo — OAuth flow', () => {
  it('requests ONLY read-only scopes threads_basic and threads_keyword_search', () => {
    const url = buildAuthorizeUrl(OAUTH_CONFIG, 'abc');
    const scope = new URL(url).searchParams.get('scope');
    expect(scope).toBe('threads_basic,threads_keyword_search');
    // Guard against accidental mutation scopes.
    expect(url).not.toMatch(/publish|write|manage|reply|delete/i);
    expect([...THREADS_SCOPES]).toEqual(['threads_basic', 'threads_keyword_search']);
  });

  it('/auth/threads redirects to the authorize URL and stores a pending state', async () => {
    const state = createDemoState();
    const out = await run(mockGet('/auth/threads'), state, baseDeps());
    expect(out.status).toBe(302);
    const location = out.headers['Location'] as string;
    expect(location).toContain('threads.net/oauth/authorize');
    expect(state.pendingStates.size).toBe(1);
    // The redirect carries the generated state.
    const sentState = new URL(location).searchParams.get('state');
    expect(state.pendingStates.has(sentState!)).toBe(true);
  });

  it('rejects a callback with an unknown state (CSRF protection)', async () => {
    const state = createDemoState();
    const out = await run(
      mockGet('/auth/threads/callback?code=xyz&state=forged'),
      state,
      baseDeps()
    );
    expect(out.status).toBe(400);
    expect(out.body).toMatch(/CSRF|invalid/i);
    expect(state.accessToken).toBeUndefined();
  });

  it('completes a valid callback: exchanges code server-side and stores token', async () => {
    const state = createDemoState();
    // First start OAuth to register a valid state.
    const start = await run(mockGet('/auth/threads'), state, baseDeps());
    const validState = new URL(start.headers['Location'] as string).searchParams.get('state')!;

    const out = await run(
      mockGet(`/auth/threads/callback?code=realcode&state=${validState}`),
      state,
      baseDeps()
    );
    expect(out.status).toBe(302);
    expect(out.headers['Location']).toBe('/');
    // Token is held server-side and never appears in any response body.
    expect(state.accessToken).toBe('server-side-token');
    expect(start.body).not.toContain('server-side-token');
  });

  it('state is single-use: a replayed callback is rejected', async () => {
    const state = createDemoState();
    const start = await run(mockGet('/auth/threads'), state, baseDeps());
    const validState = new URL(start.headers['Location'] as string).searchParams.get('state')!;
    await run(mockGet(`/auth/threads/callback?code=c&state=${validState}`), state, baseDeps());
    const replay = await run(
      mockGet(`/auth/threads/callback?code=c&state=${validState}`),
      state,
      baseDeps()
    );
    expect(replay.status).toBe(400);
  });

  it('exchangeCodeForToken never surfaces the client secret on failure', async () => {
    const failing: ServerDeps['oauthFetch'] = async () => jsonResponse({ error: 'bad' }, 400);
    let error: Error | undefined;
    try {
      await exchangeCodeForToken(OAUTH_CONFIG, 'code', failing);
    } catch (e) {
      error = e as Error;
    }
    expect(error).toBeDefined();
    expect(error?.message).not.toContain(OAUTH_CONFIG.clientSecret);
  });
});

describe('Web demo — intent → search-query derivation', () => {
  it('derives hypotheses and bounded queries from a natural-language intent', () => {
    const strategy = deriveSearchStrategy(
      "I'm looking for Thai manufacturers who want to expand into Europe and may be looking for a local partner.",
      { maxQueries: 6 }
    );
    expect(strategy.queries.length).toBeGreaterThan(0);
    expect(strategy.queries.length).toBeLessThanOrEqual(6);
    expect(strategy.hypotheses.length).toBeGreaterThan(0);
    // The user's raw text is not required to contain API keywords; the strategy
    // produces them. Matched families should include partner/market-entry/sourcing.
    const ids = strategy.signalFamilies.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['seeking-partner']));
    expect(ids.some((id) => id === 'market-entry' || id === 'sourcing')).toBe(true);
  });

  it('rejects empty intent', () => {
    expect(() => deriveSearchStrategy('   ')).toThrow(/non-empty/i);
  });

  it('falls back to a broad family when nothing specific matches', () => {
    const strategy = deriveSearchStrategy('something interesting');
    expect(strategy.queries.length).toBeGreaterThan(0);
  });
});

describe('Web demo — retrieval wiring + pipeline + cards', () => {
  it('processes retrieved Threads content through the pipeline into opportunity views', async () => {
    const service = new OpportunitySearchService({
      accessToken: 'server-side-token',
      fetchImpl: strongThreadsFetch,
    });
    const result = await service.search('Thai manufacturer looking for a European distributor');
    expect(result.contentFetched).toBeGreaterThan(0);
    expect(result.opportunities.length).toBeGreaterThan(0);
    const top = result.opportunities[0];
    expect(top.score).toBeGreaterThan(0);
    expect(top.opportunityType).toBeTruthy();
    expect(top.whyRelevant).toBeTruthy();
    // Original Threads permalink is preserved end-to-end.
    expect(top.threadsUrl).toBe('https://www.threads.net/@thmfg/post/p1');
  });

  it('does not call Threads directly — uses the adapter (mock fetch is the only HTTP)', async () => {
    let calls = 0;
    const countingFetch: FetchLike = async (url) => {
      calls++;
      expect(url).toContain('/keyword_search');
      return jsonResponse({ data: [makePost()] });
    };
    const service = new OpportunitySearchService({
      accessToken: 'tkn',
      fetchImpl: countingFetch,
    });
    await service.search('distributor partner in Europe');
    expect(calls).toBeGreaterThan(0);
  });

  it('renders opportunity cards with a View on Threads link via POST /search', async () => {
    const state = createDemoState();
    state.accessToken = 'server-side-token';
    const out = await run(
      mockPost('/search', 'intent=' + encodeURIComponent('Thai manufacturer seeking EU distributor')),
      state,
      baseDeps()
    );
    expect(out.status).toBe(200);
    expect(out.body).toContain('Potential opportunities');
    expect(out.body).toContain('View on Threads');
    expect(out.body).toContain('https://www.threads.net/@thmfg/post/p1');
    // The processing/strategy state is shown to the reviewer.
    expect(out.body).toContain('Understanding your request');
    expect(out.body).toContain('Searched Threads');
  });

  it('POST /search without a connection preserves the intent and prompts to connect (no dead-end)', async () => {
    const intent = 'silkworm-larvae enthusiasts in Thailand';
    const out = await run(
      mockPost('/search', 'intent=' + encodeURIComponent(intent)),
      createDemoState(),
      baseDeps()
    );
    // Not a dead-end error: it re-renders the home page (200).
    expect(out.status).toBe(200);
    // The typed intent is preserved in the textarea.
    expect(out.body).toContain(intent);
    // It explains a connection is required and offers Connect Threads.
    expect(out.body).toContain('Connect Threads to search public conversations');
    expect(out.body).toMatch(/kept what you typed/i);
  });

  it('empty intent on /search returns a helpful error', async () => {
    const state = createDemoState();
    state.accessToken = 'server-side-token';
    const out = await run(mockPost('/search', 'intent='), state, baseDeps());
    expect(out.status).toBe(400);
  });

  it('never leaks the access token into any rendered HTML', async () => {
    const state = createDemoState();
    state.accessToken = 'super-secret-token-value';
    const out = await run(
      mockPost('/search', 'intent=' + encodeURIComponent('EU distributor')),
      state,
      baseDeps()
    );
    expect(out.body).not.toContain('super-secret-token-value');
  });
});

describe('Web demo — intent survives the OAuth round trip', () => {
  it('carries the intent from the connect form through OAuth and restores it on return', async () => {
    const state = createDemoState();
    const intent = "I'm looking for fellow silkworm-larvae enthusiasts in Thailand";

    // 1. User tries to Discover while disconnected → home re-rendered with a
    //    connect form that carries the intent as a hidden field.
    const blocked = await run(
      mockPost('/search', 'intent=' + encodeURIComponent(intent)),
      state,
      baseDeps()
    );
    expect(blocked.body).toContain(`name="intent" value="${intent}"`.replace(/'/g, '&#39;'));

    // 2. Start OAuth carrying that intent.
    const start = await run(
      mockGet('/auth/threads?intent=' + encodeURIComponent(intent)),
      state,
      baseDeps()
    );
    const validState = new URL(start.headers['Location'] as string).searchParams.get('state')!;
    // The intent is stored server-side with the pending state (not in the browser).
    expect(state.pendingStates.get(validState)?.intent).toBe(intent);

    // 3. Complete the callback → redirect restores the intent via query param.
    const cb = await run(
      mockGet(`/auth/threads/callback?code=c&state=${validState}`),
      state,
      baseDeps()
    );
    expect(cb.status).toBe(302);
    const location = cb.headers['Location'] as string;
    expect(location).toContain('/?intent=');
    expect(decodeURIComponent(new URL(location, 'http://x').searchParams.get('intent')!)).toBe(intent);

    // 4. GET / with the restored intent pre-fills the textarea (HTML-escaped);
    //    user is connected now.
    const home = await run(mockGet(location), state, baseDeps());
    expect(home.body).toContain('silkworm-larvae enthusiasts in Thailand');
    // Connected now → no connection notice.
    expect(home.body).not.toContain('Connect Threads');
  });

  it('OAuth with no prior intent redirects to plain "/"', async () => {
    const state = createDemoState();
    const start = await run(mockGet('/auth/threads'), state, baseDeps());
    const validState = new URL(start.headers['Location'] as string).searchParams.get('state')!;
    const cb = await run(
      mockGet(`/auth/threads/callback?code=c&state=${validState}`),
      state,
      baseDeps()
    );
    expect(cb.headers['Location']).toBe('/');
  });
});
