# MVP Plan v0.3 — Semantic Discovery Roadmap

> Canonical roadmap aligned with the semantic discovery architecture in
> `docs/SEARCH_STRATEGY.md` and the UX model in `docs/PRODUCT_UX.md`.
> Documentation only. This roadmap replaces the earlier Reddit-first / Threads-
> later sequencing.

The new work is primarily about the **front half of discovery** (understanding
what the user wants and planning retrieval). The source-processing core is
already implemented and correct.

## Phase 0 — Specification (completed)

- Project context and constraints (`.kiro/steering/`, `docs/PROJECT.md`).
- Data model (`docs/DATA_MODEL.md`).
- Source-independent core: normalization, deduplication, candidate detection,
  Situation extraction, scoring, profile-driven matching, persistence
  abstraction, opportunity cards, synthetic fixtures/tests.
- First real source adapter (Threads, official API, read-only) and a minimal
  Meta Review Demo.
- Semantic discovery design (`docs/SEARCH_STRATEGY.md`, `docs/PRODUCT_UX.md`).

## Phase 1 — Semantic discovery foundation

Design and implement the minimum semantic model:

- Structured Intent;
- an intent-understanding boundary (abstraction);
- opportunity hypotheses;
- semantic signal families;
- separation of semantic understanding from retrieval.

The implementation may initially remain **deterministic** where necessary. An
LLM is **not** required at this stage.

Implementation discipline (normative; see `docs/SEARCH_STRATEGY.md` §19):
conceptual boundaries matter more than class count — use the smallest set of
modules/types that preserves the semantic boundaries; do not create abstractions
merely because a concept is named; "Search Strategy" need not be a runtime
object; and Phase 1 must deliver a narrow but **end-to-end testable vertical
slice** (intent → structured intent → hypotheses → signal families → retrieval
planning → source retrieval → existing core), not an isolated semantic layer.
Structured Intent must be designed from these requirements, **not**
reverse-engineered from the transitional `intent-to-strategy.ts` parser.

## Phase 2 — Retrieval separation

Separate semantic strategy from platform retrieval. Threads-specific query
generation and retrieval policy must live **downstream** of the semantic model.
Do not redesign the Threads adapter unless the separation requires it.

## Phase 3 — Adaptive discovery UX

Support natural-language intent; clarification only when necessary; a
human-readable interpretation of the request; and a simple primary interaction.
Do not expose raw retrieval queries as the main UX.

## Phase 4 — Profile-aware discovery

Use persistent `UserProfile` context correctly:

- interests affect discovery relevance;
- goals affect desired discovery;
- capabilities affect user fit / actionability;
- constraints affect filtering / prioritization.

Do not infer capabilities from interests.

## Phase 5 — Situation-first results

Improve presentation around the Situation: situation summary; why it may be
relevant; potential role; and inspectable source evidence.

## Phase 6 — Feedback and history

Implement discovery history, feedback, and saved discoveries. Feedback vocabulary
per `docs/PRODUCT_UX.md` (Interesting, Not relevant, Already known, Too early,
Wrong type, Save; later Contacted, Met, Became opportunity).

## Phase 7 — Real-world evaluation

Evaluate real Threads retrieval using a meaningful sample. Measure at minimum:
relevance; false positives; false negatives; novelty; situation quality; user
fit; credibility; actionability. **Do not tune scoring or retrieval from a single
example.**

## Phase 8 — Retrieval optimization

Only after real evaluation: query expansion; semantic expansion; retrieval
budgets; query prioritization; source-specific optimization; TOP vs RECENT
experiments.

## Preserve existing architecture

The following are already correct and must **not** be unnecessarily rewritten:

- source-independent core;
- `NormalizedContent`;
- deduplication;
- candidate detection;
- Situation extraction;
- scoring;
- profile-driven matching;
- Threads adapter isolation.

## Policies (unchanged)

- **LLM:** Intent Understanding is an abstraction; its implementation may be
  deterministic, model-based, or hybrid. No LLM dependency is assumed; the choice
  is made separately based on evaluation.
- **Scoring:** existing weights and thresholds are unchanged; ranking changes are
  evaluated separately against real data (Phase 7).
- **Threads / sources:** official APIs only, read-only, no scraping, no automated
  outreach/posting/commenting/messaging. Threads is one source adapter; the
  architecture must not assume all sources behave like Threads.

## MVP non-goals

No automatic outreach, automated DMs, public lead marketplace, multi-user SaaS
layer, dashboard, vector DB, complex autonomous agents, or scraping.
