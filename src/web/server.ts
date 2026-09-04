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
  /** Pending OAuth state tokens awaiting callback (CSRF protection). */
  pendingStates: Set<string>;
}

export function createDemoState(): DemoState {
  return { pendingStates: new Set<string>() };
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
    // Home / intent form.
    if (method === 'GET' && url.pathname === '/') {
      send(res, 200, renderHome({ threadsConnected: state.accessToken !== undefined }));
      return;
    }

    // Start Threads OAuth (read-only scopes only).
    if (method === 'GET' && url.pathname === '/auth/threads') {
      const oauthState = generateOAuthState();
      state.pendingStates.add(oauthState);
      redirect(res, buildAuthorizeUrl(deps.oauthConfig, oauthState));
      return;
    }

    // OAuth callback: validate state (CSRF), exchange code server-side.
    if (method === 'GET' && url.pathname === '/auth/threads/callback') {
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      if (!returnedState || !state.pendingStates.has(returnedState)) {
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
      redirect(res, '/');
      return;
    }

    // Run a search from the user's intent.
    if (method === 'POST' && url.pathname === '/search') {
      if (state.accessToken === undefined) {
        send(res, 403, renderError('Threads is not connected. Please connect a Threads account first.'));
        return;
      }
      const form = await readFormBody(req);
      const intent = (form.get('intent') ?? '').trim();
      if (intent.length === 0) {
        send(res, 400, renderError('Please describe what you are looking for.'));
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
