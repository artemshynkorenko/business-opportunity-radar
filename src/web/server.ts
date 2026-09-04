import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  generateOAuthState,
  type OAuthFetch,
  type ThreadsOAuthConfig,
} from './threads-oauth.js';
import { OpportunitySearchService } from './opportunity-search-service.js';
import { renderHome, renderResults, renderError } from './views.js';

/**
 * Minimal Meta Review Demo server (Node built-in http; no web framework).
 *
 * Product principle: the user describes what they want to discover; the Radar
 * derives the Threads search strategy and keyword queries internally. The
 * Threads access token is held SERVER-SIDE only and never sent to the browser.
 *
 * State is intentionally minimal (single-user demo): one in-memory session
 * holding the token, and a set of pending OAuth `state` values for CSRF checks.
 */

export interface ServerDeps {
  oauthConfig: ThreadsOAuthConfig;
  /** fetch used for the OAuth token exchange (injectable for tests). */
  oauthFetch: OAuthFetch;
  /** fetch used by the Threads adapter (injectable for tests). */
  threadsFetch?: import('../sources/threads/threads-search-adapter.js').FetchLike;
}

export interface DemoState {
  /** Server-side Threads access token (never exposed to the browser). */
  accessToken?: string;
  /**
   * Pending OAuth states awaiting callback (CSRF protection). The value carries
   * the intent the user typed before connecting, so it survives the round trip.
   */
  pendingStates: Map<string, { intent: string }>;
}

export function createDemoState(): DemoState {
  return { pendingStates: new Map<string, { intent: string }>() };
}

/** Read and parse a urlencoded request body (bounded to avoid abuse). */
async function readFormBody(req: IncomingMessage, maxBytes = 64 * 1024): Promise<URLSearchParams> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(new URLSearchParams(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function redirect(res: ServerResponse, location: string): void {
  res.writeHead(302, { Location: location });
  res.end();
}

/**
 * Handle a single request. Exposed for deterministic testing without opening a
 * socket. `state` and `deps` are injected.
 */
export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  state: DemoState,
  deps: ServerDeps
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const method = req.method ?? 'GET';

  try {
    // Home / intent form. Restores a prior intent (e.g. after OAuth) when
    // provided via the `intent` query param.
    if (method === 'GET' && url.pathname === '/') {
      const intent = url.searchParams.get('intent') ?? undefined;
      send(res, 200, renderHome({ threadsConnected: state.accessToken !== undefined, intent }));
      return;
    }

    // Start Threads OAuth (read-only scopes only). Carries the user's intent
    // through the round trip so it is restored automatically on return.
    if (method === 'GET' && url.pathname === '/auth/threads') {
      const intent = (url.searchParams.get('intent') ?? '').trim();
      const oauthState = generateOAuthState();
      state.pendingStates.set(oauthState, { intent });
      redirect(res, buildAuthorizeUrl(deps.oauthConfig, oauthState));
      return;
    }

    // OAuth callback: validate state (CSRF), exchange code server-side.
    if (method === 'GET' && url.pathname === '/auth/threads/callback') {
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      const pending = returnedState ? state.pendingStates.get(returnedState) : undefined;
      if (!returnedState || pending === undefined) {
        send(res, 400, renderError('Invalid or missing OAuth state (possible CSRF). Please try connecting again.'));
        return;
      }
      // One-time use.
      state.pendingStates.delete(returnedState);

      if (!code) {
        send(res, 400, renderError('Authorization was not completed (no code returned).'));
        return;
      }

      const { accessToken } = await exchangeCodeForToken(deps.oauthConfig, code, deps.oauthFetch);
      state.accessToken = accessToken; // held server-side only

      // Restore the intent the user typed before connecting (if any) so they
      // never have to retype it. The intent is not sensitive.
      const restore = pending.intent.length > 0 ? `/?intent=${encodeURIComponent(pending.intent)}` : '/';
      redirect(res, restore);
      return;
    }

    // Run a search from the user's intent.
    if (method === 'POST' && url.pathname === '/search') {
      const form = await readFormBody(req);
      const intent = (form.get('intent') ?? '').trim();

      if (intent.length === 0) {
        send(res, 400, renderError('Please describe what you are looking for.'));
        return;
      }

      // If Threads is not connected, do NOT dead-end: keep the intent, explain
      // that a connection is required, and offer Connect Threads (which carries
      // the intent through OAuth so it is restored on return).
      if (state.accessToken === undefined) {
        send(res, 200, renderHome({ threadsConnected: false, intent, pendingConnect: true }));
        return;
      }

      const service = new OpportunitySearchService({
        accessToken: state.accessToken,
        fetchImpl: deps.threadsFetch,
      });

      const result = await service.search(intent);
      send(res, 200, renderResults(result));
      return;
    }

    send(res, 404, renderError('Not found.'));
  } catch (err) {
    // Adapter/OAuth errors already scrub secrets; surface only the message.
    const message = err instanceof Error ? err.message : 'Unexpected error';
    send(res, 500, renderError(message));
  }
}

/** Build (but do not start) the HTTP server. */
export function createDemoServer(deps: ServerDeps): Server {
  const state = createDemoState();
  return createServer((req, res) => {
    void handleRequest(req, res, state, deps);
  });
}
