import { describe, it, expect } from 'vitest';
import { RuleBasedCandidateDetector } from '../../src/detection/rule-based-detector.js';
import { FixtureNormalizer } from '../../src/normalization/fixture-normalizer.js';
import {
  F01_THAI_MANUFACTURER,
  F02_RUSSIAN_SAAS,
  F03_RESTAURANT_AUTOMATION,
  F04_EU_SEA_ENTRY,
  F05_THAI_SUCCESSION,
  F06_CRYPTO_NOISE,
  F07_JOB_SEEKING,
  F08_MOTIVATIONAL,
  F09_EU_SOURCING,
  F10_MLM_NOISE,
} from '../fixtures/raw-fixtures.js';

const detector = new RuleBasedCandidateDetector();
const normalizer = new FixtureNormalizer();
const SOURCE = 'fixture';

function detect(raw: unknown) {
  const content = normalizer.normalize(raw, SOURCE);
  return detector.detect(content);
}

describe('RuleBasedCandidateDetector — positive cases', () => {
  it('F01: Thai manufacturer — detects sourcing + market-entry signals', () => {
    const result = detect(F01_THAI_MANUFACTURER);
    expect(result.isCandidate).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.25);
    expect(result.signalTypes).toContain('sourcing');
  });

  it('F02: Russian SaaS — detects partnership + market-entry + existing-business signals', () => {
    const result = detect(F02_RUSSIAN_SAAS);
    expect(result.isCandidate).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.25);
    expect(result.signalTypes.some((s) => ['partnership-request', 'market-entry', 'existing-business-traction'].includes(s))).toBe(true);
  });

  it('F03: Restaurant automation — detects automation-pain signal', () => {
    const result = detect(F03_RESTAURANT_AUTOMATION);
    expect(result.isCandidate).toBe(true);
    expect(result.signalTypes).toContain('automation-pain');
  });

  it('F04: EU company SEA entry — detects market-entry signal', () => {
    const result = detect(F04_EU_SEA_ENTRY);
    expect(result.isCandidate).toBe(true);
    expect(result.signalTypes).toContain('market-entry');
  });

  it('F05: Thai succession — detects acquisition-succession signal', () => {
    const result = detect(F05_THAI_SUCCESSION);
    expect(result.isCandidate).toBe(true);
    expect(result.signalTypes).toContain('acquisition-succession');
  });

  it('F09: EU sourcing — detects sourcing signal', () => {
    const result = detect(F09_EU_SOURCING);
    expect(result.isCandidate).toBe(true);
    expect(result.signalTypes).toContain('sourcing');
  });

  it('positive results include reasons', () => {
    const result = detect(F01_THAI_MANUFACTURER);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

describe('RuleBasedCandidateDetector — negative cases (noise rejection)', () => {
  it('F06: Crypto pump — rejected', () => {
    const result = detect(F06_CRYPTO_NOISE);
    expect(result.isCandidate).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.reasons.some((r) => r.includes('crypto-web3'))).toBe(true);
  });

  it('F07: Job seeking — rejected', () => {
    const result = detect(F07_JOB_SEEKING);
    expect(result.isCandidate).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.reasons.some((r) => r.includes('job-seeking'))).toBe(true);
  });

  it('F08: Motivational — rejected', () => {
    const result = detect(F08_MOTIVATIONAL);
    expect(result.isCandidate).toBe(false);
  });

  it('F10: MLM — rejected', () => {
    const result = detect(F10_MLM_NOISE);
    expect(result.isCandidate).toBe(false);
    expect(result.reasons.some((r) => r.includes('mlm'))).toBe(true);
  });

  it('rejected results have confidence=0', () => {
    for (const raw of [F06_CRYPTO_NOISE, F07_JOB_SEEKING, F10_MLM_NOISE]) {
      const result = detect(raw);
      expect(result.confidence).toBe(0);
    }
  });

  it('rejected results have empty signalTypes', () => {
    for (const raw of [F06_CRYPTO_NOISE, F07_JOB_SEEKING, F10_MLM_NOISE]) {
      const result = detect(raw);
      expect(result.signalTypes).toHaveLength(0);
    }
  });
});

describe('RuleBasedCandidateDetector — plain text inputs', () => {
  it('rejects generic announcement text', () => {
    const raw = {
      id: 'test-generic',
      authorId: 'a1',
      text: 'Just launched my new website. Check us out! Follow us on social media. Subscribe to my newsletter.',
      timestamp: '2024-01-01T00:00:00Z',
      permalink: 'https://test.test/generic',
    };
    const content = normalizer.normalize(raw, SOURCE);
    const result = detector.detect(content);
    // Should either be rejected or have very low confidence
    if (result.isCandidate) {
      expect(result.confidence).toBeLessThan(0.5);
    }
  });

  it('detects explicit business need', () => {
    const raw = {
      id: 'test-need',
      authorId: 'a2',
      text: 'We are a manufacturer in Thailand looking for an EU distributor to help us enter the European market. Our production capacity is 100k units/month.',
      timestamp: '2024-01-01T00:00:00Z',
      permalink: 'https://test.test/need',
    };
    const content = normalizer.normalize(raw, SOURCE);
    const result = detector.detect(content);
    expect(result.isCandidate).toBe(true);
    expect(result.signalTypes.length).toBeGreaterThan(0);
  });
});
