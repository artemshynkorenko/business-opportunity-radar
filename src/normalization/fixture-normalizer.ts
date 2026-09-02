import type { NormalizedContent, ContentType } from '../domain/index.js';
import type { NormalizerInterface } from './normalizer-interface.js';

/**
 * Raw fixture object shape — used only for synthetic test data.
 * This is a well-defined intermediate format, not tied to any real API.
 */
export interface RawFixtureContent {
  id: string;
  authorId: string;
  communityId?: string;
  text: string;
  title?: string;
  timestamp: string; // ISO 8601
  permalink: string;
  language?: string;
  contentType?: ContentType;
  metadata?: Record<string, unknown>;
}

/**
 * Deterministic normalizer for synthetic fixture objects.
 * Validates required fields and maps them to NormalizedContent.
 */
export class FixtureNormalizer implements NormalizerInterface {
  normalize(raw: unknown, sourceId: string): NormalizedContent {
    const fixture = this.validate(raw);

    return {
      contentId: fixture.id,
      sourceId,
      authorId: fixture.authorId,
      communityId: fixture.communityId,
      text: fixture.text,
      title: fixture.title,
      timestamp: new Date(fixture.timestamp),
      permalink: fixture.permalink,
      language: fixture.language,
      contentType: fixture.contentType ?? 'post',
      metadata: fixture.metadata ?? {},
    };
  }

  private validate(raw: unknown): RawFixtureContent {
    if (raw === null || typeof raw !== 'object') {
      throw new Error('FixtureNormalizer: raw must be a non-null object');
    }

    const obj = raw as Record<string, unknown>;

    const requiredStrings: (keyof RawFixtureContent)[] = [
      'id',
      'authorId',
      'text',
      'timestamp',
      'permalink',
    ];

    for (const field of requiredStrings) {
      if (typeof obj[field] !== 'string' || (obj[field] as string).length === 0) {
        throw new Error(`FixtureNormalizer: missing or empty required field '${field}'`);
      }
    }

    // Validate timestamp is parseable
    const ts = new Date(obj['timestamp'] as string);
    if (isNaN(ts.getTime())) {
      throw new Error(`FixtureNormalizer: 'timestamp' is not a valid ISO date`);
    }

    return obj as unknown as RawFixtureContent;
  }
}
