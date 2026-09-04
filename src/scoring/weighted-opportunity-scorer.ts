import type {
  Situation,
  UserProfile,
  UserCapability,
  OpportunityScore,
  ScoreBreakdownEntry,
} from '../domain/index.js';
import type { OpportunityScorerInterface } from './opportunity-scorer-interface.js';
import { SCORE_WEIGHTS } from './score-weights.js';

/**
 * Neutral geographic weight used when the active profile expresses no priority
 * for a geography (or no geographic preferences at all). This is the existing
 * "rest of the world" default — it is NOT any specific user's priority table.
 */
const NEUTRAL_GEO_WEIGHT = 5;

/**
 * Weighted opportunity scorer implementing the exact weight table from spec.
 * Each factor is scored 0–max_weight with a human-readable explanation.
 * Weak evidence caps the score and explains why.
 */
export class WeightedOpportunityScorer implements OpportunityScorerInterface {
  score(situation: Situation, profile: UserProfile): OpportunityScore {
    const breakdown: Record<string, ScoreBreakdownEntry> = {};

    // 1. Need / pain (15)
    breakdown.needPain = this.scoreNeedPain(situation);

    // 2. User fit (20)
    breakdown.userFit = this.scoreUserFit(situation, profile.capabilities);

    // 3. Existing business / traction (15)
    breakdown.existingBusinessTraction = this.scoreExistingBusinessTraction(situation);

    // 4. Economic potential (10)
    breakdown.economicPotential = this.scoreEconomicPotential(situation);

    // 5. Demand–capacity mismatch (10)
    breakdown.demandCapacityMismatch = this.scoreDemandCapacityMismatch(situation);

    // 6. Timing (10)
    breakdown.timing = this.scoreTiming(situation);

    // 7. Actionability (8)
    breakdown.actionability = this.scoreActionability(situation);

    // 8. Geography (5)
    breakdown.geography = this.scoreGeography(situation, profile);

    // 9. Evidence / credibility (4)
    breakdown.evidenceCredibility = this.scoreEvidenceCredibility(situation);

    // 10. Cross-source confirmation (3)
    breakdown.crossSourceConfirmation = this.scoreCrossSourceConfirmation(situation);

    const total = Math.round(
      Object.values(breakdown).reduce((sum, entry) => sum + entry.score, 0)
    );

    const explanation = this.buildExplanation(breakdown, total);

    return { total, breakdown, explanation };
  }

  // ---------------------------------------------------------------------------
  // Individual factor scorers
  // ---------------------------------------------------------------------------

  private scoreNeedPain(situation: Situation): ScoreBreakdownEntry {
    const w = SCORE_WEIGHTS.needPain;
    const needs = situation.needs;
    const explicitEvidence = situation.evidence.filter((e) => e.explicit);

    if (needs.length === 0) {
      return { score: 0, weight: w, explanation: 'No concrete need or pain identified' };
    }
    if (needs.length >= 2 && explicitEvidence.length >= 2) {
      return {
        score: w,
        weight: w,
        explanation: `Multiple explicit needs identified: ${needs.slice(0, 3).join(', ')}`,
      };
    }
    if (needs.length >= 1 && explicitEvidence.length >= 1) {
      return {
        score: Math.round(w * 0.75),
        weight: w,
        explanation: `Clear need identified: ${needs[0]}`,
      };
    }
    return {
      score: Math.round(w * 0.4),
      weight: w,
      explanation: `Weak need signal: ${needs[0]} (inferred only)`,
    };
  }

  private scoreUserFit(situation: Situation, userCapabilities: UserCapability[]): ScoreBreakdownEntry {
    const w = SCORE_WEIGHTS.userFit;

    if (userCapabilities.length === 0) {
      return {
        score: 0,
        weight: w,
        explanation: 'No user capabilities defined for matching',
      };
    }

    // Match needs against capabilities
    const needs = situation.needs.map((n) => n.toLowerCase());
    const geos = situation.geographies.map((g) => g.toLowerCase());

    let matchScore = 0;
    const matchedCaps: string[] = [];

    for (const cap of userCapabilities) {
      const capText = (cap.asset + ' ' + cap.assetType + ' ' + (cap.notes ?? '')).toLowerCase();
      const capGeos = cap.geographies.map((g) => g.toLowerCase());

      const needMatch = needs.some(
        (n) => capText.includes(n.split('/')[0].trim()) || capText.includes(n.split(' ')[0].trim())
      );
      const geoMatch = geos.some((g) => capGeos.some((cg) => cg.includes(g) || g.includes(cg)));

      if (needMatch && geoMatch) {
        matchScore += 0.4;
        matchedCaps.push(cap.asset);
      } else if (needMatch || geoMatch) {
        matchScore += 0.2;
        matchedCaps.push(cap.asset);
      }
    }

    const normalizedScore = Math.min(matchScore, 1.0);
    const finalScore = Math.round(normalizedScore * w);

    if (matchedCaps.length === 0) {
      return { score: 0, weight: w, explanation: 'No user capabilities match this situation' };
    }
    return {
      score: finalScore,
      weight: w,
      explanation: `Matched capabilities: ${matchedCaps.slice(0, 3).join(', ')}`,
    };
  }

