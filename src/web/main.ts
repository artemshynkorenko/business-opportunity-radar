import { createDemoServer } from './server.js';
import type { OAuthFetch } from './threads-oauth.js';

/**
 * Entry point for the Meta Review Demo web app.
 *
 * Configuration is read from the environment (server-side only). Run with:
 *   npm run demo
 * which loads .env via --env-file-if-exists. No secrets are ever sent to the
 * browser or committed to the repo.
 *
 * Required env:
 *   THREADS_CLIENT_ID
 *   THREADS_CLIENT_SECRET
 *   THREADS_REDIRECT_URI   (e.g. https://your-host/auth/threads/callback)
 * Optional:
 *   PORT (default 3000)
 */
function main(): void {
  const clientId = process.env.THREADS_CLIENT_ID;
  const clientSecret = process.env.THREADS_CLIENT_SECRET;
  const redirectUri = process.env.THREADS_REDIRECT_URI;
  const port = Number(process.env.PORT ?? '3000');

  if (!clientId || !clientSecret || !redirectUri) {
    console.error(
      'Missing Threads OAuth configuration. Set THREADS_CLIENT_ID, THREADS_CLIENT_SECRET and THREADS_REDIRECT_URI in your environment (or .env).'
    );
    process.exitCode = 1;
    return;
  }

  const globalFetch = globalThis.fetch as unknown as OAuthFetch | undefined;
  if (globalFetch === undefined) {
    console.error('No global fetch available in this runtime.');
    process.exitCode = 1;
    return;
  }

  const server = createDemoServer({
    oauthConfig: { clientId, clientSecret, redirectUri },
    oauthFetch: globalFetch,
  });

  server.listen(port, () => {
    console.log(`Business Opportunity Radar demo listening on http://localhost:${port}`);
  });
}

main();
