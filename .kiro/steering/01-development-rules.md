# Development Rules

## Architecture
Keep the architecture simple, explicit, and maintainable.

The core pipeline is:

Source Adapter
→ Normalized Content
→ Deduplication
→ Candidate Detection
→ Situation Extraction
→ Author / Context Enrichment
→ Scoring
→ User Matching
→ Cross-Situation Matching
→ Persistence
→ Opportunity Card

Source adapters must be replaceable and must not leak source-specific concepts into the core domain.

## Current Scope
MVP Core v0.1 plus the first real source adapter.

Use synthetic fixtures to demonstrate the pipeline.

Implemented:
- Threads API integration — official Threads API, read-only keyword search, isolated in a source adapter that maps into the source-independent core. Read-only only: no posting, commenting, messaging, or automated outreach. A minimal Meta Review Demo web app exercises this flow.

Do NOT implement:
- Reddit API
- scraping
- browser automation
- n8n orchestration
- Telegram
- production database integration
- dashboard
- vector database
- automatic outreach
- autonomous agents

These belong to later phases.

## AI / Inference Rules
Distinguish explicit evidence from inference.

Never present an inferred fact as if the author explicitly stated it.

Scores must be explainable and based on evidence.

Avoid fake precision when evidence is weak.

## Opportunity Scoring
Opportunity Score uses these weights:

- Need / pain: 15
- User fit: 20
- Existing business / traction: 15
- Economic potential: 10
- Demand-capacity mismatch: 10
- Timing: 10
- Actionability: 8
- Geography: 5
- Evidence / credibility: 4
- Cross-source confirmation: 3

Total: 100.

Relationship Confidence is a separate 0–100 score.

## Testing
- Prefer deterministic unit tests.
- Use synthetic fixtures.
- Test explicit vs inferred evidence.
- Test scoring.
- Test matching.
- Test negative/noise cases.
- Run type checking and tests before reporting completion.

## Git
- Work in small logical changes.
- Inspect git diff before completion.
- Do not commit secrets.
- Do not rewrite history unless explicitly requested.
- Prefer feature branches for substantial work.
