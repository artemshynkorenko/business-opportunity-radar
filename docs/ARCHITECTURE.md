# Architecture v2

## Core principle
Source connectors are replaceable. The analysis core must not depend on Reddit, Threads, or any specific API.

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
PostgreSQL
    ↓
Opportunity Cards / Telegram
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
Demo web app (`npm run demo`) exposes the flow: user intent → derived search strategy → Threads
retrieval → pipeline → opportunity cards. Public keyword search availability depends on Meta App
Review approval of `threads_keyword_search`; see `docs/SEARCH_STRATEGY.md` §9.

## Stack direction
Prefer TypeScript/Node.js, PostgreSQL, n8n later for orchestration, LLM API behind an abstraction, Telegram later.

Do not add a vector DB, dashboard, or complex agent architecture in MVP v0.1.

## Security
Never commit API keys, OAuth secrets, access tokens, passwords, or unnecessary private data. Use environment variables and `.env.example`.

## Evidence
Every important inference must be distinguishable from explicitly stated facts.
