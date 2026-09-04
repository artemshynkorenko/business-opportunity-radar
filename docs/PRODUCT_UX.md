# Product UX Model v0.1

> Canonical UX specification for Discovery Radar. Companion to
> `docs/SEARCH_STRATEGY.md` (semantic discovery architecture) and
> `docs/ARCHITECTURE.md` (system architecture). Documentation only — this file
> does not change application code, scoring, or the Threads adapter.

## Product principle

Discovery Radar is an intelligent discovery instrument, not a search box.

The user describes, in natural language, what they want to discover. The Radar
works out what the user means, decides what kinds of situations are worth
looking for, and only then decides how a particular source can be searched for
evidence. The user never types raw API keywords.

> The user tells Radar what they want to discover. Radar decides how to search
> for it.

## Primary interaction

```text
Intent
→ Understanding
→ Clarification (only if necessary)
→ Discovery
→ Situations
→ Source evidence
```

Clarification is **optional**. It is offered only when resolving an ambiguity is
likely to materially improve discovery quality (see `docs/SEARCH_STRATEGY.md`
for the decision rule). A sufficiently specific intent proceeds straight to
discovery. The product is one-shot by default; clarification is the exception,
not a step everyone must pass through.

## User Profile

The persistent understanding of the user. It is **separate** from the current
discovery request (see "Discovery" below). Four distinct dimensions, which must
not be collapsed:

- **Interests** — what the user is interested in. Increases discovery relevance
  (which domains to explore).
- **Goals** — what the user wants to find/achieve. Determines which desired
  situations / result targets are plausible.
- **Capabilities / assets** — what the user can offer others. Affects user fit
  and actionability, used downstream by scoring/matching.
- **Constraints / preferences** — geography, languages, availability, excluded
  topics. Filter and prioritize.

**Interest is not Capability.** Capabilities are never inferred from interests.
An interest in motorcycles does not imply a capability to distribute
motorcycles.

Every piece of profile-derived context that shapes a discovery must remain
distinguishable as **explicit** (the user stated it), **inferred** (reasonably
derived, with less than full certainty), or **profile** (persistent context).
Unknown information stays unknown; the product must not turn reasonable
inference into false certainty.

## Discovery

A **Discovery** is the user's current discovery objective — the semantic meaning
of this particular request. It is transient and request-scoped, and is kept
separate from the persistent User Profile. The profile may influence a Discovery
(e.g. by biasing relevant domains), but a Discovery is not stored as part of the
profile.

## Situation

**Situation** remains the primary analytical object for the existing
opportunity-oriented core (see `docs/DATA_MODEL.md`). Content is evidence; a
Situation combines relevant content, author/context, needs, assets, timing,
evidence, scores, and possible user actions. Results are organized around
Situations, not around raw posts.

## Source

A **Source** is the original public evidence supporting a discovered situation
(for the current MVP, a public Threads post retrieved via the official API). The
source is always preserved and must remain visible and openable by the user.

## Results

Results are **situation-first**, not raw-post-first. Each result presents the
situation (summary, why it may be relevant, potential role) with the underlying
source evidence visible and inspectable — including a link back to the original
post. The user should understand the discovered situation before drilling into
the raw source.

## Explainability

Explanations are **evidence-based**, phrased for a person, e.g.:

> Why Radar found this

Explanations reference the observable evidence and how it relates to what the
user asked for. The product does **not** expose hidden reasoning, internal
prompts, or chain-of-thought. It shows *what* was found and *why it is relevant*,
not the model's internal deliberation.

## Progressive disclosure

The primary interface stays simple: describe what you want, get situations back.
Technical retrieval details (derived keyword queries, signal families, retrieval
mode, budgets) are **not required** for normal use and should not dominate the
UI. Where an interpretation aid is useful, it should show *how Radar understood
the request* (human-readable hypotheses), not API-level search configuration.

## Feedback

Planned feedback signals on a discovered situation:

- Interesting
- Not relevant
- Already known
- Too early
- Wrong type
- Save

Later (relationship progression):

- Contacted
- Met
- Became opportunity

Feedback should adjust future discovery prioritization rather than deleting
individual keywords. (Feedback learning is future work; this section defines the
intended vocabulary and intent only.)

## UX non-goals

Discovery Radar is **not**:

- a generic chatbot;
- a mandatory onboarding questionnaire;
- a large filter/faceted-search interface;
- a raw keyword editor;
- a technical search console.

## Discovery targets (extensibility principle)

The public positioning is "discover interesting people, conversations and
possibilities." The semantic model is therefore designed to be able to represent
**more than one discovery target** without forcing every intent to be a business
opportunity. Potential future targets include:

- opportunity
- person / relationship
- conversation
- project
- trend

This is an **extensibility principle, not an implementation request.** The
current MVP remains centered on the existing opportunity/Situation pipeline. The
semantic layer should allow a request's intended result target to be represented
(so non-opportunity intents are not silently coerced into opportunity framing),
but separate result pipelines for every target are **not** built now.