  private scoreExistingBusinessTraction(situation: Situation): ScoreBreakdownEntry {
    const w = SCORE_WEIGHTS.existingBusinessTraction;
    const stage = situation.businessStage;
    const hasAssets = situation.assets.length > 0;

    if (stage === 'established' && hasAssets) {
      return {
        score: w,
        weight: w,
        explanation: `Established business with assets: ${situation.assets.slice(0, 2).join(', ')}`,
      };
    }
    if (stage === 'established') {
      return {
        score: Math.round(w * 0.8),
        weight: w,
        explanation: 'Established business (limited asset evidence)',
      };
    }
    if (stage === 'growth' && hasAssets) {
      return {
        score: Math.round(w * 0.65),
        weight: w,
        explanation: `Growth-stage business with assets: ${situation.assets[0]}`,
      };
    }
    if (stage === 'growth') {
      return {
        score: Math.round(w * 0.5),
        weight: w,
        explanation: 'Growth-stage business, limited evidence of traction',
      };
    }
    if (stage === 'early') {
      return {
        score: Math.round(w * 0.25),
        weight: w,
        explanation: 'Early-stage business, minimal traction evidence',
      };
    }
    if (stage === 'idea') {
      return {
        score: 0,
        weight: w,
        explanation: 'Idea stage only — no traction evidence',
      };
    }
    return {
      score: Math.round(w * 0.3),
      weight: w,
      explanation: 'Business stage unknown — capped due to weak evidence',
    };
  }

  private scoreEconomicPotential(situation: Situation): ScoreBreakdownEntry {
    const w = SCORE_WEIGHTS.economicPotential;
    const highValueTypes = ['distribution', 'market-entry', 'acquisition', 'succession'];
    const mediumValueTypes = ['partnership', 'sourcing', 'automation'];

    const hasHighValue = situation.opportunityTypes.some((t) => highValueTypes.includes(t));
    const hasMediumValue = situation.opportunityTypes.some((t) => mediumValueTypes.includes(t));
    const hasMultipleGeos = situation.geographies.filter((g) => g !== 'Unknown').length >= 2;

    if (hasHighValue && hasMultipleGeos) {
      return {
        score: w,
        weight: w,
        explanation: `High-value opportunity type (${situation.opportunityTypes[0]}) spanning multiple geographies`,
      };
    }
    if (hasHighValue) {
      return {
        score: Math.round(w * 0.75),
        weight: w,
        explanation: `High-value opportunity type: ${situation.opportunityTypes[0]}`,
      };
    }
    if (hasMediumValue) {
      return {
        score: Math.round(w * 0.5),
        weight: w,
        explanation: `Medium-value opportunity type: ${situation.opportunityTypes[0]}`,
      };
    }
    return {
      score: Math.round(w * 0.2),
      weight: w,
      explanation: 'Limited economic potential signals',
    };
  }

  private scoreDemandCapacityMismatch(situation: Situation): ScoreBreakdownEntry {
    const w = SCORE_WEIGHTS.demandCapacityMismatch;

    if (situation.demandCapacitySignal) {
      return {
        score: w,
        weight: w,
        explanation: `Demand-capacity mismatch detected: ${situation.demandCapacitySignal}`,
      };
    }

    // Check needs for mismatch signals
    const mismatchNeeds = situation.needs.filter(
      (n) => n.includes('distribution') || n.includes('EU') || n.includes('market entry')
    );
    if (mismatchNeeds.length > 0) {
      return {
        score: Math.round(w * 0.5),
        weight: w,
        explanation: `Possible mismatch: ${mismatchNeeds[0]} (inferred from needs)`,
      };
    }

    return {
      score: 0,
      weight: w,
      explanation: 'No demand-capacity mismatch signal detected',
    };
  }

  private scoreTiming(situation: Situation): ScoreBreakdownEntry {
    const w = SCORE_WEIGHTS.timing;

    if (situation.timing === 'Urgent') {
      return {
        score: w,
        weight: w,
        explanation: 'Urgent timing expressed — immediate opportunity window',
      };
    }
    if (situation.timing === 'Near-term') {
      return {
        score: Math.round(w * 0.7),
        weight: w,
        explanation: 'Near-term timing — opportunity active soon',
      };
    }
    if (situation.timing === 'Long-term') {
      return {
        score: Math.round(w * 0.3),
        weight: w,
        explanation: 'Long-term timing — no immediate urgency',
      };
    }
    return {
      score: Math.round(w * 0.4),
      weight: w,
      explanation: 'No explicit timing signal — opportunity may be current',
    };
  }

