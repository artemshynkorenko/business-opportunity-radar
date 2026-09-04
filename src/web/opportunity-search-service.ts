import type { UserProfile, OpportunityCard } from '../domain/index.js';
import {
  ThreadsSearchAdapter,
  type ThreadsSearchAdapterConfig,
} from '../sources/threads/threads-search-adapter.js';
import {
  buildDefaultThreadsPipeline,
  minimalThreadsAuthorResolver,
} from '../sources/threads/build-threads-pipeline.js';
import { ThreadsPipelineRunner } from '../sources/threads/threads-pipeline-runner.js';
import { THREADS_SOURCE_ID } from '../sources/threads/threads-search-adapter.js';
import { deriveSearchStrategy, type SearchStrategy } from './intent-to-strategy.js';

/** A compact, render-ready view of one opportunity card for the demo UI. */
export interface OpportunityView {
  situationId: string;
  summary: string;
  opportunityType: string;
  score: number;
  whyRelevant: string;
  threadsUrl: string;
}

export interface OpportunitySearchResult {
  strategy: SearchStrategy;
  /** Total content items fetched from Threads across all queries. */
  contentFetched: number;
  opportunities: OpportunityView[];
}

export interface OpportunitySearchOptions {
  /** Active user profile (defaults to ARTEM_PROFILE inside the pipeline builder). */
  profile?: UserProfile;
  /** Per-query result cap (Threads max 100; demo keeps this small). Default 10. */
  perQueryLimit?: number;
  /** Max number of derived queries to execute. Default 4. */
  maxQueries?: number;
}

/**
 * Orchestrates the demo search:
 *
 *   intent → deriveSearchStrategy → ThreadsSearchAdapter (RECENT, bounded)
 *          → existing ThreadsPipelineRunner (core pipeline) → opportunity views
 *
 * The Threads access token is provided via ThreadsSearchAdapterConfig and never
 * leaves the server. This service does NOT call Threads directly — it always
 * goes through the existing ThreadsSearchAdapter and ThreadsPipelineRunner.
 */
export class OpportunitySearchService {
  /**
   * @param adapterConfig config passed to the ThreadsSearchAdapter (token,
   *   fetch impl for tests, bounds). The token stays server-side.
   */
  constructor(private readonly adapterConfig: ThreadsSearchAdapterConfig) {}

  async search(intent: string, options: OpportunitySearchOptions = {}): Promise<OpportunitySearchResult> {
    const perQueryLimit = Math.min(options.perQueryLimit ?? 10, 10);
    const maxQueries = options.maxQueries ?? 4;

    const strategy = deriveSearchStrategy(intent, {
      maxQueries,
      profile: options.profile,
    });

    // Bounded adapter: RECENT for deterministic demo behavior, single page,
    // small item cap. Callers supply the token via adapterConfig.
    const adapter = new ThreadsSearchAdapter({
      maxPages: 1,
      maxItems: perQueryLimit,
      maxRetries: 1,
      ...this.adapterConfig,
    });

    const pipeline = buildDefaultThreadsPipeline({
      authorResolver: minimalThreadsAuthorResolver(THREADS_SOURCE_ID),
      userProfile: options.profile,
    });
    const runner = new ThreadsPipelineRunner(adapter, pipeline);

    const seenSituationIds = new Set<string>();
    const opportunities: OpportunityView[] = [];
    let contentFetched = 0;

    for (const query of strategy.queries) {
      const result = await runner.run({
        q: query,
        searchType: 'RECENT',
        limit: perQueryLimit,
      });
      contentFetched += result.contentFetched;

      for (const card of result.pipeline.cards) {
        if (seenSituationIds.has(card.situationId)) continue;
        seenSituationIds.add(card.situationId);
        opportunities.push(toView(card));
      }
    }

    // Highest opportunity score first.
    opportunities.sort((a, b) => b.score - a.score);

    return { strategy, contentFetched, opportunities };
  }
}

function toView(card: OpportunityCard): OpportunityView {
  return {
    situationId: card.situationId,
    summary: card.summary,
    opportunityType: card.opportunityType,
    score: card.score,
    whyRelevant: card.whyRelevant,
    threadsUrl: card.sourceLink,
  };
}
