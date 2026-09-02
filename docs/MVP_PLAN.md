# MVP Plan v2

## Phase 0 — Specification
Project docs, repository instructions, data model, tests, fixtures.

## Phase 1 — Core v0.1
Domain models, normalization, candidate detection, situation extraction abstraction, scoring, user matching, persistence abstraction, tests, fixture dataset, opportunity-card output.

No external source APIs.

## Phase 2 — Threads
Verify current official API documentation, permissions, quotas, retention and endpoint behavior. Then implement the adapter and feed normalized Content into the existing core.

## Phase 3 — Reddit
Only after Reddit access approval and verification of the approved mechanism. Implement approved authentication, retrieval, pagination, normalization, deduplication and community configuration. Do not redesign the core around Reddit.

## Phase 4 — Evaluation
Target roughly 1,000 raw candidates → ~100 candidates → 50–100 situations. Manually evaluate relevance, false positives/negatives, user fit, opportunity quality and credibility.

## Phase 5 — Feedback
Feedback: Interesting, Very interesting, Ignore, Contacted, Met, Became opportunity, Not relevant, Already known.

## Phase 6 — Cross-source intelligence
Person matching, need/capability matching, manufacturer/distributor matching, market/product matching, Reddit↔Threads correlation.

## Phase 7 — Trend engine
Repeated-signal detection, time persistence, cross-community confirmation, cross-language confirmation, opportunity hypotheses.

## MVP non-goals
No automatic outreach, automated DMs, public lead marketplace, multi-user SaaS layer, dashboard, vector DB, complex autonomous agents, or scraping.
