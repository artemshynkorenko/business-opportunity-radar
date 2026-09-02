import { describe, it, expect } from 'vitest';
import { DefaultOpportunityCardFormatter } from '../../src/cards/default-card-formatter.js';
import { FixtureNormalizer } from '../../src/normalization/fixture-normalizer.js';
import { DeterministicSituationExtractor } from '../../src/extraction/deterministic-extractor.js';
import { WeightedOpportunityScorer } from '../../src/scoring/weighted-opportunity-scorer.js';
import { RelationshipConfidenceCalculator } from '../../src/scoring/relationship-confidence-calculator.js';
import { CapabilityBasedMatcher } from '../../src/matching/capability-based-matcher.js';
import { USER_CAPABILITIES } from '../../src/matching/user-capabilities.js';
import {
  F01_THAI_MANUFACTURER,
  A01_THAI_MANUFACTURER,
  F02_RUSSIAN_SAAS,
  A02_RUSSIAN_SAAS,
} from '../fixtures/raw-fixtures.js';
import type { Author } from '../../src/domain/index.js';

const formatter = new DefaultOpportunityCardFormatter();
const normalizer = new FixtureNormalizer();
const extractor = new DeterministicSituationExtractor();
const scorer = new WeightedOpportunityScorer();
const confidenceCalc = new RelationshipConfidenceCalculator();
const matcher = new CapabilityBasedMatcher();

function prepareCard(raw: unknown, author: Author) {
  const content = normalizer.normalize(raw, 'fixture');
  const situation = extractor.extract(content, author, 'run-test');
  situation.opportunityScore = scorer.score(situation, USER_CAPABILITIES);
  situation.relationshipConfidence = confidenceCalc.calculate(situation, author);
  const matches = matcher.match(situation, USER_CAPABILITIES);
  return { card: formatter.format(situation, matches, author), situation, matches };
}

describe('DefaultOpportunityCardFormatter', () => {
  describe('F01: Thai manufacturer card', () => {
    it('produces a card with all required fields', () => {
      const { card } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.situationId).toBeTruthy();
      expect(card.opportunityType).toBeTruthy();
      expect(card.score).toBeGreaterThanOrEqual(0);
      expect(card.source).toBeTruthy();
      expect(card.geography).toBeTruthy();
      expect(card.summary).toBeTruthy();
      expect(card.authorNeed).toBeTruthy();
      expect(card.potentialUserOffer).toBeTruthy();
      expect(card.whyRelevant).toBeTruthy();
      expect(card.suggestedNextAction).toBeTruthy();
      expect(card.sourceLink).toBeTruthy();
      expect(card.renderedText).toBeTruthy();
    });

    it('score matches situation score', () => {
      const { card, situation } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.score).toBe(situation.opportunityScore.total);
    });

    it('geography includes Thailand', () => {
      const { card } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.geography).toContain('Thailand');
    });

    it('source link is set to the real fixture permalink', () => {
      const { card } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.sourceLink).toBe('https://fixture.test/r/internationalbusiness/f01');
    });
  });

  describe('renderedText', () => {
    it('contains opportunity type', () => {
      const { card } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.renderedText).toContain('OPPORTUNITY CARD');
    });

    it('contains score', () => {
      const { card } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.renderedText).toContain(`${card.score}/100`);
    });

    it('contains author username', () => {
      const { card } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.renderedText).toContain(A01_THAI_MANUFACTURER.username);
    });

    it('contains SUMMARY section', () => {
      const { card } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.renderedText).toContain('SUMMARY');
    });

    it('contains AUTHOR NEED section', () => {
      const { card } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.renderedText).toContain('AUTHOR NEED');
    });

    it('contains SUGGESTED NEXT ACTION section', () => {
      const { card } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.renderedText).toContain('SUGGESTED NEXT ACTION');
    });

    it('contains CAPABILITY MATCHES section', () => {
      const { card } = prepareCard(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(card.renderedText).toContain('CAPABILITY MATCHES');
    });
  });

  describe('F02: Russian SaaS card', () => {
    it('produces valid card', () => {
      const { card } = prepareCard(F02_RUSSIAN_SAAS, A02_RUSSIAN_SAAS);
      expect(card.situationId).toBeTruthy();
      expect(card.score).toBeGreaterThan(0);
    });

    it('why relevant mentions geography', () => {
      const { card } = prepareCard(F02_RUSSIAN_SAAS, A02_RUSSIAN_SAAS);
      expect(card.whyRelevant).toMatch(/Russia|EU|partnership/i);
    });
  });

  describe('Card without matches', () => {
    it('still produces valid card with empty matches', () => {
      const content = normalizer.normalize(F01_THAI_MANUFACTURER, 'fixture');
      const situation = extractor.extract(content, A01_THAI_MANUFACTURER, 'run-test');
      situation.opportunityScore = scorer.score(situation, USER_CAPABILITIES);
      situation.relationshipConfidence = confidenceCalc.calculate(situation, A01_THAI_MANUFACTURER);
      const card = formatter.format(situation, [], A01_THAI_MANUFACTURER);
      expect(card.renderedText).toContain('No direct capability match');
    });
  });

  describe('Permalink handling', () => {
    it('sourceLink uses the real permalink from the situation', () => {
      const content = normalizer.normalize(F01_THAI_MANUFACTURER, 'fixture');
      const situation = extractor.extract(content, A01_THAI_MANUFACTURER, 'run-test');
      situation.opportunityScore = scorer.score(situation, USER_CAPABILITIES);
      situation.relationshipConfidence = confidenceCalc.calculate(situation, A01_THAI_MANUFACTURER);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      const card = formatter.format(situation, matches, A01_THAI_MANUFACTURER);
      expect(card.sourceLink).toBe('https://fixture.test/r/internationalbusiness/f01');
    });

    it('sourceLink falls back to content: when permalink is empty', () => {
      const content = normalizer.normalize(F01_THAI_MANUFACTURER, 'fixture');
      const situation = extractor.extract(content, A01_THAI_MANUFACTURER, 'run-test');
      // Force empty permalink to test fallback
      situation.permalink = '';
      situation.opportunityScore = scorer.score(situation, USER_CAPABILITIES);
      situation.relationshipConfidence = confidenceCalc.calculate(situation, A01_THAI_MANUFACTURER);
      const matches = matcher.match(situation, USER_CAPABILITIES);
      const card = formatter.format(situation, matches, A01_THAI_MANUFACTURER);
      expect(card.sourceLink).toMatch(/^content:/);
      expect(card.sourceLink).toContain('f01-thai-manufacturer');
    });
  });
});
