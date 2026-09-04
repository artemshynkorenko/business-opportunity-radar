import type { UserProfile } from '../domain/index.js';
import { USER_CAPABILITIES } from './user-capabilities.js';

/**
 * Example / demo user profiles.
 *
 * These are fixtures that exercise the generic engine — they are NOT system
 * configuration and the generic engine must never import them. A profile is
 * passed into scoring/matching as input data.
 */

/**
 * Artem — the original radar owner, now expressed as one UserProfile among many.
 *
 * The `geographies` weights reproduce the priorities previously hardcoded in the
 * scorer (Thailand 10, Russia/CIS 10, EU 8, SEA 8, USA 7). Moving them here keeps
 * Artem's scores unchanged while removing the Artem-specific table from the
 * generic engine.
 */
export const ARTEM_PROFILE: UserProfile = {
  id: 'user-artem',
  displayName: 'Artem',
  interests: ['international business', 'trade', 'distribution', 'automation'],
  goals: [
    'partnership',
    'distribution',
    'market-entry',
    'sourcing',
    'automation',
    'acquisition',
    'succession',
    'cofounder',
  ],
  capabilities: USER_CAPABILITIES,
  geographies: [
    { region: 'Thailand', weight: 10 },
    { region: 'Russia', weight: 10 },
    { region: 'CIS', weight: 10 },
    { region: 'EU', weight: 8 },
    { region: 'Czech Republic', weight: 8 },
    { region: 'SEA', weight: 8 },
    { region: 'USA', weight: 7 },
  ],
  languages: ['en', 'ru', 'th'],
  exclusions: [],
};

/**
 * Anton — a second example profile with different interests and NO declared
 * capabilities. Used to prove that interests are not treated as capabilities and
 * that a profile with no geographic preferences does not inherit Artem's.
 *
 * Capabilities are intentionally empty; do not invent any. Geographies/languages
 * are intentionally left empty because none were explicitly provided.
 */
export const ANTON_PROFILE: UserProfile = {
  id: 'user-anton',
  displayName: 'Anton',
  interests: ['filmmaking', 'food business', 'motorcycles'],
  goals: ['interesting people', 'relationships', 'business partners', 'projects'],
  capabilities: [],
  geographies: [],
  languages: [],
  exclusions: [],
};
