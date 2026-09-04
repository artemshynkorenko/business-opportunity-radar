# Business Opportunity Radar

An AI-powered personal tool for discovering potentially valuable opportunities from public online conversations.

## What it does

You describe, in plain language, what you are looking for. The Radar works out how to search
for it, retrieves relevant public posts, and organizes them into concise opportunity-oriented
results you can review.

> The user tells the Radar what opportunity they are looking for. The Radar decides how to
> search for it.

The initial use case is discovering business opportunities — partnerships, distribution,
market entry, sourcing/manufacturing, automation needs, projects, and emerging trends — but the
product is a general personal discovery tool, not a platform-specific lead-generation service.

## How it works

```
You describe what you want to discover
    → the Radar derives a search strategy and keyword queries internally
    → it retrieves matching public posts (read-only)
    → the core pipeline normalizes, filters, classifies and scores them
    → you see opportunity cards, each linking back to the original post
```

You never enter raw API keywords. Deriving the search queries from your intent is the Radar's job.

## Threads integration (read-only)

The Radar can retrieve public posts via the official Threads API using the keyword search
endpoint. The integration is **read-only** and requests only the minimum scopes:

- `threads_basic`
- `threads_keyword_search`

The application does **not** post, reply, like, comment, send messages, or perform any other
mutation. Access tokens are held server-side and are never exposed to the browser. It does not
use scraping, browser automation, or undocumented endpoints.

## Meta Review Demo

A minimal web app (`npm run demo`) lets a reviewer independently test the Threads integration:

1. Open the app and read what it does.
2. Connect a Threads account (read-only OAuth).
3. Describe what you want to discover.
4. Start a search — the app shows the search strategy it derived, then searches Threads.
5. Review the resulting opportunity cards and open the original Threads posts.

Configuration (server-side only) is documented in `.env.example`. No credentials are committed.

## AI processing

AI may be used to classify and organize individual pieces of retrieved content. Retrieved public
content is not used to train or fine-tune an AI/ML model.

## Users and distribution

The application is operated by a single user for personal use. It is not offered to third parties,
monetized, or provided as a commercial service.

## Personalization

Opportunity detection is generic; the search strategy, ranking and matching are personalized to the
active user's profile (interests, goals, capabilities, and constraints). See
`docs/SEARCH_STRATEGY.md`. The engine is user-configurable — it is not hardwired to any one person.

## Status

Early development / prototype. The core discovery pipeline and the Threads retrieval adapter are
implemented; see `docs/` for architecture, data model, and search strategy.
