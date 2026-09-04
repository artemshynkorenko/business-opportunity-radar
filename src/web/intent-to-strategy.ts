import type { UserProfile } from '../domain/index.js';

/**
 * Intent → Search Strategy (demo layer).
 *
 * This is a LIGHTWEIGHT, DETERMINISTIC implementation of the search-strategy
 * concept from docs/SEARCH_STRATEGY.md:
 *
 *   user intent (+ active profile)
 *     → opportunity hypotheses
 *     → signal families
 *     → platform (Threads) keyword queries
 *
 * It is intentionally ISOLATED from the core opportunity detection, extraction,
 * scoring and matching logic. It only decides WHAT to retrieve; it never decides
 * whether retrieved content is an opportunity or how valuable it is — that stays
 * in the core pipeline.
 *
 * It is not an LLM and not the final production strategy. It maps recognizable
 * intent signals to reusable signal families and then to bounded keyword
 * queries. The full production strategy (semantic expansion, query budgeting,
 * feedback learning) is future work.
 */

/** A reusable semantic signal family (see docs/SEARCH_STRATEGY.md §7). */
export interface SignalFamily {
  id: string;
  label: string;
  /** Keyword queries that express this family for the Threads keyword_search API. */
  queries: string[];
}

/** The derived, inspectable search strategy for one intent. */
export interface SearchStrategy {
  /** The raw user intent text (trimmed). */
  intent: string;
  /** Human-readable hypotheses shown in the UI processing state. */
  hypotheses: string[];
  /** Matched signal families. */
  signalFamilies: SignalFamily[];
  /** Final de-duplicated, bounded keyword queries for retrieval. */
  queries: string[];
}

/**
 * Signal-family definitions. Each has trigger terms (matched against the
 * lower-cased intent) and the keyword queries that express the family.
 * Trigger terms are broad domain/intent cues, not the exact queries.
 */
interface SignalFamilyDef {
  id: string;
  label: string;
  triggers: string[];
  hypothesis: string;
  queries: string[];
}

const SIGNAL_FAMILIES: SignalFamilyDef[] = [
  {
    id: 'seeking-partner',
    label: 'Seeking a business partner',
    triggers: ['partner', 'partnership', 'joint venture', 'jv', 'team up', 'collaborat'],
    hypothesis: 'Someone seeking a business partner or collaborator',
    queries: ['looking for a partner', 'seeking business partner', 'partnership opportunity'],
  },
  {
    id: 'distribution',
    label: 'Distribution partnerships',
    triggers: ['distribut', 'reseller', 'dealer', 'wholesale', 'sales channel'],
    hypothesis: 'A product owner seeking distribution',
    queries: ['looking for a distributor', 'distribution partner', 'seeking reseller'],
  },
  {
    id: 'market-entry',
    label: 'Market entry / expansion',
    triggers: ['market entry', 'expand', 'expansion', 'enter the', 'new market', 'go global', 'internationa'],
    hypothesis: 'A business expanding into a new market',
    queries: ['expanding to new market', 'market entry partner', 'entering the market'],
  },
  {
    id: 'sourcing',
    label: 'Sourcing / manufacturing',
    triggers: ['manufactur', 'supplier', 'sourc', 'factory', 'oem', 'produce', 'production'],
    hypothesis: 'A buyer seeking a manufacturer or supplier',
    queries: ['looking for a manufacturer', 'seeking supplier', 'sourcing partner'],
  },
  {
    id: 'automation',
    label: 'Operational automation',
    triggers: ['automat', 'manual process', 'workflow', 'repetitive', 'spreadsheet', 'no-code', 'n8n', 'zapier'],
    hypothesis: 'A business with operational pain suitable for automation',
    queries: ['need to automate', 'manual process help', 'workflow automation'],
  },
  {
    id: 'acquisition-succession',
    label: 'Acquisition / succession',
    triggers: ['acqui', 'succession', 'successor', 'retire', 'sell the business', 'exit', 'buyer'],
    hypothesis: 'An owner seeking a successor, buyer or acquisition',
    queries: ['selling the business', 'looking for a successor', 'business for acquisition'],
  },
  {
    id: 'cofounder-project',
    label: 'Cofounder / project help',
    triggers: ['cofounder', 'co-founder', 'operator', 'project', 'launch', 'building', 'startup'],
    hypothesis: 'A project or founder seeking an operator or cofounder',
    queries: ['looking for a cofounder', 'seeking an operator', 'project partner'],
  },
  {
    id: 'investment',
    label: 'Investment / financing',
    triggers: ['invest', 'funding', 'capital', 'raise', 'financ'],
    hypothesis: 'A venture seeking investment or financing',
    queries: ['seeking investment', 'looking for an investor', 'financing partner'],
  },
];

