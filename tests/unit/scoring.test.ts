import { describe, it, expect } from 'vitest';
import { WeightedOpportunityScorer } from '../../src/scoring/weighted-opportunity-scorer.js';
import { RelationshipConfidenceCalculator } from '../../src/scoring/relationship-confidence-calculator.js';
import { SCORE_WEIGHTS } from '../../src/scoring/score-weights.js';
import { FixtureNormalizer } from '../../src/normalization/fixture-normalizer.js';
import { DeterministicSituationExtractor } from '../../src/extraction/deterministic-extractor.js';
import { ARTEM_PROFILE } from '../../src/matching/profiles.js';
import type { UserProfile } from '../../src/domain/index.js';
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

const scorer = new WeightedOpportunityScorer();
const confidenceCalc = new RelationshipConfidenceCalculator();
const normalizer = new FixtureNormalizer();
const extractor = new DeterministicSituationExtractor();

function extractSituation(raw: unknown, author: Author): Situation {
  const content = normalizer.normalize(raw, 'fixture');
  return extractor.extract(content, author, 'run-test');
}

describe('SCORE_WEIGHTS', () => {
  it('weights sum to exactly 100', () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('contains all 10 required factors', () => {
    const keys = Object.keys(SCORE_WEIGHTS);
    expect(keys).toContain('needPain');
    expect(keys).toContain('userFit');
    expect(keys).toContain('existingBusinessTraction');
    expect(keys).toContain('economicPotential');
    expect(keys).toContain('demandCapacityMismatch');
    expect(keys).toContain('timing');
    expect(keys).toContain('actionability');
    expect(keys).toContain('geography');
    expect(keys).toContain('evidenceCredibility');
    expect(keys).toContain('crossSourceConfirmation');
  });
});

describe('WeightedOpportunityScorer', () => {
  it('returns total between 0 and 100', () => {
    const situation = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const score = scorer.score(situation, ARTEM_PROFILE);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('breakdown keys match SCORE_WEIGHTS keys', () => {
    const situation = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const score = scorer.score(situation, ARTEM_PROFILE);
    for (const key of Object.keys(SCORE_WEIGHTS)) {
      expect(score.breakdown).toHaveProperty(key);
    }
  });

  it('breakdown scores do not exceed their weight', () => {
    const situation = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const score = scorer.score(situation, ARTEM_PROFILE);
    for (const [key, entry] of Object.entries(score.breakdown)) {
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(entry.weight + 1); // +1 for rounding
      expect(entry.weight).toBe(SCORE_WEIGHTS[key as keyof typeof SCORE_WEIGHTS]);
    }
  });

  it('each breakdown entry has a non-empty explanation', () => {
    const situation = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const score = scorer.score(situation, ARTEM_PROFILE);
    for (const entry of Object.values(score.breakdown)) {
      expect(entry.explanation).toBeTruthy();
      expect(entry.explanation.length).toBeGreaterThan(5);
    }
  });

  it('F01 Thai manufacturer scores higher than F03 restaurant automation', () => {
    const s1 = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const s3 = extractSituation(F03_RESTAURANT_AUTOMATION, A03_RESTAURANT);
    const score1 = scorer.score(s1, ARTEM_PROFILE);
    const score3 = scorer.score(s3, ARTEM_PROFILE);
    // Thai manufacturer with established biz should outscore restaurant automation
    expect(score1.total).toBeGreaterThan(score3.total);
  });

  it('F02 Russian SaaS scores high due to geography and user fit', () => {
    const situation = extractSituation(F02_RUSSIAN_SAAS, A02_RUSSIAN_SAAS);
    const score = scorer.score(situation, ARTEM_PROFILE);
    // Russia/CIS + EU + partnership should get substantial score
    expect(score.total).toBeGreaterThan(30);
  });

  it('F05 Thai succession gets high geography score', () => {
    const situation = extractSituation(F05_THAI_SUCCESSION, A05_THAI_FACTORY);
    const score = scorer.score(situation, ARTEM_PROFILE);
    expect(score.breakdown.geography.score).toBeGreaterThan(0);
  });

  it('geography factor: Thailand scores higher than unknown geography', () => {
    const thaiSit = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    thaiSit.geographies = ['Unknown'];
    const score1 = scorer.score(thaiSit, ARTEM_PROFILE);
    
    const thaiSit2 = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const score2 = scorer.score(thaiSit2, ARTEM_PROFILE);
    
    expect(score2.breakdown.geography.score).toBeGreaterThan(score1.breakdown.geography.score);
  });

  it('score with no user capabilities returns low userFit score', () => {
    const situation = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const emptyProfile: UserProfile = {
      id: 'empty',
      displayName: 'Empty',
      interests: [],
      goals: [],
      capabilities: [],
      geographies: [],
      languages: [],
      exclusions: [],
    };
    const score = scorer.score(situation, emptyProfile);
    expect(score.breakdown.userFit.score).toBe(0);
  });

  it('returns non-empty explanation string', () => {
    const situation = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const score = scorer.score(situation, ARTEM_PROFILE);
    expect(score.explanation).toBeTruthy();
  });
});

describe('RelationshipConfidenceCalculator', () => {
  it('returns score between 0 and 100', () => {
    const situation = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const conf = confidenceCalc.calculate(situation, A01_THAI_MANUFACTURER);
    expect(conf.score).toBeGreaterThanOrEqual(0);
    expect(conf.score).toBeLessThanOrEqual(100);
  });

  it('experienced author with high karma scores higher', () => {
    const situation = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const highConf = confidenceCalc.calculate(situation, A01_THAI_MANUFACTURER); // karma=1240
    
    const newAuthor: Author = {
      id: 'new-author',
      sourceId: 'fixture',
      username: 'new_user',
      accountAgeDays: 5,
      karma: 3,
    };
    const lowConf = confidenceCalc.calculate(situation, newAuthor);
    expect(highConf.score).toBeGreaterThan(lowConf.score);
  });

  it('verified author gets higher score', () => {
    const situation = extractSituation(F02_RUSSIAN_SAAS, A02_RUSSIAN_SAAS);
    const verifiedConf = confidenceCalc.calculate(situation, A02_RUSSIAN_SAAS); // verified=true
    
    const unverified = { ...A02_RUSSIAN_SAAS, verified: false };
    const unverifiedConf = confidenceCalc.calculate(situation, unverified);
    
    expect(verifiedConf.score).toBeGreaterThan(unverifiedConf.score);
  });

  it('returns non-empty factors array', () => {
    const situation = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const conf = confidenceCalc.calculate(situation, A01_THAI_MANUFACTURER);
    expect(conf.factors.length).toBeGreaterThan(0);
  });

  it('returns non-empty explanation', () => {
    const situation = extractSituation(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
    const conf = confidenceCalc.calculate(situation, A01_THAI_MANUFACTURER);
    expect(conf.explanation).toBeTruthy();
  });
});
