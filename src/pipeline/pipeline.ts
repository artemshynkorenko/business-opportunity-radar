import type { Author, UserCapability } from '../domain/index.js';
import type { NormalizerInterface } from '../normalization/normalizer-interface.js';
import type { DeduplicatorInterface } from '../deduplication/deduplicator-interface.js';
import type { CandidateDetectorInterface } from '../detection/candidate-detector-interface.js';
import type { SituationExtractorInterface } from '../extraction/situation-extractor-interface.js';
import type { OpportunityScorerInterface } from '../scoring/opportunity-scorer-interface.js';
import type { RelationshipConfidenceCalculatorInterface } from '../scoring/relationship-confidence-interface.js';
import type { UserMatcherInterface } from '../matching/user-matcher-interface.js';
import type { OpportunityCardFormatterInterface } from '../cards/card-formatter-interface.js';
import type { PipelineResult } from './pipeline-result.js';
import type { SituationRepository } from '../persistence/repositories.js';

/**
 * End-to-end pipeline orchestrator.
 *
 * Flow:
 *   rawContents → normalize → deduplicate → detect candidates
 *   → resolve author (async, fault-tolerant)
 *   → extract situations → score → match → format cards → persist (idempotent)
 */
export class Pipeline {
  constructor(
    private readonly normalizer: NormalizerInterface,
    private readonly deduplicator: DeduplicatorInterface,
    private readonly detector: CandidateDetectorInterface,
    private readonly extractor: SituationExtractorInterface,
    private readonly scorer: OpportunityScorerInterface,
    private readonly confidenceCalculator: RelationshipConfidenceCalculatorInterface,
    private readonly matcher: UserMatcherInterface,
    private readonly cardFormatter: OpportunityCardFormatterInterface,
    private readonly authorResolver: (authorId: string) => Promise<Author>,
    private readonly userCapabilities: UserCapability[],
    private readonly situationRepository?: SituationRepository
  ) {}

  async run(rawContents: unknown[], sourceId: string): Promise<PipelineResult> {
    const runId = `run-${Date.now()}`;
    const startedAt = new Date();
    const errors: string[] = [];

    let contentProcessed = 0;
    let candidatesFound = 0;
    let situationsCreated = 0;
    let duplicatesSkipped = 0;

    const situations = [];
    const cards = [];

    for (const raw of rawContents) {
      contentProcessed++;
      const scanRunId = runId;

      try {
        // 1. Normalize
        const content = this.normalizer.normalize(raw, sourceId);

        // 2. Deduplication check
        const dedupResult = this.deduplicator.check(content);
        if (dedupResult.isDuplicate) {
          duplicatesSkipped++;
          continue;
        }

        // 3. Detect candidate
        const candidateResult = this.detector.detect(content);
        if (!candidateResult.isCandidate) {
          // Mark seen even if not a candidate, to avoid reprocessing noise
          this.deduplicator.markSeen(content);
          continue;
        }
        candidatesFound++;

        // Mark seen now that it has passed detection
        this.deduplicator.markSeen(content);

        // 4. Resolve author (async, fault-tolerant)
        let author: Author;
        try {
          author = await this.authorResolver(content.authorId);
        } catch (resolverErr) {
          const msg =
            resolverErr instanceof Error ? resolverErr.message : String(resolverErr);
          errors.push(`Author resolution failed for '${content.authorId}': ${msg}`);
          continue; // Skip this item — do not process with a fallback author
        }

        // 5. Extract situation
        const situation = this.extractor.extract(content, author, scanRunId);

        // 6. Score opportunity
        const opportunityScore = this.scorer.score(situation, this.userCapabilities);
        situation.opportunityScore = opportunityScore;

        // 7. Calculate relationship confidence
        const relationshipConfidence = this.confidenceCalculator.calculate(situation, author);
        situation.relationshipConfidence = relationshipConfidence;

        // 8. Match capabilities
        const matches = this.matcher.match(situation, this.userCapabilities);

        // 9. Format card
        const card = this.cardFormatter.format(situation, matches, author);

        situations.push(situation);
        cards.push(card);
        situationsCreated++;

        // 10. Persist (idempotent — skip if already exists)
        if (this.situationRepository !== undefined) {
          const alreadyExists = await this.situationRepository.exists(situation.situationId);
          if (!alreadyExists) {
            await this.situationRepository.save(situation);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Error processing content: ${msg}`);
      }
    }

    const scanRun = {
      runId,
      startedAt,
      finishedAt: new Date(),
      contentProcessed,
      candidatesFound,
      situationsCreated,
      errors,
    };

    return { scanRun, situations, cards, duplicatesSkipped };
  }
}
