import type { NormalizedContent } from '../../domain/index.js';
import type { PipelineResult } from '../../pipeline/pipeline-result.js';
import { Pipeline } from '../../pipeline/pipeline.js';
import { ThreadsSearchAdapter, THREADS_SOURCE_ID } from './threads-search-adapter.js';
import type { ThreadsSearchOptions } from './types.js';

/**
 * Source-level information about a Threads pipeline run, returned alongside the
 * existing core PipelineResult so a caller can inspect what the source produced
 * before the core processed it.
 */
export interface ThreadsPipelineRunResult {
  /** The keyword that was searched. */
  keyword: string;
  /** The exact search options passed to the adapter. */
  optionsUsed: ThreadsSearchOptions;
  /** How many NormalizedContent items the adapter returned (pre-pipeline). */
  contentFetched: number;
  /** The unchanged result of the core Pipeline. */
  pipeline: PipelineResult;
}

/**
 * Thin orchestration layer connecting the Threads source adapter to the core
 * Pipeline.
 *
 * Responsibilities (and nothing more):
 *   1. call ThreadsSearchAdapter.search(options)
 *   2. hand the resulting NormalizedContent[] to the core Pipeline
 *      (with sourceId "threads")
 *   3. return the core PipelineResult plus source-level run info
 *
 * It owns NO core logic. Detection, extraction, scoring, matching, card
 * formatting, and persistence all live in the injected Pipeline. The adapter
 * owns all Threads-specific request/mapping behavior. This class only wires the
 * two together.
 */
export class ThreadsPipelineRunner {
  constructor(
    private readonly adapter: ThreadsSearchAdapter,
    private readonly pipeline: Pipeline
  ) {}

  /**
   * Fetch content from Threads for the given search options and run it through
   * the core pipeline. Errors from the adapter (including API failures) are
   * propagated unchanged; the adapter already scrubs the access token from its
   * error messages, so nothing sensitive is surfaced here.
   */
  async run(options: ThreadsSearchOptions): Promise<ThreadsPipelineRunResult> {
    const content: NormalizedContent[] = await this.adapter.search(options);

    const pipelineResult = await this.pipeline.run(content, THREADS_SOURCE_ID);

    return {
      keyword: options.q,
      optionsUsed: options,
      contentFetched: content.length,
      pipeline: pipelineResult,
    };
  }
}
