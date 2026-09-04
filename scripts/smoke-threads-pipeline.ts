/**
 * Developer-only LIVE integration smoke test for the full Threads chain:
 *
 *   Threads API
 *       -> ThreadsSearchAdapter
 *       -> NormalizedContent[]
 *       -> ThreadsPipelineRunner
 *       -> core Pipeline
 *       -> Situation / OpportunityCard
 *
 * This is SEPARATE from `scripts/smoke-threads.ts`, which tests only the
 * adapter. This script exercises the adapter AND the core pipeline together.
 * It is NOT part of the automated test suite.
 *
 * Usage:
 *   npm run smoke:threads:pipeline -- "manufacturer"
 *   (reads THREADS_ACCESS_TOKEN from .env via --env-file-if-exists)
 *
 * Safety properties:
 *   - The access token is read by the adapter from THREADS_ACCESS_TOKEN.
 *     This script never reads, prints, or embeds the token.
 *   - Bounded to a tiny request: limit 10, maxPages 1, maxItems 10.
 *   - Uses in-memory persistence only; no database, no external side effects.
 */

import {
  ThreadsSearchAdapter,
  ThreadsPipelineRunner,
  buildDefaultThreadsPipeline,
  minimalThreadsAuthorResolver,
  THREADS_SOURCE_ID,
} from '../src/sources/threads/index.js';
import { SituationRepository } from '../src/persistence/repositories.js';

const DEFAULT_KEYWORD = 'manufacturer';
const HARD_LIMIT = 10;

function resolveKeyword(argv: string[]): string {
  const arg = argv.slice(2).find((a) => a.trim().length > 0);
  return arg?.trim() ?? DEFAULT_KEYWORD;
}

async function main(): Promise<void> {
  const keyword = resolveKeyword(process.argv);

  // The adapter reads THREADS_ACCESS_TOKEN itself; the token never enters this
  // script's scope. Bounds are tight for a safe single-page probe.
  let adapter: ThreadsSearchAdapter;
  try {
    adapter = new ThreadsSearchAdapter({
      maxPages: 1,
      maxItems: HARD_LIMIT,
      maxRetries: 1,
    });
  } catch (err) {
    console.error(`Smoke test aborted: ${err instanceof Error ? err.message : String(err)}`);
    console.error('Set THREADS_ACCESS_TOKEN in your environment (or .env) and retry.');
    process.exitCode = 1;
    return;
  }

  // In-memory persistence only — suitable for local testing, no database.
  const repository = new SituationRepository();
  const pipeline = buildDefaultThreadsPipeline({
    authorResolver: minimalThreadsAuthorResolver(THREADS_SOURCE_ID),
    situationRepository: repository,
  });
  const runner = new ThreadsPipelineRunner(adapter, pipeline);

  console.log('Threads LIVE integration smoke test (adapter -> pipeline)');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`  keyword   : "${keyword}"`);
  console.log(`  limit     : ${HARD_LIMIT}  (maxPages 1, maxItems ${HARD_LIMIT})`);
  console.log('  endpoint  : https://graph.threads.net/v1.0/keyword_search');

  let result;
  try {
    result = await runner.run({ q: keyword, searchType: 'RECENT', limit: HARD_LIMIT });
  } catch (err) {
    // The adapter scrubs the token from its error messages.
    console.error(`\nRun failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
    return;
  }

  const { pipeline: pr } = result;

  for (let i = 0; i < pr.cards.length; i++) {
    const card = pr.cards[i];
    console.log(`\n[card ${i + 1}]`);
    console.log(`  type       : ${card.opportunityType}`);
    console.log(`  score      : ${card.score}/100`);
    console.log(`  geography  : ${card.geography}`);
    console.log(`  summary    : ${card.summary}`);
    console.log(`  authorNeed : ${card.authorNeed}`);
    console.log(`  sourceLink : ${card.sourceLink}`);
  }

  console.log('\nSummary');
  console.log('───────');
  console.log(`  keyword               : "${keyword}"`);
  console.log(`  content fetched       : ${result.contentFetched}`);
  console.log(`  content processed     : ${pr.scanRun.contentProcessed}`);
  console.log(`  candidates found      : ${pr.scanRun.candidatesFound}`);
  console.log(`  situations created    : ${pr.situations.length}`);
  console.log(`  cards produced        : ${pr.cards.length}`);
  console.log(`  duplicates skipped    : ${pr.duplicatesSkipped}`);
  console.log(`  errors                : ${pr.scanRun.errors.length}`);
  console.log(`  persisted (in-memory) : ${(await repository.findAll()).length}`);
  if (pr.scanRun.errors.length > 0) {
    console.log('\n  error details:');
    for (const e of pr.scanRun.errors) console.log(`    - ${e}`);
  }
}

main().catch((err) => {
  console.error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
