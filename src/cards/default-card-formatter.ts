import type { Situation, Match, Author, OpportunityCard, OpportunityType } from '../domain/index.js';
import type { OpportunityCardFormatterInterface } from './card-formatter-interface.js';

/**
 * Default opportunity card formatter.
 * Creates a structured card and renders a human-readable multi-line text representation.
 */
export class DefaultOpportunityCardFormatter implements OpportunityCardFormatterInterface {
  format(situation: Situation, matches: Match[], author: Author): OpportunityCard {
    const opportunityType = situation.opportunityTypes[0] ?? 'other';
    const score = situation.opportunityScore.total;
    const source = situation.sourceContentIds[0] ?? 'unknown';
    const geography = situation.geographies.filter((g) => g !== 'Unknown').join(', ') || 'Unknown';
    const summary = situation.summary;
    const authorNeed = situation.needs.join('; ') || 'Unspecified';
    const potentialUserOffer = this.derivePotentialOffer(situation, matches);
    const whyRelevant = this.deriveWhyRelevant(situation, matches);
    const suggestedNextAction = situation.possibleActions[0] ?? 'Research further and engage in conversation';
    const sourceLink = this.deriveSourceLink(situation);

    const renderedText = this.renderText({
      opportunityType,
      score,
      source,
      geography,
      summary,
      authorNeed,
      potentialUserOffer,
      whyRelevant,
      suggestedNextAction,
      sourceLink,
      author,
      situation,
      matches,
    });

    return {
      situationId: situation.situationId,
      opportunityType,
      score,
      source,
      geography,
      summary,
      authorNeed,
      potentialUserOffer,
      whyRelevant,
      suggestedNextAction,
      sourceLink,
      renderedText,
    };
  }

  // ---------------------------------------------------------------------------

  private derivePotentialOffer(situation: Situation, matches: Match[]): string {
    if (matches.length === 0) {
      // Derive from situation alone
      const roles = situation.possibleUserRoles;
      if (roles.length > 0) {
        return `Can serve as: ${roles.join(', ')}`;
      }
      return 'Potential connector or advisor';
    }

    const topMatch = matches[0];
    return `As ${topMatch.matchType}: ${topMatch.explanation}`;
  }

  private deriveWhyRelevant(situation: Situation, matches: Match[]): string {
    const geos = situation.geographies.filter((g) => g !== 'Unknown');
    const types = situation.opportunityTypes.slice(0, 2);
    const score = situation.opportunityScore.total;

    const parts: string[] = [];

    if (geos.length > 0) {
      parts.push(`Geographic alignment: ${geos.join(', ')}`);
    }
    if (types.length > 0) {
      parts.push(`Opportunity type: ${types.join(', ')}`);
    }
    if (matches.length > 0) {
      parts.push(`${matches.length} capability match(es) found`);
    }
    if (score >= 60) {
      parts.push(`High opportunity score (${score}/100)`);
    } else if (score >= 35) {
      parts.push(`Moderate opportunity score (${score}/100)`);
    }

    return parts.join('. ') || 'Matches user interest profile';
  }

  private deriveSourceLink(situation: Situation): string {
    if (situation.permalink && situation.permalink.length > 0) {
      return situation.permalink;
    }
    // Graceful fallback for situations without a source permalink
    return `content:${situation.sourceContentIds[0] ?? 'unknown'}`;
  }

  private renderText(params: {
    opportunityType: OpportunityType;
    score: number;
    source: string;
    geography: string;
    summary: string;
    authorNeed: string;
    potentialUserOffer: string;
    whyRelevant: string;
    suggestedNextAction: string;
    sourceLink: string;
    author: Author;
    situation: Situation;
    matches: Match[];
  }): string {
    const scoreBar = this.renderScoreBar(params.score);
    const matchLine =
      params.matches.length > 0
        ? params.matches.map((m) => `  • ${m.matchType} (${m.compatibilityScore}/100)`).join('\n')
        : '  • No direct capability match';

    return [
      `╔══════════════════════════════════════════════════════════════╗`,
      `║  OPPORTUNITY CARD                                            ║`,
      `╚══════════════════════════════════════════════════════════════╝`,
      ``,
      `  Type     : ${params.opportunityType.toUpperCase()}`,
      `  Score    : ${params.score}/100  ${scoreBar}`,
      `  Geography: ${params.geography}`,
      `  Source   : ${params.source}`,
      `  Author   : @${params.author.username}`,
      ``,
      `  SUMMARY`,
      `  ───────`,
      `  ${params.summary}`,
      ``,
      `  AUTHOR NEED`,
      `  ───────────`,
      `  ${params.authorNeed}`,
      ``,
      `  POTENTIAL USER OFFER`,
      `  ────────────────────`,
      `  ${params.potentialUserOffer}`,
      ``,
      `  WHY RELEVANT`,
      `  ────────────`,
      `  ${params.whyRelevant}`,
      ``,
      `  CAPABILITY MATCHES`,
      `  ──────────────────`,
      matchLine,
      ``,
      `  SUGGESTED NEXT ACTION`,
      `  ─────────────────────`,
      `  ${params.suggestedNextAction}`,
      ``,
      `  SOURCE: ${params.sourceLink}`,
      ``,
    ].join('\n');
  }

  private renderScoreBar(score: number): string {
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    let label = 'LOW';
    if (score >= 70) label = 'HIGH';
    else if (score >= 40) label = 'MED';
    return `[${bar}] ${label}`;
  }
}