/**
 * Domain terms lifted from the intent and/or the active profile's interests.
 * These are appended to family queries to keep retrieval on-topic without the
 * user ever typing raw API keywords.
 */
function extractDomainTerms(intentLower: string, profile: UserProfile | undefined): string[] {
  const terms = new Set<string>();

  // A small set of recognizable domains. Deterministic and easily extended.
  const DOMAIN_CUES: Array<[string, string[]]> = [
    ['manufacturing', ['manufactur', 'factory']],
    ['food', ['food', 'restaurant', 'café', 'cafe']],
    ['film', ['film', 'filmmak', 'production', 'documentary']],
    ['motorcycle', ['motorcycle', 'moto', 'scooter']],
    ['software', ['software', 'saas', 'app', 'platform']],
    ['textile', ['textile', 'garment', 'apparel']],
    ['cosmetics', ['cosmetic', 'skincare', 'beauty']],
  ];
  for (const [term, cues] of DOMAIN_CUES) {
    if (cues.some((c) => intentLower.includes(c))) terms.add(term);
  }

  // Profile interests contribute domain terms (leading word), reflecting that
  // discovery relevance is personalized.
  if (profile) {
    for (const interest of profile.interests) {
      const lead = interest.split(' ')[0].toLowerCase();
      if (lead.length >= 3) terms.add(lead);
    }
  }

  return [...terms];
}

/**
 * Geography cues from the intent, expressed as query fragments. Kept generic;
 * the active profile's geographies could refine this in future, but geography
 * remains a personalization concern, not a hard filter.
 */
function extractGeographyTerms(intentLower: string): string[] {
  const geos: Array<[string, string]> = [
    ['europe', 'Europe'],
    ['european', 'Europe'],
    [' eu ', 'EU'],
    ['thai', 'Thailand'],
    ['russia', 'Russia'],
    ['asia', 'Asia'],
    ['us market', 'US'],
    ['america', 'US'],
  ];
  const found = new Set<string>();
  const padded = ` ${intentLower} `;
  for (const [cue, label] of geos) {
    if (padded.includes(cue)) found.add(label);
  }
  return [...found];
}

export interface DeriveOptions {
  /** Maximum number of keyword queries to emit. Bounded for demo determinism. */
  maxQueries?: number;
  /** Active profile (interests personalize domain terms). Optional. */
  profile?: UserProfile;
}

/**
 * Derive a bounded, deterministic search strategy from a free-text intent.
 * Throws if the intent is empty.
 */
export function deriveSearchStrategy(intent: string, options: DeriveOptions = {}): SearchStrategy {
  const trimmed = intent.trim();
  if (trimmed.length === 0) {
    throw new Error('Intent must be a non-empty description of what you are looking for.');
  }

  const maxQueries = options.maxQueries ?? 6;
  const lower = trimmed.toLowerCase();

  // 1. Match signal families.
  let matched = SIGNAL_FAMILIES.filter((f) => f.triggers.some((t) => lower.includes(t)));

  // Fallback: if nothing matched, use the broad "seeking partner" family so the
  // demo still retrieves something meaningful rather than nothing.
  if (matched.length === 0) {
    matched = SIGNAL_FAMILIES.filter((f) => f.id === 'seeking-partner');
  }

  const domainTerms = extractDomainTerms(lower, options.profile);
  const geoTerms = extractGeographyTerms(lower);

  // 2. Build queries: base family queries, plus a couple of domain/geo-refined
  //    variants so retrieval reflects the user's stated topic.
  const queries: string[] = [];
  const push = (q: string) => {
    const norm = q.replace(/\s+/g, ' ').trim();
    if (norm.length > 0 && !queries.includes(norm)) queries.push(norm);
  };

  for (const fam of matched) {
    // One refined query per family when we have a domain term.
    if (domainTerms.length > 0) {
      push(`${domainTerms[0]} ${fam.queries[0]}`);
    } else {
      push(fam.queries[0]);
    }
  }
  // Add geography-refined variant for the first family, if any geography present.
  if (geoTerms.length > 0 && matched.length > 0) {
    push(`${matched[0].queries[0]} ${geoTerms[0]}`);
  }
  // Backfill with additional family queries until we reach the bound.
  for (const fam of matched) {
    for (const q of fam.queries) {
      if (queries.length >= maxQueries) break;
      push(q);
    }
  }

  const signalFamilies: SignalFamily[] = matched.map((f) => ({
    id: f.id,
    label: f.label,
    queries: f.queries,
  }));

  return {
    intent: trimmed,
    hypotheses: matched.map((f) => f.hypothesis),
    signalFamilies,
    queries: queries.slice(0, maxQueries),
  };
}
