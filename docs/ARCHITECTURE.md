# Architecture v3

## Core principle
Source connectors are replaceable. The analysis core must not depend on Reddit, Threads, or any specific API. And, as of the semantic discovery architecture, the system must decide **what the user wants to discover** before deciding **how a source is searched** for it — platform queries are never the semantic representation of intent.

## Discovery front-end (semantic)
The front half of discovery turns a natural-language request into a retrieval plan. Its layers are kept separate (see `docs/SEARCH_STRATEGY.md` for definitions and boundaries):

```text
User
 ↓
Natural Language Intent
 ↓
Intent Understanding            (What does the user mean?)
 ↓
Structured Intent + User Profile
 ↓
Opportunity Hypotheses          (What kinds of situations are worth looking for?)
 ↓
Signal Families                 (semantic evidence categories, platform-independent)
 ↓
Retrieval Strategy              (How can this source be searched? — platform detail starts here)
 ↓
Source Adapter                  (How do we talk to this specific source?)
 ↓
Existing Core Pipeline
```

Intent Understanding is an abstraction (deterministic, model-based, or hybrid); no LLM dependency is assumed. The current `src/web/intent-to-strategy.ts` is a **transitional** deterministic implementation that conflates these layers and is not the target architecture.

## Core pipeline (source-independent, implemented)
Only source-independent `NormalizedContent` enters this back half:

```text
Source Adapter
    ↓
Normalized Content
    ↓
Deduplication  ← implemented (InMemoryDeduplicator; source-independent fingerprint)
    ↓
Candidate Detection
    ↓
Situation Extraction
    ↓
Author / Context Enrichment  ← async, fault-tolerant (resolver: (id) => Promise<Author>)
    ↓
Scoring
    ↓
User Matching
    ↓
Cross-Situation Matching
    ↓
Persistence (in-memory now; PostgreSQL later)
    ↓
Opportunity Cards
```

## MVP Core v0.1
Implement the source-independent core using deterministic fixtures/synthetic test data.

Required:
1. domain models
2. content normalizer
3. candidate detector
4. situation extractor interface
5. scoring engine
6. user capability matching
7. persistence abstraction
8. opportunity-card formatter
9. tests
10. fixture dataset

Keep LLM processing behind an interface so tests do not require an API key.

## Later adapters
### Reddit
Only officially approved/supported access. No scraping, browser automation, undocumented endpoints, CAPTCHA bypass, IP rotation, or rate-limit circumvention. Keep the adapter isolated.

### Threads (implemented)
Uses the official Threads API (`keyword_search`), read-only, via an isolated `ThreadsSearchAdapter`
that maps responses into source-independent `NormalizedContent`. The adapter feeds the existing core
pipeline through `ThreadsPipelineRunner`; the core remains source-independent. A minimal Meta Review
Demo web app (`npm run demo`) exposes the flow: user intent → semantic understanding/strategy →
Threads retrieval → core pipeline → opportunity cards. Threads is one source adapter and must not
define the discovery model. Public keyword search availability depends on Meta App Review approval
of `threads_keyword_search`; see `docs/SEARCH_STRATEGY.md` §15.

## Stack direction
Prefer TypeScript/Node.js, PostgreSQL, n8n later for orchestration, LLM API behind an abstraction, Telegram later.

Do not add a vector DB, dashboard, or complex agent architecture in MVP v0.1.

## Security
Never commit API keys, OAuth secrets, access tokens, passwords, or unnecessary private data. Use environment variables and `.env.example`.

## Evidence
Every important inference must be distinguishable from explicitly stated facts.
