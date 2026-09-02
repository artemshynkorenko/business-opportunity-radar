# Data Model v2

## Core entities
Source, Community, Author, Content, Situation, Evidence, UserCapability, Match, Trend, ScanRun.

## Situation
Fields:
- situation_id
- title
- summary
- author_id
- business_id
- source_content_ids
- related_content_ids
- permalink  ← URL of the original source content (from NormalizedContent.permalink)
- language
- geographies
- business_stage
- assets
- needs
- constraints
- intent
- opportunity_types
- demand_capacity_signal
- timing
- evidence
- opportunity_score
- relationship_confidence
- possible_user_roles
- possible_actions
- status
- first_seen_at
- last_seen_at
- created_at
- updated_at

## Evidence
Each important claim must have provenance. Store whether a claim is explicit or inferred. Never present an inferred fact as explicitly stated.

## UserCapability
- capability_id
- asset_type
- asset
- strength
- geographies
- industries
- languages
- availability
- willingness
- notes

## Match
- match_id
- left_situation_id
- right_situation_id
- match_type
- compatibility_score
- geographic_fit
- timing_fit
- commercial_fit
- explanation
- evidence_ids
- status

## Trend
A trend requires repeated independent signals, not a single post.
Fields include topic, normalized_problem, industry, geographies, languages, signal_count, unique_authors, unique_communities, source_count, first_seen_at, last_seen_at, growth_rate, cross-community/language confirmation, supporting_situation_ids, trend_score, confidence, opportunity_hypothesis.

## Opportunity Score — 0–100
| Factor | Weight |
|---|---:|
| Need / pain | 15 |
| User fit | 20 |
| Existing business / traction | 15 |
| Economic potential | 10 |
| Demand–capacity mismatch | 10 |
| Timing | 10 |
| Actionability | 8 |
| Geography | 5 |
| Evidence / credibility | 4 |
| Cross-source confirmation | 3 |
| Total | 100 |

Relationship Confidence is a separate 0–100 score measuring confidence that the person/business/context is genuine and sufficiently evidenced.

## Derived signals
- Demand–Capacity Mismatch
- Product Without Distribution
- Failed Attempt
- Resource Partner Gap
- Cross-border Opportunity
