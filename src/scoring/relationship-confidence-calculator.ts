import type { Situation, Author, RelationshipConfidence } from '../domain/index.js';
import type { RelationshipConfidenceCalculatorInterface } from './relationship-confidence-interface.js';

/**
 * Calculates relationship confidence — how confident we are that
 * the author/business/context is genuine and worth engaging with.
 * Separate from opportunity score.
 */
export class RelationshipConfidenceCalculator implements RelationshipConfidenceCalculatorInterface {
  calculate(situation: Situation, author: Author): RelationshipConfidence {
    const factors: string[] = [];
    let score = 0;

    // Author account age (signals: established presence)
    if (author.accountAgeDays !== undefined) {
      if (author.accountAgeDays >= 365) {
        score += 20;
        factors.push(`Author account ${author.accountAgeDays} days old (established)`);
      } else if (author.accountAgeDays >= 90) {
        score += 10;
        factors.push(`Author account ${author.accountAgeDays} days old (moderate)`);
      } else {
        score += 3;
        factors.push(`Author account only ${author.accountAgeDays} days old (new account — lower confidence)`);
      }
    } else {
      score += 5;
      factors.push('Author account age unknown');
    }

    // Author karma / engagement
    if (author.karma !== undefined) {
      if (author.karma >= 1000) {
        score += 15;
        factors.push(`High karma (${author.karma}) — established community member`);
      } else if (author.karma >= 100) {
        score += 8;
        factors.push(`Moderate karma (${author.karma})`);
      } else {
        score += 2;
        factors.push(`Low karma (${author.karma}) — new or infrequent participant`);
      }
    }

    // Verified author
    if (author.verified) {
      score += 15;
      factors.push('Author is verified');
    }

    // Author has bio
    if (author.bio && author.bio.length > 20) {
      score += 10;
      factors.push('Author has detailed bio — increases credibility');
    }

    // Evidence quality
    const explicitEvidence = situation.evidence.filter((e) => e.explicit);
    if (explicitEvidence.length >= 3) {
      score += 20;
      factors.push(`${explicitEvidence.length} explicit evidence items`);
    } else if (explicitEvidence.length >= 1) {
      score += 10;
      factors.push(`${explicitEvidence.length} explicit evidence item(s)`);
    }

    // Business stage (established = more credible)
    if (situation.businessStage === 'established') {
      score += 10;
      factors.push('Established business stage increases credibility');
    } else if (situation.businessStage === 'growth') {
      score += 5;
      factors.push('Growth stage business');
    }

    // Assets mentioned
    if (situation.assets.length >= 2) {
      score += 10;
      factors.push(`${situation.assets.length} concrete assets mentioned`);
    } else if (situation.assets.length === 1) {
      score += 5;
      factors.push(`Asset mentioned: ${situation.assets[0]}`);
    }

    const cappedScore = Math.min(score, 100);
    const explanation = this.buildExplanation(cappedScore);

    return {
      score: cappedScore,
      explanation,
      factors,
    };
  }

  private buildExplanation(score: number): string {
    if (score >= 70) return 'High relationship confidence — multiple credibility signals present';
    if (score >= 45) return 'Moderate relationship confidence — some credibility evidence';
    if (score >= 25) return 'Low-moderate confidence — limited author/business evidence';
    return 'Low confidence — insufficient credibility signals, verify before engaging';
  }
}
