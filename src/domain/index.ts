/**
 * Core domain types for Business Opportunity Radar MVP Core v0.1
 * All types are source-independent.
 */

// ---------------------------------------------------------------------------
// Source & Community
// ---------------------------------------------------------------------------

export interface Source {
  id: string;
  name: string;
  /** 'reddit' | 'threads' | 'fixture' | custom string */
  type: 'reddit' | 'threads' | 'fixture' | string;
}

export interface Community {
  id: string;
  sourceId: string;
  name: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Author
// ---------------------------------------------------------------------------

export interface Author {
  id: string;
  sourceId: string;
  username: string;
  displayName?: string;
  profileUrl?: string;
  accountAgeDays?: number;
  karma?: number;
  verified?: boolean;
  bio?: string;
}

// ---------------------------------------------------------------------------
// Normalized Content
// ---------------------------------------------------------------------------

export type ContentType = 'post' | 'comment' | 'thread';

export interface NormalizedContent {
  contentId: string;
  sourceId: string;
  authorId: string;
  communityId?: string;
  text: string;
  title?: string;
  timestamp: Date;
  permalink: string;
  language?: string;
  contentType: ContentType;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Business
// ---------------------------------------------------------------------------

export type BusinessStage = 'idea' | 'early' | 'growth' | 'established' | 'unknown';

export interface Business {
  id: string;
  name: string;
  stage: BusinessStage;
  description?: string;
  geography?: string[];
  industry?: string[];
  url?: string;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type EvidenceSource = 'direct' | 'inferred' | 'contextual';

export interface Evidence {
  claim: string;
  explicit: boolean;
  source: EvidenceSource;
  quote?: string;
  confidence: number; // 0–1
}

// ---------------------------------------------------------------------------
// Opportunity Score & Relationship Confidence
// ---------------------------------------------------------------------------

export interface ScoreBreakdownEntry {
  score: number;
  weight: number;
  explanation: string;
}

export interface OpportunityScore {
  total: number;
  breakdown: Record<string, ScoreBreakdownEntry>;
  explanation: string;
}

export interface RelationshipConfidence {
  score: number; // 0–100
  explanation: string;
  factors: string[];
}

// ---------------------------------------------------------------------------
// Situation
// ---------------------------------------------------------------------------

export type SituationStatus = 'new' | 'reviewed' | 'dismissed';

export type OpportunityType =
  | 'partnership'
  | 'distribution'
  | 'market-entry'
  | 'sourcing'
  | 'automation'
  | 'acquisition'
  | 'succession'
  | 'investment'
  | 'project'
  | 'cofounder'
  | 'emerging-trend'
  | 'other';

export interface Situation {
  situationId: string;
  title: string;
  summary: string;
  authorId: string;
  businessId?: string;
  sourceContentIds: string[];
  relatedContentIds: string[];
  /** Permalink to the original source content. Set from NormalizedContent.permalink. */
  permalink: string;
  language: string;
  geographies: string[];
  businessStage: BusinessStage;
  assets: string[];
  needs: string[];
  constraints: string[];
  intent: string;
  opportunityTypes: OpportunityType[];
  demandCapacitySignal?: string;
  timing?: string;
  evidence: Evidence[];
  opportunityScore: OpportunityScore;
  relationshipConfidence: RelationshipConfidence;
  possibleUserRoles: string[];
  possibleActions: string[];
  status: SituationStatus;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// User Capability
// ---------------------------------------------------------------------------

export interface UserCapability {
  capabilityId: string;
  assetType: string;
  asset: string;
  strength: number; // 0–10
  geographies: string[];
  industries: string[];
  languages: string[];
  notes?: string;
}

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

/**
 * A geography the active user cares about, with a relative priority weight.
 * `weight` is on the same 0–10 scale the scorer uses for geographic relevance.
 */
export interface GeoPriority {
  region: string;
  weight: number; // 0–10
}

/**
 * The active user's profile — the single piece of user-specific data the
 * generic engine consumes. The engine depends on this abstraction, never on a
 * specific person's configuration.
 *
 * The four dimensions are kept distinct (see docs/SEARCH_STRATEGY.md):
 *  - interests    → what the user is interested in (discovery relevance)
 *  - goals        → what the user wants to find (opportunity types sought)
 *  - capabilities → what the user can offer (opportunity fit)
 *  - constraints  → geographies / languages / exclusions
 *
 * Interests must never be treated as capabilities.
 */
export interface UserProfile {
  id: string;
  displayName: string;
  /** Domains the user is interested in. Increases discovery relevance only. */
  interests: string[];
  /** Opportunity types / outcomes the user is seeking. */
  goals: string[];
  /** What the user can offer. May be empty when unknown. */
  capabilities: UserCapability[];
  /** Personalized geographic priorities. Empty ⇒ neutral geographic weighting. */
  geographies: GeoPriority[];
  /** Languages relevant to the user's search strategy. */
  languages: string[];
  /** Personal negative signals / topics to exclude. */
  exclusions: string[];
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

export type MatchType =
  | 'partner'
  | 'distributor'
  | 'market-entry-partner'
  | 'sourcing-partner'
  | 'operator'
  | 'automation-implementer'
  | 'project-partner'
  | 'connector';

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'contacted';

export interface Match {
  matchId: string;
  situationId: string;
  capabilityId: string;
  matchType: MatchType;
  compatibilityScore: number; // 0–100
  explanation: string;
  evidenceIds: string[];
  status: MatchStatus;
}

// ---------------------------------------------------------------------------
// Opportunity Card
// ---------------------------------------------------------------------------

export interface OpportunityCard {
  situationId: string;
  opportunityType: OpportunityType;
  score: number;
  source: string;
  geography: string;
  summary: string;
  authorNeed: string;
  potentialUserOffer: string;
  whyRelevant: string;
  suggestedNextAction: string;
  sourceLink: string;
  renderedText: string;
}

// ---------------------------------------------------------------------------
// Scan Run
// ---------------------------------------------------------------------------

export interface ScanRun {
  runId: string;
  startedAt: Date;
  finishedAt?: Date;
  contentProcessed: number;
  candidatesFound: number;
  situationsCreated: number;
  errors: string[];
}
