import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryDeduplicator } from '../../src/deduplication/in-memory-deduplicator.js';
import type { NormalizedContent } from '../../src/domain/index.js';

function makeContent(overrides: Partial<NormalizedContent> = {}): NormalizedContent {
  return {
    contentId: 'content-1',
    sourceId: 'source-a',
    authorId: 'author-1',
    communityId: 'community-1',
    text: 'We are looking for an EU distribution partner for our Thai products.',
    title: 'Seeking EU distributor',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    permalink: 'https://example.com/post/1',
    language: 'en',
    contentType: 'post',
    metadata: {},
    ...overrides,
  };
}

describe('InMemoryDeduplicator', () => {
  let deduplicator: InMemoryDeduplicator;

  beforeEach(() => {
    deduplicator = new InMemoryDeduplicator();
  });

  describe('fresh deduplicator', () => {
    it('returns not-duplicate for any content before markSeen is called', () => {
      const content = makeContent();
      const result = deduplicator.check(content);
      expect(result.isDuplicate).toBe(false);
    });

    it('returns not-duplicate for multiple different items', () => {
      const c1 = makeContent({ contentId: 'id-1', text: 'Hello world' });
      const c2 = makeContent({ contentId: 'id-2', text: 'Something else entirely' });
      expect(deduplicator.check(c1).isDuplicate).toBe(false);
      expect(deduplicator.check(c2).isDuplicate).toBe(false);
    });
  });

  describe('exact contentId duplicate', () => {
    it('returns isDuplicate: true after markSeen with same contentId', () => {
      const content = makeContent({ contentId: 'exact-id-1' });
      deduplicator.markSeen(content);
      const result = deduplicator.check(content);
      expect(result.isDuplicate).toBe(true);
      expect(result.reason).toMatch(/contentId/i);
      expect(result.existingContentId).toBe('exact-id-1');
    });

    it('exact duplicate detected even if text differs (contentId is primary key)', () => {
      const original = makeContent({ contentId: 'exact-id-2', text: 'Original text' });
      const modified = makeContent({ contentId: 'exact-id-2', text: 'Completely different text' });
      deduplicator.markSeen(original);
      const result = deduplicator.check(modified);
      expect(result.isDuplicate).toBe(true);
    });
  });

  describe('same content reprocessed', () => {
    it('check returns not-duplicate before markSeen, duplicate after markSeen', () => {
      const content = makeContent({ contentId: 'reprocess-1' });
      expect(deduplicator.check(content).isDuplicate).toBe(false);
      deduplicator.markSeen(content);
      expect(deduplicator.check(content).isDuplicate).toBe(true);
    });
  });

  describe('same-source fingerprint deduplication', () => {
    it('different contentId but identical text from SAME source → isDuplicate: true', () => {
      const original = makeContent({
        contentId: 'id-original',
        sourceId: 'source-a',
        text: 'Identical text content here.',
      });
      const repost = makeContent({
        contentId: 'id-repost',
        sourceId: 'source-a',
        text: 'Identical text content here.',
      });
      deduplicator.markSeen(original);
      const result = deduplicator.check(repost);
      expect(result.isDuplicate).toBe(true);
      expect(result.reason).toMatch(/fingerprint|source/i);
      expect(result.existingContentId).toBe('id-original');
    });

    it('fingerprint normalizes whitespace — extra spaces still match', () => {
      const original = makeContent({
        contentId: 'ws-original',
        sourceId: 'source-a',
        text: 'Looking  for   a partner.',
      });
      const spacey = makeContent({
        contentId: 'ws-different-id',
        sourceId: 'source-a',
        text: 'Looking for a partner.',
      });
      deduplicator.markSeen(original);
      const result = deduplicator.check(spacey);
      expect(result.isDuplicate).toBe(true);
    });

    it('fingerprint normalizes case — uppercase version is still a duplicate', () => {
      const original = makeContent({
        contentId: 'case-original',
        sourceId: 'source-a',
        text: 'looking for a partner',
      });
      const uppercase = makeContent({
        contentId: 'case-different-id',
        sourceId: 'source-a',
        text: 'LOOKING FOR A PARTNER',
      });
      deduplicator.markSeen(original);
      const result = deduplicator.check(uppercase);
      expect(result.isDuplicate).toBe(true);
    });
  });

  describe('cross-source is NOT a duplicate', () => {
    it('different contentIds with identical text from DIFFERENT sources → isDuplicate: false', () => {
      const sourceA = makeContent({
        contentId: 'cross-id-a',
        sourceId: 'source-a',
        text: 'We need an EU distribution partner for Thai ceramics.',
      });
      const sourceB = makeContent({
        contentId: 'cross-id-b',
        sourceId: 'source-b',
        text: 'We need an EU distribution partner for Thai ceramics.',
      });
      deduplicator.markSeen(sourceA);
      const result = deduplicator.check(sourceB);
      expect(result.isDuplicate).toBe(false);
    });

    it('cross-source confirmation: marking source-a seen does not block source-b', () => {
      const text = 'Looking for a manufacturing partner in Southeast Asia.';
      const fromReddit = makeContent({ contentId: 'reddit-1', sourceId: 'reddit', text });
      const fromThreads = makeContent({ contentId: 'threads-1', sourceId: 'threads', text });

      deduplicator.markSeen(fromReddit);
      deduplicator.markSeen(fromThreads);

      // Neither should block the other retroactively
      // But after markSeen, re-checking the same content should be duplicate
      expect(deduplicator.check(fromReddit).isDuplicate).toBe(true);
      expect(deduplicator.check(fromThreads).isDuplicate).toBe(true);

      // A new item from a third source with same text should NOT be duplicate
      const fromLinkedIn = makeContent({ contentId: 'li-1', sourceId: 'linkedin', text });
      expect(deduplicator.check(fromLinkedIn).isDuplicate).toBe(false);
    });
  });

  describe('legitimately different content', () => {
    it('different posts with similar but not identical text → isDuplicate: false', () => {
      const post1 = makeContent({
        contentId: 'diff-1',
        sourceId: 'source-a',
        text: 'Looking for an EU distribution partner for Thai ceramics.',
      });
      const post2 = makeContent({
        contentId: 'diff-2',
        sourceId: 'source-a',
        text: 'Looking for a US market entry partner for Vietnamese products.',
      });
      deduplicator.markSeen(post1);
      const result = deduplicator.check(post2);
      expect(result.isDuplicate).toBe(false);
    });

    it('completely different posts are not duplicates', () => {
      const post1 = makeContent({ contentId: 'uniq-1', sourceId: 'src', text: 'Alpha' });
      const post2 = makeContent({ contentId: 'uniq-2', sourceId: 'src', text: 'Beta' });
      const post3 = makeContent({ contentId: 'uniq-3', sourceId: 'src', text: 'Gamma' });
      deduplicator.markSeen(post1);
      deduplicator.markSeen(post2);
      expect(deduplicator.check(post3).isDuplicate).toBe(false);
    });
  });

  describe('reset()', () => {
    it('after reset, previously-seen content is no longer a duplicate', () => {
      const content = makeContent({ contentId: 'reset-test-1' });
      deduplicator.markSeen(content);
      expect(deduplicator.check(content).isDuplicate).toBe(true);

      deduplicator.reset();
      expect(deduplicator.check(content).isDuplicate).toBe(false);
    });

    it('after reset, fingerprint dedup also clears', () => {
      const content = makeContent({ contentId: 'reset-fp', sourceId: 'src', text: 'Same text.' });
      const dupe = makeContent({ contentId: 'reset-fp-dupe', sourceId: 'src', text: 'Same text.' });
      deduplicator.markSeen(content);
      expect(deduplicator.check(dupe).isDuplicate).toBe(true);

      deduplicator.reset();
      expect(deduplicator.check(dupe).isDuplicate).toBe(false);
    });
  });
});
