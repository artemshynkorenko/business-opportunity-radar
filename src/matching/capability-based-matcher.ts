import type { Situation, UserProfile, UserCapability, Match, MatchType } from '../domain/index.js';
import type { UserMatcherInterface } from './user-matcher-interface.js';

/**
 * Maps opportunity types to candidate match types.
 */
const OPPORTUNITY_TO_ROLES: Record<string, MatchType[]> = {
  distribution: ['distributor', 'market-entry-partner'],
  'market-entry': ['market-entry-partner', 'partner'],
  partnership: ['partner', 'project-partner'],
  sourcing: ['sourcing-partner'],
  automation: ['automation-implementer'],
  acquisition: ['partner'],
  succession: ['partner'],
  investment: ['partner'],
  project: ['project-partner', 'partner'],
  cofounder: ['partner', 'project-partner'],
  'emerging-trend': ['connector'],
  other: ['connector'],
};

/**
 * Minimum compatibility score to include a match in results.
 */
const MIN_MATCH_SCORE = 20;

/**
 * Capability-based user matcher.
 * Matches situation needs against the user's capabilities.
 * Returns empty array if no meaningful match exists.
 */
export class CapabilityBasedMatcher implements UserMatcherInterface {
  match(situation: Situation, profile: UserProfile): Match[] {
    const capabilities = profile.capabilities;
    if (capabilities.length === 0) return [];

    const matches: Match[] = [];
    const situationGeos = situation.geographies.map((g) => g.toLowerCase());

    for (const cap of capabilities) {
      const score = this.computeCompatibilityScore(situation, cap, situationGeos);
      if (score < MIN_MATCH_SCORE) continue;

      const roles = this.determineRoles(situation, cap);
      const explanation = this.buildExplanation(situation, cap, score);
      const evidenceIds = situation.evidence.slice(0, 3).map((_, i) => `ev-${i}`);

      for (const role of roles) {
        matches.push({
          matchId: `match-${situation.situationId}-${cap.capabilityId}-${role}`,
          situationId: situation.situationId,
          capabilityId: cap.capabilityId,
          matchType: role,
          compatibilityScore: score,
          explanation,
          evidenceIds,
          status: 'pending',
        });
      }
    }

    // Deduplicate by matchType+capabilityId, keep highest score
    const deduplicated = this.deduplicate(matches);

    // Sort by score descending
    return deduplicated.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  // ---------------------------------------------------------------------------

  private computeCompatibilityScore(
    situation: Situation,
    cap: UserCapability,
    situationGeos: string[]
  ): number {
    let score = 0;

    // Geographic overlap (up to 40 points)
    const capGeos = cap.geographies.map((g) => g.toLowerCase());
    const geoOverlap = situationGeos.filter(
      (sg) =>
        sg !== 'unknown' &&
        capGeos.some((cg) => cg.includes(sg) || sg.includes(cg))
    ).length;

    if (geoOverlap > 0) {
      score += Math.min(40, geoOverlap * 20);
    }

    // Need alignment (up to 40 points)
    const needMatches = situation.needs.filter((need) => {
      const n = need.toLowerCase();
      const capText = (cap.asset + ' ' + cap.assetType + ' ' + (cap.notes ?? '')).toLowerCase();
      return (
        capText.includes(n.split(' ')[0]) ||
        n.includes(cap.assetType) ||
        this.needMatchesCap(n, cap)
      );
    }).length;

    if (needMatches > 0) {
      score += Math.min(40, needMatches * 20);
    }

    // Opportunity type alignment (up to 20 points)
    const typeMatch = situation.opportunityTypes.some((type) => {
      const roles = OPPORTUNITY_TO_ROLES[type] ?? [];
      return roles.some((role) => this.roleMatchesCap(role, cap));
    });
    if (typeMatch) score += 20;

    // Capability strength modifier
    score = Math.round(score * (0.5 + cap.strength * 0.05));

    return Math.min(score, 100);
  }

  private needMatchesCap(need: string, cap: UserCapability): boolean {
    const asset = cap.asset.toLowerCase();
    const type = cap.assetType.toLowerCase();

    const mappings: Array<[string, string[]]> = [
      ['eu distribution', ['eu market access', 'czech export', 'market-access']],
      ['us market access', ['us market access', 'market-access']],
      ['russia', ['russia/cis market access', 'russia', 'market-access']],
      ['automation', ['automation', 'n8n', 'technical-skill']],
      ['manufacturing', ['sourcing', 'manufacturing', 'trade']],
      ['market entry', ['market-access', 'eu market', 'thailand market', 'entrepreneurial']],
      ['business partner', ['entrepreneurial experience', 'experience']],
      ['succession', ['entrepreneurial experience', 'experience']],
      ['buyer', ['entrepreneurial experience', 'experience']],
      ['distribution', ['eu market access', 'market-access', 'czech export']],
    ];

    for (const [needFragment, capFragments] of mappings) {
      if (need.includes(needFragment)) {
        return capFragments.some((cf) => asset.includes(cf) || type.includes(cf));
      }
    }
    return false;
  }

  private roleMatchesCap(role: MatchType, cap: UserCapability): boolean {
    const asset = cap.asset.toLowerCase();
    const type = cap.assetType.toLowerCase();

    switch (role) {
      case 'distributor':
      case 'market-entry-partner':
        return type === 'market-access' || asset.includes('market');
      case 'partner':
      case 'project-partner':
        return type === 'experience' || type === 'operational';
      case 'sourcing-partner':
        return type === 'market-access' || asset.includes('trade') || asset.includes('sourcing');
      case 'automation-implementer':
        return type === 'technical-skill' || asset.includes('automation');
      case 'connector':
        return true;
      default:
        return false;
    }
  }

  private determineRoles(situation: Situation, cap: UserCapability): MatchType[] {
    const roles = new Set<MatchType>();

    for (const ot of situation.opportunityTypes) {
      const candidates = OPPORTUNITY_TO_ROLES[ot] ?? ['connector'];
      for (const role of candidates) {
        if (this.roleMatchesCap(role, cap)) {
          roles.add(role);
        }
      }
    }

    // Also check need-based role derivation
    for (const need of situation.needs) {
      const n = need.toLowerCase();
      if (n.includes('eu distribution') || n.includes('distributor')) {
        if (this.roleMatchesCap('distributor', cap)) roles.add('distributor');
      }
      if (n.includes('automation')) {
        if (this.roleMatchesCap('automation-implementer', cap)) roles.add('automation-implementer');
      }
      if (n.includes('market entry') || n.includes('market access')) {
        if (this.roleMatchesCap('market-entry-partner', cap)) roles.add('market-entry-partner');
      }
    }

    if (roles.size === 0) roles.add('connector');
    return [...roles];
  }

  private buildExplanation(situation: Situation, cap: UserCapability, score: number): string {
    const geo = situation.geographies.filter((g) => g !== 'Unknown').join(', ');
    const need = situation.needs[0] ?? 'opportunity';
    return (
      `${cap.asset} (strength ${cap.strength}/10) matches situation in ${geo || 'unknown location'}. ` +
      `Primary need: ${need}. Compatibility: ${score}/100.`
    );
  }

  private deduplicate(matches: Match[]): Match[] {
    const seen = new Map<string, Match>();
    for (const m of matches) {
      const key = `${m.capabilityId}:${m.matchType}`;
      const existing = seen.get(key);
      if (!existing || m.compatibilityScore > existing.compatibilityScore) {
        seen.set(key, m);
      }
    }
    return [...seen.values()];
  }
}
