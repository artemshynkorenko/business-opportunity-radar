import { describe, it, expect } from 'vitest';
import { DeterministicSituationExtractor } from '../../src/extraction/deterministic-extractor.js';
import { FixtureNormalizer } from '../../src/normalization/fixture-normalizer.js';
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

const extractor = new DeterministicSituationExtractor();
const normalizer = new FixtureNormalizer();
const SOURCE = 'fixture';

function extract(raw: unknown, author: import('../../src/domain/index.js').Author) {
  const content = normalizer.normalize(raw, SOURCE);
  return extractor.extract(content, author, 'run-test');
}

describe('DeterministicSituationExtractor', () => {
  describe('F01: Thai manufacturer', () => {
    it('extracts Thailand geography (explicit)', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(situation.geographies).toContain('Thailand');
    });

    it('marks Thailand geography as explicit evidence', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      const geoEvidence = situation.evidence.find(
        (e) => e.claim.includes('Thailand') && e.explicit
      );
      expect(geoEvidence).toBeDefined();
      expect(geoEvidence?.explicit).toBe(true);
    });

    it('extracts established business stage', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(situation.businessStage).toBe('established');
    });

    it('identifies distribution opportunity type', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(situation.opportunityTypes).toContain('distribution');
    });

    it('identifies EU distribution need', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(situation.needs.some((n) => n.toLowerCase().includes('eu') || n.toLowerCase().includes('distribut'))).toBe(true);
    });

    it('sets status to new', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(situation.status).toBe('new');
    });

    it('sets authorId from author', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(situation.authorId).toBe('author-somchai');
    });

    it('includes source content ID', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(situation.sourceContentIds).toContain('f01-thai-manufacturer');
    });

    it('has non-empty title and summary', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(situation.title).toBeTruthy();
      expect(situation.summary).toBeTruthy();
    });

    it('has at least one possible user role', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(situation.possibleUserRoles.length).toBeGreaterThan(0);
    });
  });

  describe('F02: Russian SaaS', () => {
    it('extracts Russia geography', () => {
      const situation = extract(F02_RUSSIAN_SAAS, A02_RUSSIAN_SAAS);
      expect(situation.geographies).toContain('Russia');
    });

    it('extracts EU geography (multiple geos)', () => {
      const situation = extract(F02_RUSSIAN_SAAS, A02_RUSSIAN_SAAS);
      expect(situation.geographies).toContain('EU');
    });

    it('identifies partnership opportunity type', () => {
      const situation = extract(F02_RUSSIAN_SAAS, A02_RUSSIAN_SAAS);
      expect(situation.opportunityTypes).toContain('partnership');
    });
  });

  describe('F03: Restaurant automation', () => {
    it('extracts Thailand geography', () => {
      const situation = extract(F03_RESTAURANT_AUTOMATION, A03_RESTAURANT);
      expect(situation.geographies).toContain('Thailand');
    });

    it('identifies automation opportunity type', () => {
      const situation = extract(F03_RESTAURANT_AUTOMATION, A03_RESTAURANT);
      expect(situation.opportunityTypes).toContain('automation');
    });

    it('includes automation in needs', () => {
      const situation = extract(F03_RESTAURANT_AUTOMATION, A03_RESTAURANT);
      expect(situation.needs.some((n) => n.toLowerCase().includes('automat'))).toBe(true);
    });

    it('suggests automation-implementer role', () => {
      const situation = extract(F03_RESTAURANT_AUTOMATION, A03_RESTAURANT);
      expect(situation.possibleUserRoles).toContain('automation-implementer');
    });
  });

  describe('F05: Thai succession', () => {
    it('extracts Thailand geography', () => {
      const situation = extract(F05_THAI_SUCCESSION, A05_THAI_FACTORY);
      expect(situation.geographies).toContain('Thailand');
    });

    it('identifies succession opportunity type', () => {
      const situation = extract(F05_THAI_SUCCESSION, A05_THAI_FACTORY);
      expect(situation.opportunityTypes).toContain('succession');
    });

    it('identifies established business stage', () => {
      const situation = extract(F05_THAI_SUCCESSION, A05_THAI_FACTORY);
      expect(situation.businessStage).toBe('established');
    });
  });

  describe('Evidence explicit vs inferred distinction', () => {
    it('geography from direct mention is marked explicit=true', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      const geoEvidence = situation.evidence.filter((e) => e.claim.includes('Geography:'));
      expect(geoEvidence.every((e) => e.explicit)).toBe(true);
    });

    it('inferred fields have explicit=false', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      const inferredEvidence = situation.evidence.filter((e) => e.source === 'inferred');
      for (const e of inferredEvidence) {
        expect(e.explicit).toBe(false);
      }
    });

    it('all evidence items have confidence between 0 and 1', () => {
      const situation = extract(F02_RUSSIAN_SAAS, A02_RUSSIAN_SAAS);
      for (const e of situation.evidence) {
        expect(e.confidence).toBeGreaterThanOrEqual(0);
        expect(e.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Situation structure completeness', () => {
    it('all required fields are present and non-null', () => {
      const situation = extract(F01_THAI_MANUFACTURER, A01_THAI_MANUFACTURER);
      expect(situation.situationId).toBeTruthy();
      expect(situation.title).toBeTruthy();
      expect(situation.summary).toBeTruthy();
      expect(situation.authorId).toBeTruthy();
      expect(Array.isArray(situation.sourceContentIds)).toBe(true);
      expect(Array.isArray(situation.geographies)).toBe(true);
      expect(Array.isArray(situation.evidence)).toBe(true);
      expect(Array.isArray(situation.needs)).toBe(true);
      expect(Array.isArray(situation.assets)).toBe(true);
      expect(Array.isArray(situation.opportunityTypes)).toBe(true);
      expect(situation.createdAt).toBeInstanceOf(Date);
      expect(situation.updatedAt).toBeInstanceOf(Date);
    });
  });
});
