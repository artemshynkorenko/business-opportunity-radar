import { randomBytes } from 'node:crypto';

/**
 * Minimal server-side Threads OAuth helper (read-only).
 *
 * Requests ONLY the scopes required for this demo:
 *   - threads_basic
 *   - threads_keyword_search
 *
 * No publishing/reply/like/mention/manage scopes are ever requested. The
 * access token is exchanged and held server-side; it is never sent to the
 * browser. OAuth `state` is generated server-side and validated on callback to
 * prevent CSRF.
 */

/** The only scopes this application requests. Keep this list minimal. */
export const THREADS_SCOPES = ['threads_basic', 'threads_keyword_search'] as const;

const AUTHORIZE_URL = 'https://threads.net/oauth/authorize';
const TOKEN_URL = 'https://graph.threads.net/oauth/access_token';

export interface ThreadsOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Minimal fetch signature (Node 18+ global fetch is compatible). */
export type OAuthFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

/** Generate a cryptographically-random state token for CSRF protection. */
export function generateOAuthState(): string {
  return randomBytes(32).toString('hex');
}

/** Build the Threads authorize URL for the given state. */
export function buildAuthorizeUrl(config: ThreadsOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: THREADS_SCOPES.join(','),
    response_type: 'code',
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export interface TokenExchangeResult {
  accessToken: string;
  userId?: string;
}

/**
 * Exchange an authorization code for a short-lived access token.
 * The token is returned to the caller (server) only — never logged.
 */
export async function exchangeCodeForToken(
  config: ThreadsOAuthConfig,
  code: string,
  fetchImpl: OAuthFetch
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code,
  }).toString();

  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    // Do not include the request body (which contains the client secret).
    throw new Error(`Threads token exchange failed with status ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string; user_id?: string | number };
  if (typeof data.access_token !== 'string' || data.access_token.length === 0) {
    throw new Error('Threads token exchange returned no access token');
  }

  return {
    accessToken: data.access_token,
    userId: data.user_id !== undefined ? String(data.user_id) : undefined,
  };
}
