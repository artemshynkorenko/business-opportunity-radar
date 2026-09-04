/**
 * Developer-only LIVE smoke test for the Threads source adapter.
 *
 * Purpose: manually confirm that ThreadsSearchAdapter can perform ONE real
 * keyword_search request against the official Threads API and map the result
 * into NormalizedContent. This is NOT part of the automated test suite and is
 * NOT wired into the production pipeline.
 *
 * Usage:
 *   THREADS_ACCESS_TOKEN=... npm run smoke:threads -- "manufacturer"
 *
 * Safety properties:
 *   - The access token is read by the adapter from THREADS_ACCESS_TOKEN.
 *     This script never reads, prints, or embeds the token.
 *   - Bounded to a tiny request: limit 10, maxPages 1, maxItems 10.
 *   - Prints only safe fields; nothing is persisted; the pipeline is not run.
 */

import { ThreadsSearchAdapter } from '../src/sources/threads/index.js';
import type {
  FetchLike,
  FetchResponseLike,
} from '../src/sources/threads/index.js';
import type { NormalizedContent } from '../src/domain/index.js';

const DEFAULT_KEYWORD = 'manufacturer';
const HARD_LIMIT = 10;
const TEXT_PREVIEW_CHARS = 160;

/** Parse the keyword from CLI args, falling back to a safe default. */
function resolveKeyword(argv: string[]): string {
  // `npm run smoke:threads -- "foo"` forwards "foo" as an extra arg.
  const arg = argv.slice(2).find((a) => a.trim().length > 0);
  return arg?.trim() ?? DEFAULT_KEYWORD;
}

/** Collapse whitespace and truncate text so console output stays readable. */
function previewText(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= TEXT_PREVIEW_CHARS) return collapsed;
  return `${collapsed.slice(0, TEXT_PREVIEW_CHARS)}…`;
}

/** Print one NormalizedContent using only safe, non-sensitive fields. */
function printResult(index: number, content: NormalizedContent): void {
  console.log(`\n[${index + 1}]`);
  console.log(`  contentId : ${content.contentId}`);
  console.log(`  authorId  : ${content.authorId}`);
  console.log(`  timestamp : ${content.timestamp.toISOString()}`);
  console.log(`  permalink : ${content.permalink || '(none)'}`);
  console.log(`  text      : ${previewText(content.text) || '(empty)'}`);
}

async function main(): Promise<void> {
  const keyword = resolveKeyword(process.argv);

  // Observing fetch wrapper: delegates the real HTTP call to the platform
  // fetch (so the adapter still owns request building + auth), and only
  // inspects the RESPONSE body to detect whether a next-page cursor exists.
  // It never reads or logs the request URL (which carries the token).
  const platformFetch = globalThis.fetch as unknown as FetchLike | undefined;
  if (platformFetch === undefined) {
    console.error('Smoke test failed: no global fetch available in this runtime.');
    process.exitCode = 1;
    return;
  }

  let paginationEncountered = false;
  const observingFetch: FetchLike = async (url, init) => {
    const response = await platformFetch(url, init);
    return {
      ok: response.ok,
      status: response.status,
      text: () => response.text(),
      json: async () => {
        const body = (await response.json()) as { paging?: { next?: string } };
        if (typeof body?.paging?.next === 'string' && body.paging.next.length > 0) {
          paginationEncountered = true;
        }
        return body;
      },
    } as FetchResponseLike;
  };

  // No accessToken passed here on purpose: the adapter reads
  // THREADS_ACCESS_TOKEN from the environment itself. The token never enters
  // this script's scope. Bounds are set tight for a safe single-page probe.
  let adapter: ThreadsSearchAdapter;
  try {
    adapter = new ThreadsSearchAdapter({
      fetchImpl: observingFetch,
      maxPages: 1,
      maxItems: HARD_LIMIT,
      maxRetries: 1,
    });
  } catch (err) {
    // Most likely: missing THREADS_ACCESS_TOKEN. The adapter's message is
    // already token-safe.
    console.error(`Smoke test aborted: ${err instanceof Error ? err.message : String(err)}`);
    console.error('Set THREADS_ACCESS_TOKEN in your environment and retry.');
    process.exitCode = 1;
    return;
  }

  console.log('Threads adapter LIVE smoke test');
  console.log('────────────────────────────────');
  console.log(`  keyword   : "${keyword}"`);
  console.log(`  limit     : ${HARD_LIMIT}  (maxPages 1, maxItems ${HARD_LIMIT})`);
  console.log('  endpoint  : https://graph.threads.net/v1.0/keyword_search');

  let results: NormalizedContent[];
  try {
    results = await adapter.search({
      q: keyword,
      searchType: 'RECENT',
      limit: HARD_LIMIT,
    });
  } catch (err) {
    // The adapter scrubs the token from its error messages.
    console.error(`\nRequest failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
    return;
  }

  for (let i = 0; i < results.length; i++) {
    printResult(i, results[i]);
  }

  console.log('\nSummary');
  console.log('───────');
  console.log(`  keyword               : "${keyword}"`);
  console.log(`  results               : ${results.length}`);
  console.log(`  pagination encountered: ${paginationEncountered ? 'yes' : 'no'}`);
  console.log('  persisted             : no');
  console.log('  pipeline run          : no');
}

main().catch((err) => {
  console.error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
