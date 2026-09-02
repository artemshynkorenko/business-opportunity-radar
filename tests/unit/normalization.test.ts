import { describe, it, expect } from 'vitest';
import { FixtureNormalizer } from '../../src/normalization/fixture-normalizer.js';
import {
  F01_THAI_MANUFACTURER,
  F02_RUSSIAN_SAAS,
  F03_RESTAURANT_AUTOMATION,
  F06_CRYPTO_NOISE,
} from '../fixtures/raw-fixtures.js';

const normalizer = new FixtureNormalizer();
const SOURCE_ID = 'fixture';

describe('FixtureNormalizer', () => {
  it('preserves all required fields from F01', () => {
    const content = normalizer.normalize(F01_THAI_MANUFACTURER, SOURCE_ID);
    expect(content.contentId).toBe('f01-thai-manufacturer');
    expect(content.sourceId).toBe(SOURCE_ID);
    expect(content.authorId).toBe('author-somchai');
    expect(content.communityId).toBe('r-internationalbusiness');
    expect(content.text).toBe(F01_THAI_MANUFACTURER.text);
    expect(content.title).toBe(F01_THAI_MANUFACTURER.title);
    expect(content.timestamp).toBeInstanceOf(Date);
    expect(content.permalink).toBe(F01_THAI_MANUFACTURER.permalink);
    expect(content.language).toBe('en');
    expect(content.contentType).toBe('post');
  });

  it('preserves metadata unchanged', () => {
    const content = normalizer.normalize(F01_THAI_MANUFACTURER, SOURCE_ID);
    expect(content.metadata).toEqual({ subreddit: 'internationalbusiness', score: 47, comments: 12 });
  });

  it('parses timestamp to Date', () => {
    const content = normalizer.normalize(F02_RUSSIAN_SAAS, SOURCE_ID);
    expect(content.timestamp).toBeInstanceOf(Date);
    expect(content.timestamp.getFullYear()).toBe(2024);
  });

  it('uses default contentType=post when not specified', () => {
    const raw = { ...F03_RESTAURANT_AUTOMATION };
    delete (raw as Partial<typeof raw>).contentType;
    const content = normalizer.normalize(raw, SOURCE_ID);
    expect(content.contentType).toBe('post');
  });

  it('uses empty metadata when not specified', () => {
    const raw = { ...F01_THAI_MANUFACTURER, metadata: undefined };
    const content = normalizer.normalize(raw, SOURCE_ID);
    expect(content.metadata).toEqual({});
  });

  it('sets sourceId from parameter, not from raw object', () => {
    const content = normalizer.normalize(F06_CRYPTO_NOISE, 'custom-source');
    expect(content.sourceId).toBe('custom-source');
  });

  it('throws on missing required field: id', () => {
    const bad = { ...F01_THAI_MANUFACTURER, id: '' };
    expect(() => normalizer.normalize(bad, SOURCE_ID)).toThrow("missing or empty required field 'id'");
  });

  it('throws on missing required field: text', () => {
    const bad = { ...F01_THAI_MANUFACTURER, text: '' };
    expect(() => normalizer.normalize(bad, SOURCE_ID)).toThrow("missing or empty required field 'text'");
  });

  it('throws on invalid timestamp', () => {
    const bad = { ...F01_THAI_MANUFACTURER, timestamp: 'not-a-date' };
    expect(() => normalizer.normalize(bad, SOURCE_ID)).toThrow("not a valid ISO date");
  });

  it('throws on non-object input', () => {
    expect(() => normalizer.normalize('string', SOURCE_ID)).toThrow('must be a non-null object');
    expect(() => normalizer.normalize(null, SOURCE_ID)).toThrow('must be a non-null object');
    expect(() => normalizer.normalize(42, SOURCE_ID)).toThrow('must be a non-null object');
  });

  it('source isolation: no Reddit-specific fields in NormalizedContent', () => {
    const content = normalizer.normalize(F01_THAI_MANUFACTURER, SOURCE_ID);
    const contentKeys = Object.keys(content);
    expect(contentKeys).not.toContain('subreddit');
    expect(contentKeys).not.toContain('upvotes');
    expect(contentKeys).not.toContain('flair');
    expect(contentKeys).not.toContain('reddit');
  });
});