  private scoreActionability(situation: Situation): ScoreBreakdownEntry {
    const w = SCORE_WEIGHTS.actionability;

    const hasActions = situation.possibleActions.length > 0;
    const hasRoles = situation.possibleUserRoles.length > 0;
    const hasLink = situation.sourceContentIds.length > 0;

    if (hasActions && hasRoles && hasLink) {
      return {
        score: w,
        weight: w,
        explanation: `${situation.possibleActions.length} possible actions identified`,
      };
    }
    if (hasActions && hasRoles) {
      return {
        score: Math.round(w * 0.75),
        weight: w,
        explanation: 'Actions and roles identified, source traceable',
      };
    }
    if (hasActions || hasRoles) {
      return {
        score: Math.round(w * 0.5),
        weight: w,
        explanation: 'Limited actionability — partial role/action identification',
      };
    }
    return {
      score: 0,
      weight: w,
      explanation: 'No clear actionable path identified',
    };
  }

  private scoreGeography(situation: Situation, profile: UserProfile): ScoreBreakdownEntry {
    const w = SCORE_WEIGHTS.geography;
    const geos = situation.geographies.filter((g) => g !== 'Unknown');

    if (geos.length === 0) {
      return {
        score: 0,
        weight: w,
        explanation: 'Geography unknown — cannot apply geographic weighting',
      };
    }

    // Find the highest-priority geography using the ACTIVE PROFILE's priorities.
    let maxGeoWeight = 0;
    let topGeo = '';
    for (const geo of geos) {
      const geoW = this.getGeoWeight(geo, profile);
      if (geoW > maxGeoWeight) {
        maxGeoWeight = geoW;
        topGeo = geo;
      }
    }

    // Normalize: max geo weight is 10, our factor weight is 5
    const score = Math.round((maxGeoWeight / 10) * w);
    return {
      score,
      weight: w,
      explanation: `Top geography: ${topGeo} (priority weight ${maxGeoWeight}/10)`,
    };
  }

  private scoreEvidenceCredibility(situation: Situation): ScoreBreakdownEntry {
    const w = SCORE_WEIGHTS.evidenceCredibility;
    const explicit = situation.evidence.filter((e) => e.explicit);
    const highConfidence = situation.evidence.filter((e) => e.confidence >= 0.8);

    if (explicit.length >= 3 && highConfidence.length >= 2) {
      return {
        score: w,
        weight: w,
        explanation: `${explicit.length} explicit evidence items with high confidence`,
      };
    }
    if (explicit.length >= 2) {
      return {
        score: Math.round(w * 0.75),
        weight: w,
        explanation: `${explicit.length} explicit evidence items`,
      };
    }
    if (explicit.length >= 1) {
      return {
        score: Math.round(w * 0.5),
        weight: w,
        explanation: `${explicit.length} explicit evidence item, rest inferred`,
      };
    }
    return {
      score: Math.round(w * 0.2),
      weight: w,
      explanation: 'All evidence is inferred — credibility capped',
    };
  }

  private scoreCrossSourceConfirmation(situation: Situation): ScoreBreakdownEntry {
    const w = SCORE_WEIGHTS.crossSourceConfirmation;
    const sourceCount = situation.sourceContentIds.length + situation.relatedContentIds.length;

    if (sourceCount >= 3) {
      return {
        score: w,
        weight: w,
        explanation: `Confirmed across ${sourceCount} content sources`,
      };
    }
    if (sourceCount >= 2) {
      return {
        score: Math.round(w * 0.6),
        weight: w,
        explanation: 'Two content sources',
      };
    }
    return {
      score: 0,
      weight: w,
      explanation: 'Single source — no cross-confirmation',
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Geographic weight for a situation geography, derived from the ACTIVE
   * PROFILE's priorities. If the profile lists a matching region, its weight is
   * used; otherwise the neutral default applies. No user-specific priority table
   * is baked into the engine.
   */
  private getGeoWeight(geo: string, profile: UserProfile): number {
    const lower = geo.toLowerCase();
    let best = 0;
    for (const pref of profile.geographies) {
      const region = pref.region.toLowerCase();
      if (region.includes(lower) || lower.includes(region)) {
        if (pref.weight > best) best = pref.weight;
      }
    }
    return best > 0 ? best : NEUTRAL_GEO_WEIGHT;
  }

  private buildExplanation(
    breakdown: Record<string, ScoreBreakdownEntry>,
    total: number
  ): string {
    const topFactors = Object.entries(breakdown)
      .filter(([, v]) => v.score > 0)
      .sort(([, a], [, b]) => b.score - b.weight - (a.score - a.weight))
      .slice(0, 3)
      .map(([k, v]) => `${k}(${v.score}/${v.weight})`)
      .join(', ');

    return `Total score: ${total}/100. Top factors: ${topFactors}`;
  }
}
