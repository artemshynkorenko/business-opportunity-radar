import { describe, it, expect } from 'vitest';
import { FixtureNormalizer } from '../../src/normalization/fixture-normalizer.js';
import { DeterministicSituationExtractor } from '../../src/extraction/deterministic-extractor.js';
import { WeightedOpportunityScorer } from '../../src/scoring/weighted-opportunity-scorer.js';
import { CapabilityBasedMatcher } from '../../src/matching/capability-based-matcher.js';
import { ARTEM_PROFILE, ANTON_PROFILE } from '../../src/matching/profiles.js';
import type { Author, Situation, UserProfile, Match } from '../../src/domain/index.js';
import {
  EVAL_FIXTURES,
  EVAL_BY_ID,
  evalByCategory,
  MOTORCYCLE_EU_DISTRIBUTOR_ID,
  type EvalCategory,
  type EvalFixture,
} from '../fixtures/personalization/eval-fixtures.js';

/**
 * Personalization evaluation — SYNTHETIC (see tests/fixtures/personalization/README.md).
 *
 * Validates the product hypothesis that the SAME public situation can represent
 * DIFFERENT opportunities for DIFFERENT users, using the real pipeline
 * components (no bypass) and the existing Artem/Anton profiles.
 *
 * This proves deterministic architecture/personalization behavior. It does NOT
 * establish real-world precision/recall.
 */

// --- Real pipeline components (no bypass) ---------------------------------
const normalizer = new FixtureNormalizer();
const extractor = new DeterministicSituationExtractor();
const scorer = new WeightedOpportunityScorer();
const matcher = new CapabilityBasedMatcher();

function extractSituation(f: EvalFixture): Situation {
  const content = normalizer.normalize(f.content, 'fixture');
  const author: Author = { id: f.author.id, sourceId: 'fixture', username: f.author.username };
  return extractor.extract(content, author, 'eval-run');
}

interface Evaluation {
  situation: Situation;
  total: number;
  userFit: number;
  matches: Match[];
  /**
   * Read-only interest/goal alignment for the ACTIVE profile, derived from the
   * profile and the extracted situation. This is NOT an engine mechanism — the
   * engine has no interest-based scoring — it is a test-side measure used to
   * express "relevance" for a profile (e.g. Anton) whose value comes from
   * interest/goal alignment rather than capability fit. It never invents
   * capabilities.
   */
  interestGoalRelevance: number;
}

/** Map a profile's declared goals to concrete opportunity-type tokens. */
function goalOpportunityTypes(profile: UserProfile): string[] {
  const map: Record<string, string[]> = {
    partnership: ['partnership'],
    'business partners': ['partnership', 'cofounder'],
    projects: ['project'],
    distribution: ['distribution'],
    'market-entry': ['market-entry'],
    sourcing: ['sourcing'],
    automation: ['automation'],
    acquisition: ['acquisition'],
    succession: ['succession'],
    cofounder: ['cofounder'],
  };
  const out = new Set<string>();
  for (const g of profile.goals) {
    for (const t of map[g] ?? []) out.add(t);
  }
  return [...out];
}

/**
 * Domain terms for a modeled interest. Interest matching is domain-level, not
 * exact-string, so "filmmaking" also matches "film"/"documentary"/"production"
 * and "motorcycles" matches "motorcycle". This is still interest-domain
 * relevance — it never confers a capability.
 */
const INTEREST_TERMS: Record<string, string[]> = {
  filmmaking: ['film', 'filmmak', 'documentary', 'production', 'producer', 'cinema', 'screening'],
  'food business': ['food', 'restaurant', 'café', 'cafe', 'ramen', 'kitchen', 'snack', 'street-food'],
  motorcycles: ['motorcycle', 'moto', 'scooter', 'riding gear', 'dealership'],
};

/**
 * Interest/goal relevance in [0,1]: does the situation's domain touch the
 * profile's interests, and does its opportunity type match a profile goal?
 */
function interestGoalRelevance(situation: Situation, profile: UserProfile): number {
  const haystack = `${situation.title} ${situation.summary} ${situation.needs.join(' ')} ${situation.intent}`.toLowerCase();

  const interestHit = profile.interests.some((interest) => {
    const terms = INTEREST_TERMS[interest] ?? [interest.split(' ')[0].toLowerCase()];
    return terms.some((t) => haystack.includes(t));
  });

  const goalTypes = goalOpportunityTypes(profile);
  const goalHit = situation.opportunityTypes.some((t) => goalTypes.includes(t));

  let score = 0;
  if (interestHit) score += 0.6;
  if (goalHit) score += 0.4;
  return score;
}

function evaluate(f: EvalFixture, profile: UserProfile): Evaluation {
  const situation = extractSituation(f);
  const score = scorer.score(situation, profile);
  return {
    situation,
    total: score.total,
    userFit: score.breakdown.userFit.score,
    matches: matcher.match(situation, profile),
    interestGoalRelevance: interestGoalRelevance(situation, profile),
  };
}

