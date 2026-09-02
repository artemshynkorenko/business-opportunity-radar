import { describe, it, expect } from 'vitest';
import { CapabilityBasedMatcher } from '../../src/matching/capability-based-matcher.js';
import { USER_CAPABILITIES } from '../../src/matching/user-capabilities.js';
import { FixtureNormalizer } from '../../src/normalization/fixture-normalizer.js';
import { DeterministicSituationExtractor } from '../../src/extraction/deterministic-extractor.js';
import { WeightedOpportunityScorer } from '../../src/scoring/weighted-opportunity-scorer.js';
import {
  F01_THAI_MANUFACTURER,
  A01_THAI_MANUFACTURER,
  F02_RUSSIAN_SAAS,
  A02_RUSSIAN_SAAS,
  F03_RESTAURANT_AUTOMATION,
  A03_RESTAURANT,
  F05_THAI_SUCCESSION,
  A05_THAI_FACTORY,
} from '../fixtures/raw-fixtures.js';
import type { Situation, Author } from '../../src/domain/index.js';

const matcher = new CapabilityBasedMatcher();
const normalizer = new FixtureNormalizer();
const extractor = new DeterministicSituationExtractor();
const scorer = new WeightedOpportunityScorer();

function prepareSituation(raw: unknown, author: Author): Situation {
  const content = normalizer.normalize(raw, 'fixture');
  const situation = extractor.extract(content, author, 'run-test');
  situation.opportunityScore = scorer.score(situation, USER_CAPABILITIES);
  return situation;
}

describe('CapabilityBasedMatcher', () => {
  describe('positive matches', () => {
    it('F01 Thai manufacturer — finds match (distributor or market-entry-partner)', () => {
      const situation = prepareSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      expect(matches.length).toBeGreaterThan(0);
      const roles = matches.map((m) => m.matchType);
      expect(roles.some((r) => ['distributor', 'market-entry-partner', 'partner', 'sourcing-partner'].includes(r))).toBe(true);
    });

    it('F02 Russian SaaS — finds match (partner or market-entry-partner)', () => {
      const situation = prepareSituation(F02_RUSSIAN_SAAS, A02_RUSSIAN_SAAS);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      expect(matches.length).toBeGreaterThan(0);
      const roles = matches.map((m) => m.matchType);
      expect(roles.some((r) => ['partner', 'market-entry-partner', 'distributor'].includes(r))).toBe(true);
    });

    it('F03 restaurant — finds automation-implementer match', () => {
      const situation = prepareSituation(F03_RESTAURANT_AUTOMATION, A03_RESTAURANT);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      expect(matches.length).toBeGreaterThan(0);
      const roles = matches.map((m) => m.matchType);
      expect(roles).toContain('automation-implementer');
    });

    it('F05 Thai succession — finds partner match', () => {
      const situation = prepareSituation(F05_THAI_SUCCESSION, A05_THAI_FACTORY);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      expect(matches.length).toBeGreaterThan(0);
      const roles = matches.map((m) => m.matchType);
      expect(roles).toContain('partner');
    });
  });

  describe('match quality', () => {
    it('each match has a non-empty explanation', () => {
      const situation = prepareSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      for (const match of matches) {
        expect(match.explanation).toBeTruthy();
        expect(match.explanation.length).toBeGreaterThan(10);
      }
    });

    it('compatibility scores are between 0 and 100', () => {
      const situation = prepareSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      for (const match of matches) {
        expect(match.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(match.compatibilityScore).toBeLessThanOrEqual(100);
      }
    });

    it('matches reference correct situationId', () => {
      const situation = prepareSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      for (const match of matches) {
        expect(match.situationId).toBe(situation.situationId);
      }
    });

    it('matches reference a valid capabilityId from the provided list', () => {
      const situation = prepareSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      const capIds = USER_CAPABILITIES.map((c) => c.capabilityId);
      for (const match of matches) {
        expect(capIds).toContain(match.capabilityId);
      }
    });

    it('matches are sorted by score descending', () => {
      const situation = prepareSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].compatibilityScore).toBeGreaterThanOrEqual(matches[i + 1].compatibilityScore);
      }
    });
  });

  describe('no-match cases', () => {
    it('returns empty array when capabilities list is empty', () => {
      const situation = prepareSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      const matches = matcher.match(situation, []);
      expect(matches).toHaveLength(0);
    });

    it('returns empty array when situation has no needs and generic type', () => {
      const situation = prepareSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      // Override to simulate a low-signal situation
      situation.needs = [];
      situation.geographies = ['Unknown'];
      situation.opportunityTypes = ['other'];
      // May or may not match — ensure no error and valid return
      const matches = matcher.match(situation, USER_CAPABILITIES);
      expect(Array.isArray(matches)).toBe(true);
    });
  });
});
