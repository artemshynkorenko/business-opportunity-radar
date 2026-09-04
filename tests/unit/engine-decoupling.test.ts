import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Architectural guard (audit requirement 7):
 * no generic engine component may depend on a specific user's configuration
 * (USER_CAPABILITIES) or a concrete profile (ARTEM_PROFILE / ANTON_PROFILE / the
 * profiles module). The engine must depend only on the UserProfile abstraction.
 */

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '../../src');

// True generic-engine components (excludes the matching *configuration* files
// user-capabilities.ts, profiles.ts, and the matching barrel index.ts).
const ENGINE_FILES = [
  'scoring/weighted-opportunity-scorer.ts',
  'scoring/opportunity-scorer-interface.ts',
  'scoring/relationship-confidence-calculator.ts',
  'matching/capability-based-matcher.ts',
  'matching/user-matcher-interface.ts',
  'detection/rule-based-detector.ts',
  'extraction/deterministic-extractor.ts',
  'extraction/situation-extractor-interface.ts',
  'pipeline/pipeline.ts',
  'domain/index.ts',
  'cards/default-card-formatter.ts',
];

const FORBIDDEN = ['USER_CAPABILITIES', 'ARTEM_PROFILE', 'ANTON_PROFILE', 'user-capabilities', '/profiles'];

describe('Generic engine decoupling from user-specific configuration', () => {
  for (const rel of ENGINE_FILES) {
    it(`${rel} does not reference user-specific configuration`, () => {
      const source = readFileSync(resolve(srcRoot, rel), 'utf8');
      for (const token of FORBIDDEN) {
        expect(source.includes(token), `${rel} must not reference "${token}"`).toBe(false);
      }
    });
  }
});
