import type { UserCapability } from '../domain/index.js';

/**
 * Example capability list for one user (Artem).
 *
 * This is a development/demo fixture, NOT system configuration. The generic
 * engine must never import this directly; it receives a UserProfile as data.
 * Retained (and exported) because existing profiles compose from it.
 */
export const USER_CAPABILITIES: UserCapability[] = [
  {
    capabilityId: 'cap-eu-market',
    assetType: 'market-access',
    asset: 'EU market access',
    strength: 9,
    geographies: ['EU', 'Czech Republic', 'Germany', 'Netherlands', 'Poland'],
    industries: ['trade', 'distribution', 'manufacturing', 'e-commerce'],
    languages: ['en', 'cs', 'ru'],
    notes: 'Czech export/import company with EU presence',
  },
  {
    capabilityId: 'cap-thailand',
    assetType: 'market-access',
    asset: 'Thailand market access',
    strength: 8,
    geographies: ['Thailand', 'SEA'],
    industries: ['trade', 'manufacturing', 'hospitality', 'distribution'],
    languages: ['en', 'th'],
    notes: 'Local presence in Chiang Mai, Thailand',
  },
  {
    capabilityId: 'cap-russia-cis',
    assetType: 'market-access',
    asset: 'Russia/CIS market access',
    strength: 9,
    geographies: ['Russia', 'CIS', 'Ukraine', 'Kazakhstan', 'Belarus'],
    industries: ['trade', 'b2b', 'software', 'distribution'],
    languages: ['en', 'ru'],
    notes: 'Strong Russia/CIS network and language capability',
  },
  {
    capabilityId: 'cap-us-market',
    assetType: 'market-access',
    asset: 'US market access',
    strength: 7,
    geographies: ['USA', 'North America'],
    industries: ['software', 'e-commerce', 'trade'],
    languages: ['en'],
    notes: 'US LLC entity',
  },
  {
    capabilityId: 'cap-entrepreneurial',
    assetType: 'experience',
    asset: 'entrepreneurial experience',
    strength: 9,
    geographies: ['EU', 'Thailand', 'Russia', 'USA', 'SEA'],
    industries: ['all'],
    languages: ['en', 'ru', 'cs'],
    notes: 'Project launch, organization, international business',
  },
  {
    capabilityId: 'cap-czech-trading',
    assetType: 'legal-entity',
    asset: 'Czech export/import company',
    strength: 9,
    geographies: ['EU', 'Czech Republic'],
    industries: ['trade', 'distribution', 'manufacturing', 'import', 'export'],
    languages: ['en', 'cs'],
    notes: 'Licensed Czech trade entity for import/export',
  },
  {
    capabilityId: 'cap-automation',
    assetType: 'technical-skill',
    asset: 'automation / n8n implementation',
    strength: 7,
    geographies: ['Remote', 'EU', 'Thailand', 'USA'],
    industries: ['all'],
    languages: ['en'],
    notes: 'n8n workflow automation, process improvement, no-code/low-code',
  },
  {
    capabilityId: 'cap-intl-remote',
    assetType: 'operational',
    asset: 'international remote business capability',
    strength: 9,
    geographies: ['EU', 'Thailand', 'Russia', 'USA', 'SEA'],
    industries: ['all'],
    languages: ['en', 'ru', 'cs'],
    notes: 'Experienced in running and participating in remote/international ventures',
  },
];
