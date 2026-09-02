import type { Author, UserCapability } from '../domain/index.js';
import type { NormalizerInterface } from '../normalization/normalizer-interface.js';
import type { CandidateDetectorInterface } from '../detection/candidate-detector-interface.js';
import type { SituationExtractorInterface } from '../extraction/situation-extractor-interface.js';
import type { OpportunityScorerInterface } from '../scoring/opportunity-scorer-interface.js';
import type { RelationshipConfidenceCalculatorInterface } from '../scoring/relationship-confidence-interface.js';
import type { UserMatcherInterface } from '../matching/user-matcher-interface.js';
import type { OpportunityCardFormatterInterface } from '../cards/card-formatter-interface.js';
import type { PipelineResult } from './pipeline-result.js';

/**
 * End-to-end pipeline orchestrator.
 *
 * Flow:
 *   rawContents → normalize → detect candidates → extract situations
 *   → score → match → format cards → persist
 */
export class Pipeline {
  constructor(
    private readonly normalizer: NormalizerInterface,
    private readonly detector: CandidateDetectorInterface,
    private readonly extractor: SituationExtractorInterface,
    private readonly scorer: OpportunityScorerInterface,
    private readonly confidenceCalculator: RelationshipConfidenceCalculatorInterface,
    private readonly matcher: UserMatcherInterface,
    private readonly cardFormatter: OpportunityCardFormatterInterface,
    private readonly authorResolver: (authorId: string) => Author,
    private readonly userCapabilities: UserCapability[]
  ) {}

  async run(rawContents: unknown[], sourceId: string): Promise<PipelineResult> {
    const runId = `run-${Date.now()}`;
    const startedAt = new Date();
    const errors: string[] = [];

    let contentProcessed = 0;
    let candidatesFound = 0;
    let situationsCreated = 0;

    const situations = [];
    const cards = [];

    for (const raw of rawContents) {
      contentProcessed++;
      const scanRunId = runId;

      try {
        // 1. Normalize
        const content = this.normalizer.normalize(raw, sourceId);

        // 2. Detect candidate
        const candidateResult = this.detector.detect(content);
        if (!candidateResult.isCandidate) {
          continue;
        }
        candidatesFound++;

        // 3. Resolve author
        const author = this.authorResolver(content.authorId);

        // 4. Extract situation
        const situation = this.extractor.extract(content, author, scanRunId);

        // 5. Score opportunity
        const opportunityScore = this.scorer.score(situation, this.userCapabilities);
        situation.opportunityScore = opportunityScore;

        // 6. Calculate relationship confidence
        const relationshipConfidence = this.confidenceCalculator.calculate(situation, author);
        situation.relationshipConfidence = relationshipConfidence;

        // 7. Match capabilities
        const matches = this.matcher.match(situation, this.userCapabilities);

        // 8. Format card
        const card = this.cardFormatter.format(situation, matches, author);

        situations.push(situation);
        cards.push(card);
        situationsCreated++;
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

    return { scanRun, situations, cards };
  }
}
