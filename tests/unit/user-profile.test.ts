import { describe, it, expect } from 'vitest';
import { DeterministicSituationExtractor } from '../../src/extraction/deterministic-extractor.js';
import { WeightedOpportunityScorer } from '../../src/scoring/weighted-opportunity-scorer.js';
import { CapabilityBasedMatcher } from '../../src/matching/capability-based-matcher.js';
import { ARTEM_PROFILE, ANTON_PROFILE } from '../../src/matching/profiles.js';
import type { Author, NormalizedContent, Situation, UserProfile } from '../../src/domain/index.js';

/**
 * Proves the core is profile-driven: the same Situation can be processed for
 * different active user profiles without changing engine code. Interests are
 * never treated as capabilities, and no profile inherits another's geography.
 */

const extractor = new DeterministicSituationExtractor();
const scorer = new WeightedOpportunityScorer();
const matcher = new CapabilityBasedMatcher();

const AUTHOR: Author = {
  id: 'th_moto_mfg',
  sourceId: 'threads',
  username: 'th_moto_mfg',
};

/** Scenario from the task: Thai motorcycle manufacturer seeking an EU distributor. */
function motorcycleSituation(): Situation {
  const content: NormalizedContent = {
    contentId: 'c-moto-1',
    sourceId: 'threads',
    authorId: 'th_moto_mfg',
    text:
      'We are a Thai motorcycle manufacturer looking for a European distributor to expand into the EU market.',
    timestamp: new Date('2026-08-01T00:00:00Z'),
    permalink: 'https://www.threads.net/@th_moto_mfg/post/c-moto-1',
    contentType: 'post',
    metadata: {},
  };
  return extractor.extract(content, AUTHOR, 'run-profile-test');
}

describe('Profile-driven core', () => {
  it('1. Artem and Anton profiles can coexist (both process the same situation)', () => {
    const s = motorcycleSituation();
    const artemScore = scorer.score(s, ARTEM_PROFILE);
    const antonScore = scorer.score(s, ANTON_PROFILE);
    expect(artemScore.total).toBeGreaterThanOrEqual(0);
    expect(antonScore.total).toBeGreaterThanOrEqual(0);
    // Coexistence: scoring one profile does not mutate the other's result.
    expect(scorer.score(s, ARTEM_PROFILE).total).toBe(artemScore.total);
  });

  it('2. The same situation is scored (potentially differently) for both profiles', () => {
    const s = motorcycleSituation();
    const artemScore = scorer.score(s, ARTEM_PROFILE);
    const antonScore = scorer.score(s, ANTON_PROFILE);
    // Artem's relevant capabilities + geography should produce a higher total.
    expect(artemScore.total).toBeGreaterThan(antonScore.total);
  });

  it('3. Artem gets stronger personalized fit (userFit + geography) for the distributor situation', () => {
    const s = motorcycleSituation();
    const artem = scorer.score(s, ARTEM_PROFILE);
    const anton = scorer.score(s, ANTON_PROFILE);
    expect(artem.breakdown.userFit.score).toBeGreaterThan(anton.breakdown.userFit.score);
    // EU is a priority geography for Artem (weight 8) but Anton has no priorities.
    expect(artem.breakdown.geography.score).toBeGreaterThan(anton.breakdown.geography.score);
  });

  it('4. Anton gets no strong capability match merely because motorcycles is an interest', () => {
    const s = motorcycleSituation();
    const antonMatches = matcher.match(s, ANTON_PROFILE);
    // No declared capabilities ⇒ no capability matches at all.
    expect(antonMatches).toHaveLength(0);

    // And interest did not leak into user-fit scoring.
    const antonScore = scorer.score(s, ANTON_PROFILE);
    expect(antonScore.breakdown.userFit.score).toBe(0);

    // Artem, who has relevant capabilities, does match.
    const artemMatches = matcher.match(s, ARTEM_PROFILE);
    expect(artemMatches.length).toBeGreaterThan(0);
  });

  it('5. Generic opportunity type / extraction is identical regardless of active profile', () => {
    // Extraction takes no profile; the situation is user-independent by design.
    const s1 = motorcycleSituation();
    const s2 = motorcycleSituation();
    expect(s1.opportunityTypes).toEqual(s2.opportunityTypes);
    expect(s1.geographies).toEqual(s2.geographies);
    expect(s1.needs).toEqual(s2.needs);
    // Scoring for different profiles must not change the extracted taxonomy.
    scorer.score(s1, ARTEM_PROFILE);
    scorer.score(s1, ANTON_PROFILE);
    expect(s1.opportunityTypes).toEqual(s2.opportunityTypes);
  });

  it('6. A profile with no geographic preferences does not inherit Artem\'s priorities', () => {
    const s = motorcycleSituation(); // geography includes EU and Thailand
    const neutralProfile: UserProfile = {
      id: 'neutral',
      displayName: 'Neutral',
      interests: [],
      goals: [],
      capabilities: [],
      geographies: [], // no preferences
      languages: [],
      exclusions: [],
    };
    const neutral = scorer.score(s, neutralProfile);
    const artem = scorer.score(s, ARTEM_PROFILE);

    // Neutral uses the default weight (5/10 → 3/5), NOT Artem's Thailand=10.
    expect(neutral.breakdown.geography.score).toBe(3);
    // Artem's Thailand/EU priorities give a strictly higher geography score.
    expect(artem.breakdown.geography.score).toBeGreaterThan(neutral.breakdown.geography.score);
  });

  it('7. Generic extractor no longer emits Artem-specific suggested actions', () => {
    const s = motorcycleSituation();
    const joined = s.possibleActions.join(' | ').toLowerCase();
    expect(joined).not.toContain('czech');
    expect(joined).not.toContain('n8n');
    expect(joined).not.toContain('russia/cis');
  });
});
