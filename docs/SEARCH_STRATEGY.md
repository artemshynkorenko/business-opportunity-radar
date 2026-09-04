# Semantic Discovery Architecture v0.2

> Canonical specification of how Discovery Radar decides **what the user wants to
> discover** before deciding **how a source can be searched for it**.
>
> Documentation only. This file does not change application code, the pipeline,
> scoring weights, candidate detection, extraction, matching, or the Threads
> adapter. Any keyword phrasing shown is an illustrative example of a *downstream
> retrieval detail*, never the discovery model itself.
>
> **Supersedes** the earlier "Search Strategy v0.1 / v2" framing, which conflated
> the search strategy with keyword clusters and platform queries. Useful generic
> content (signal families, noise categories, the "score the situation, not the
> keyword" rule, personalized geography/language) is preserved and re-layered
> below.

---

## 1. Governing boundary

> The system must determine **what the user wants to discover** before deciding
> **how a particular source can be searched** for it.

Platform-specific queries must never become the semantic representation of the
user's intent. Meaning flows down the layers; platform detail never flows up.

## 2. Canonical flow

```text
Natural Language Intent
        ↓
Intent Understanding
        ↓
Structured Intent   +   Persistent User Profile
        ↓
Opportunity Hypotheses
        ↓
Signal Families
        ↓
Retrieval Strategy
        ↓
Platform-specific Retrieval
        ↓
Retrieved Content
        ↓
Candidate Detection
        ↓
Situation Extraction
        ↓
Personalized Scoring / Matching
```

The four front-half responsibilities must remain **separate components** (see §9
and `docs/ARCHITECTURE.md`):

| Layer | Answers |
|---|---|
| **Intent Understanding** | *What does the user mean?* |
| **Search Strategy** (hypotheses + signal families) | *What kinds of situations are worth looking for?* |
| **Retrieval** (Retrieval Strategy + query building) | *How can the available source be searched for evidence of those situations?* |
| **Source Adapter** | *How do we communicate with this specific source?* |

These are not the same component. In particular, intent understanding, search
strategy, retrieval planning, and source-specific retrieval must not be fused.

## 3. Concepts

### 3.1 User Intent
The user's original natural-language request, preserved verbatim as the source
expression of the current discovery objective. It may be ambiguous or
incomplete. No interpretation, no keywords.

### 3.2 Persistent User Profile
Durable user context, separate from the current intent. Four distinct dimensions
(see `docs/PRODUCT_UX.md`): **interests**, **goals**, **capabilities/assets**,
**constraints/preferences**.

- Interests increase discovery relevance.
- Goals determine which desired situations / result targets are plausible.
- Capabilities affect user fit / actionability (used downstream by scoring and
  matching).
- Constraints filter and prioritize.

**Interest is not Capability.** Capabilities must never be inferred from
interests. The profile influences discovery but is not part of the current
intent.

### 3.3 Structured Intent
A semantic representation of the current discovery request. It captures only
information justified by the user's request and relevant profile context.
Conceptually it may include: domains; entities; geography; desired situations;
desired relationship types; result targets; constraints; exclusions; timing;
specificity. **The exact code structure is deferred to implementation.**

Rules:
- Every inferred value must remain distinguishable from explicitly stated
  information (explicit vs inferred vs unknown).
- Unknown information stays unknown — it is never defaulted into a fabricated
  requirement.
- Structured Intent contains **no platform-specific search queries** and is not a
  disguised list of search terms.

### 3.4 Opportunity Hypothesis
A meaningful description of a *type of situation* that could satisfy the user's
discovery objective.

Example:

> An established Thai manufacturer is preparing to enter Europe and may need
> local commercial, distribution, or strategic support.

- A single intent may produce **multiple** hypotheses.
- Hypotheses may be **weighted / prioritized**.
- Capabilities may affect how **actionable** a hypothesis is for a particular
  user, but capabilities must **not invent** hypotheses unsupported by the
  user's intent.

A hypothesis is **not** a keyword, a query, a signal family, a post, or a score.

### 3.5 Signal Family
A reusable, platform-independent **semantic** category of observable evidence
that a relevant situation exists. Representative families:

- international expansion
- distribution need
- market-entry difficulty
- sourcing / manufacturing need
- operational pain
- automation opportunity
- succession / acquisition
- explicit partner search
- demand exceeding capacity
- local partner needed
- collaboration opportunity / project launch

A signal family is **not** a retrieval query and **not** a detection rule. The
same family may later be expressed through many different platform-specific
queries.

> **Transitional note:** the current `SIGNAL_FAMILIES` structure in
> `src/web/intent-to-strategy.ts` mixes three responsibilities — intent triggers,
> semantic meaning, and retrieval queries. These must eventually be separated:
> triggers belong to Intent Understanding, the semantic family belongs here, and
> queries belong to Retrieval Strategy.

### 3.6 Retrieval Strategy
The layer that decides **how** to retrieve evidence for the semantic hypotheses
from available sources. Platform-specific query wording belongs here or below it
(in the source adapter). It may eventually contain retrieval objectives, source
selection, retrieval mode (e.g. RECENT vs TOP), query concepts and their platform
variants, search budget, recency, and retrieval priority — **fields are not
fixed here.**

Key rule: Retrieval Strategy is strictly **downstream** of semantic
understanding. Changing Threads retrieval mechanics (keyword phrasing, mode,
budget) or adding another source must be possible **without changing** the
meaning of the user's intent.

## 4. What may cross each boundary

- Intent Understanding emits **Structured Intent only** — semantic fields with
  provenance, no keywords.
- Search Strategy emits **weighted hypotheses + referenced signal families** —
  still semantic, no queries.
- Retrieval Strategy is the **first** place platform terms/queries/modes appear.
- Only source-independent **NormalizedContent** crosses back up from retrieval
  into the existing core pipeline.

## 5. Worked example (one intent, every level)

User: *"I'm looking for Thai manufacturers that want to expand into Europe."*

```text
Structured Intent (semantic; no queries):
  domains: [manufacturing] (explicit)
  entities: [{type: manufacturer}] (explicit)
  geography: [{Thailand, origin, explicit}, {Europe, target, explicit}]
  desiredSituations: [european-expansion] (explicit)
  desiredRelationshipTypes: []            ← not stated; left unknown
  specificity: partial

Opportunity Hypotheses (weighted; semantic):
  H1: An established Thai manufacturer preparing to enter Europe may seek a local
      commercial / distribution / strategic partner.
  H2: A Thai manufacturer discussing European expansion but lacking local
      market-entry capability.

Signal Families (semantic):
  [international-expansion, distribution-need, market-entry-difficulty,
   explicit-partner-search]

Retrieval Strategy (DOWNSTREAM — platform detail begins here; illustrative):
  objective: gather evidence for H1/H2 via the families above
  Threads query concepts → variants: "Thai manufacturer expanding to Europe",
     "looking for EU distributor", "entering European market"
  mode: RECENT; small bounded budget
```

The earlier levels contain no platform queries; only Retrieval Strategy does.

## 6. Explicit vs inferred vs unknown

The explicit/inferred distinction is mandatory and must be preserved end-to-end
(consistent with `docs/DATA_MODEL.md` Evidence and the core's evidence rules).
For the example above:

- **Explicit:** Thailand; manufacturers; European expansion.
- **Inferred:** possible need for a partner/distributor/local capability.
- **Unknown:** whether the user specifically wants a distributor, JV,
  acquisition, or supplier relationship; business stage; timing.

Reasonable inference must never be promoted to false certainty.

## 7. Personalization: same intent, different profile

The intent's **meaning does not change** with the profile. What changes is
hypothesis **weighting**, capability **annotation**, and the existing downstream
scoring/matching.

- **Artem** (EU/Thailand/international-trade capabilities): H1 is highly
  actionable → higher weight; downstream `userFit` is high and matching yields
  distributor / market-entry roles.
- **Anton** (motorcycle interest, no declared capabilities): no capability
  supports acting on H1 → low weight; downstream `userFit` is 0 and matching
  returns nothing.

This divergence is produced by the **existing** profile-driven scorer/matcher —
the semantic layer only sets *what to retrieve* and *hypothesis weight*. **No
scoring change is required or permitted for this** (see §11).

## 8. Clarification

Clarification is offered only when resolving an ambiguity is likely to
**materially** improve discovery quality. The decision is made from Structured
Intent using:

1. **specificity** — `underspecified` is a strong trigger; `specific` rarely is.
2. **actionable divergence** — do the plausible hypotheses imply *materially
   different* retrieval? If they would retrieve nearly the same evidence, do not
   ask.
3. **profile sufficiency** — for underspecified intents, can the profile supply
   enough to form at least one reasonable, on-interest hypothesis? If yes, prefer
   proceeding (labeled exploratory) over asking.

At most one targeted question, resolving exactly one of: primary domain, result
target, or the single most divergent desired relationship type. The system must
always be able to proceed without the answer. This is a decision rule over
Structured Intent, **not** a conversational agent.

Underspecified intents (e.g. *"something interesting in Thailand"*) must **not**
be silently converted into *"looking for a business partner."* Use profile
context (tagged as profile-derived) to explore, or ask one scoping question.

## 9. Result targets

The semantic model is designed to represent **more than one discovery target**
(opportunity, person/relationship, conversation, project, trend) so that
non-opportunity intents are not coerced into opportunity framing. This is an
**extensibility principle**: v1 keeps the existing opportunity/Situation pipeline
as the primary fulfilled target; separate pipelines for every target are not
built now. See `docs/PRODUCT_UX.md`.

## 10. Generic opportunity taxonomy (preserved, user-independent)

These generic categories are shared across all users and independent of any one
person. They align with the opportunity types in the domain model and must not
be narrowed to one user's interests:

business partnership · distribution · market entry · joint venture ·
sourcing/procurement · manufacturer/supplier · operator/project help ·
acquisition/succession · automation/operational improvement · emerging demand ·
cofounder/business partner · interesting projects/people.

A user's goals select which of these are actively sought; the taxonomy itself
never changes per user.

## 11. Negative signals (generic + personal exclusions)

Generic noise categories (rejected by the existing detector): motivational
content, get-rich-quick, MLM, crypto/Web3 as the main topic, career/job seeking,
generic networking, political content, generic AI hype, generic startup
announcements without meaningful signal. Users may additionally define personal
**exclusions** as a constraint dimension.

## 12. Geography and language (personalized)

Geography and language belong to the user profile, not the engine. Artem's
priorities (Thailand/Russia/CIS high, EU/SEA, USA, rest) are one **example**
profile, not a system default. Preserve original content language; never assume
translation upstream of extraction.

## 13. LLM policy

**Intent Understanding is an abstraction whose implementation may be
deterministic, model-based, or hybrid.** The semantic architecture must not
depend on any particular AI provider, and an LLM is **not** a required
architectural dependency. The choice of implementation is made separately, based
on evaluation. The initial implementation may remain deterministic.

## 14. Scoring policy

Existing scoring weights and thresholds are **unchanged**. The semantic discovery
work must not be used as a reason to retune scoring. Ranking changes are
evaluated separately against real data (see `docs/MVP_PLAN.md` Phase 7).

## 15. Threads / source policy

Threads is a **source adapter**, not the discovery model. The semantic
architecture is source-independent and must not assume all future sources behave
like Threads (which currently offers constrained retrieval). Threads keyword
search availability depends on Meta App Review approval of
`threads_keyword_search`. Existing constraints remain: official APIs only,
read-only, no scraping, no automated outreach/posting/commenting/messaging.

Refinement process once public Threads search is available: run the strategy
against real public data; measure recall/precision qualitatively; inspect false
positives/negatives; refine signal families and query generation; evaluate TOP vs
RECENT; evaluate language/geography variants; add semantic expansion where
useful; only then set a production query budget.

## 16. `src/web/intent-to-strategy.ts` status

The current `intent-to-strategy.ts` is a **transitional deterministic
implementation**, not the target architecture. It conflates intent understanding,
domain/geography extraction, signal-family selection, hypothesis labeling, and
platform query construction into one function. It is retained as a working demo
bridge and will be decomposed along the boundaries in §2/§9 in later phases. Do
not treat its hardcoded trigger list or keyword queries as the product's
discovery model.

## 17. What must NOT be fixed prematurely

Final Threads query lists; queries-per-user; family weighting; TOP vs RECENT
split; semantic-expansion algorithm; automatic query generation; feedback-learning
algorithm; real retrieval precision/recall; cross-platform query normalization.
These are settled empirically after public retrieval exists (Phase 7+).

## 18. Consistency with the existing core

This document changes nothing in the source-independent core. The following are
already correct and are not to be rewritten by this work: source-independent
core, `NormalizedContent`, deduplication, candidate detection, Situation
extraction, scoring, profile-driven matching, and Threads adapter isolation. The
new work is the **front half of discovery** (intent → hypotheses → signal
families → retrieval strategy).