// ===========================================================================

describe('Personalization evaluation set (synthetic)', () => {
  // --- 1. All categories represented --------------------------------------
  describe('1. fixture categories', () => {
    const categories: EvalCategory[] = [
      'A-strong-artem',
      'B-strong-anton',
      'C-different-fit',
      'D-interest-no-capability',
      'E-poor-fit-both',
      'F-noise',
    ];

    it('has ~30 fixtures across all six categories', () => {
      expect(EVAL_FIXTURES.length).toBe(30);
      for (const c of categories) {
        expect(evalByCategory(c).length).toBe(5);
      }
    });
  });

  // --- 2 & 3. Detection: positives detected, noise rejected ---------------
  describe('2/3. candidate detection matches expectations', () => {
    for (const f of EVAL_FIXTURES) {
      it(`${f.content.id} candidate=${f.expectCandidate}`, () => {
        const situation = extractSituation(f);
        // A situation is only produced for detected candidates in the real
        // pipeline; here we assert detection via the detector directly through
        // the shared expectation flag, cross-checked by extraction viability.
        // Detection itself is exercised in tests/unit/detection.test.ts; here we
        // assert the fixture's declared expectation is internally consistent:
        // detected fixtures extract a non-empty situation with a title.
        if (f.expectCandidate) {
          expect(situation.title.length).toBeGreaterThan(0);
        }
      });
    }
  });

  // A dedicated detection assertion using the real detector.
  describe('2/3. real detector accepts positives and rejects noise', () => {
    // Imported lazily to keep the harness focused on scoring/matching above.
    it('detects every non-noise fixture and rejects every noise fixture', async () => {
      const { RuleBasedCandidateDetector } = await import(
        '../../src/detection/rule-based-detector.js'
      );
      const detector = new RuleBasedCandidateDetector();
      for (const f of EVAL_FIXTURES) {
        const content = normalizer.normalize(f.content, 'fixture');
        const result = detector.detect(content);
        expect(
          result.isCandidate,
          `${f.content.id} expected candidate=${f.expectCandidate}`
        ).toBe(f.expectCandidate);
      }
    });
  });

  // --- 4. Same situation evaluated against both profiles ------------------
  describe('4. the same situation is evaluated against Artem and Anton', () => {
    it('produces an independent evaluation per profile from one situation', () => {
      const f = EVAL_BY_ID[MOTORCYCLE_EU_DISTRIBUTOR_ID];
      const situation = extractSituation(f);
      const artem = scorer.score(situation, ARTEM_PROFILE);
      const anton = scorer.score(situation, ANTON_PROFILE);
      expect(artem.total).toBeGreaterThanOrEqual(0);
      expect(anton.total).toBeGreaterThanOrEqual(0);
      // Same Situation object scored twice; second scoring is stable.
      expect(scorer.score(situation, ARTEM_PROFILE).total).toBe(artem.total);
    });
  });

  // --- 5. Artem strong fit for EU distributor / Thai manufacturer ---------
  describe('5. Artem gets strong fit for the EU-distributor / Thai-manufacturer case', () => {
    it('motorcycle→EU distributor: Artem has full userFit and capability matches', () => {
      const artem = evaluate(EVAL_BY_ID[MOTORCYCLE_EU_DISTRIBUTOR_ID], ARTEM_PROFILE);
      expect(artem.userFit).toBeGreaterThanOrEqual(15); // strong (weight is 20)
      expect(artem.matches.length).toBeGreaterThan(0);
      expect(
        artem.matches.some((m) =>
          ['distributor', 'market-entry-partner', 'sourcing-partner'].includes(m.matchType)
        )
      ).toBe(true);
      expect(artem.total).toBeGreaterThanOrEqual(60);
    });

    it('Thai food manufacturer→EU distributor: Artem matches strongly too', () => {
      const artem = evaluate(EVAL_BY_ID['ec1-thai-food-eu-distributor'], ARTEM_PROFILE);
      expect(artem.matches.length).toBeGreaterThan(0);
      expect(artem.total).toBeGreaterThanOrEqual(60);
    });
  });

  // --- 6. Anton NOT a strong capability fit for that same example ----------
  describe('6. Anton gets no capability fit for the motorcycle→EU distributor case', () => {
    it('Anton has zero userFit and zero capability matches despite motorcycle interest', () => {
      const anton = evaluate(EVAL_BY_ID[MOTORCYCLE_EU_DISTRIBUTOR_ID], ANTON_PROFILE);
      expect(anton.userFit).toBe(0);
      expect(anton.matches).toHaveLength(0);
    });

    it('Anton is strictly weaker than Artem on this case', () => {
      const artem = evaluate(EVAL_BY_ID[MOTORCYCLE_EU_DISTRIBUTOR_ID], ARTEM_PROFILE);
      const anton = evaluate(EVAL_BY_ID[MOTORCYCLE_EU_DISTRIBUTOR_ID], ANTON_PROFILE);
      expect(artem.total).toBeGreaterThan(anton.total);
      expect(artem.matches.length).toBeGreaterThan(anton.matches.length);
    });

    it('Category D: interest-relevant but Anton never gains a capability match', () => {
      for (const f of evalByCategory('D-interest-no-capability')) {
        const anton = evaluate(f, ANTON_PROFILE);
        expect(anton.matches, `${f.content.id}`).toHaveLength(0);
        expect(anton.userFit, `${f.content.id}`).toBe(0);
      }
    });
  });

  // --- 7. Anton relevance where the role is compatible with his profile ----
  describe('7. Anton gets strong relevance for a compatible film/food/motorcycle opportunity', () => {
    it('a category-B opportunity aligns with Anton interests AND goals (no invented capability)', () => {
      // eb4: motorcycle business partnership. Interest (motorcycles) + goal
      // (business partners → partnership). Relevance comes from interest/goal
      // alignment, NOT from a capability the profile does not declare.
      const f = EVAL_BY_ID['eb4-moto-partnership'];
      const anton = evaluate(f, ANTON_PROFILE);

      expect(anton.interestGoalRelevance).toBeGreaterThanOrEqual(0.6);
      // The opportunity type matches one of Anton's goals.
      expect(anton.situation.opportunityTypes).toContain('partnership');
      // Crucially: relevance did NOT come from fabricated capabilities.
      expect(ANTON_PROFILE.capabilities).toHaveLength(0);
      expect(anton.matches).toHaveLength(0);
      expect(anton.userFit).toBe(0);
    });

    it('every strong-Anton (B) fixture is interest-relevant to Anton and not to Artem via interest', () => {
      for (const f of evalByCategory('B-strong-anton')) {
        const antonRel = interestGoalRelevance(extractSituation(f), ANTON_PROFILE);
        const artemRel = interestGoalRelevance(extractSituation(f), ARTEM_PROFILE);
        expect(antonRel, `${f.content.id} anton relevance`).toBeGreaterThan(artemRel);
      }
    });
  });

  // --- 8. Generic classification is profile-independent -------------------
  describe('8. generic opportunity classification is independent of the active user', () => {
    it('extraction takes no profile; opportunityTypes/geographies/needs are identical regardless of who evaluates', () => {
      for (const f of EVAL_FIXTURES.filter((x) => x.expectCandidate)) {
        const s1 = extractSituation(f);
        const s2 = extractSituation(f);
        // Scoring for different profiles must not mutate the taxonomy.
        scorer.score(s1, ARTEM_PROFILE);
        scorer.score(s1, ANTON_PROFILE);
        matcher.match(s1, ARTEM_PROFILE);
        matcher.match(s1, ANTON_PROFILE);
        expect(s1.opportunityTypes, `${f.content.id}`).toEqual(s2.opportunityTypes);
        expect(s1.geographies, `${f.content.id}`).toEqual(s2.geographies);
        expect(s1.needs, `${f.content.id}`).toEqual(s2.needs);
      }
    });
  });

  // --- 9. User-specific relevance can differ without modifying the Situation
  describe('9. per-user relevance differs without mutating the Situation', () => {
    it('one Situation yields different totals/matches for Artem vs Anton, unchanged in place', () => {
      let differed = 0;
      for (const f of EVAL_FIXTURES.filter((x) => x.expectCandidate)) {
        const situation = extractSituation(f);
        const before = JSON.stringify(situation);
        const artem = scorer.score(situation, ARTEM_PROFILE);
        const anton = scorer.score(situation, ANTON_PROFILE);
        const artemMatches = matcher.match(situation, ARTEM_PROFILE);
        const antonMatches = matcher.match(situation, ANTON_PROFILE);
        const after = JSON.stringify(situation);
        expect(after, `${f.content.id} situation mutated by scoring/matching`).toBe(before);
        if (artem.total !== anton.total || artemMatches.length !== antonMatches.length) {
          differed++;
        }
      }
      // Personalization must actually make a difference across the set.
      expect(differed).toBeGreaterThan(0);
    });
  });

  // --- Category A: strong for Artem ---------------------------------------
  describe('A. strong Artem opportunities score well and match', () => {
    it('each A fixture gives Artem at least one capability match', () => {
      for (const f of evalByCategory('A-strong-artem')) {
        const artem = evaluate(f, ARTEM_PROFILE);
        expect(artem.matches.length, `${f.content.id}`).toBeGreaterThan(0);
      }
    });
  });

  // --- Category C: different fit sanity ------------------------------------
  describe('C. different-fit cases favor Artem over Anton', () => {
    it('Artem total >= Anton total for every C fixture', () => {
      for (const f of evalByCategory('C-different-fit')) {
        const artem = evaluate(f, ARTEM_PROFILE);
        const anton = evaluate(f, ANTON_PROFILE);
        expect(artem.total, `${f.content.id}`).toBeGreaterThanOrEqual(anton.total);
      }
    });
  });
});
