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
A semantic representation of **what the user means** in the current discovery
request. It captures only information justified by the user's request and
relevant profile context. Conceptually it may include: domains; entities;
geography; desired situations; desired relationship types; result targets;
constraints; exclusions; timing; specificity. **The exact code structure is
deferred to implementation.**

Normative rules:
- Structured Intent **must** represent meaning, not surface tokens. It **must
  not** be implemented as existing keyword extraction wrapped in a new interface
  and renamed "semantic intent understanding."
- It **must** be designed from the semantic/product requirements in this
  document, **not** reverse-engineered from the existing `intent-to-strategy.ts`
  parser. The transitional parser (see §16) may contain useful legacy behavior,
  but it does **not** define the semantic model.
- Every value **must** carry provenance (see §3.3.1); inferred values must remain
  distinguishable from explicitly stated ones.
- Unknown information **must** stay unknown (see §3.3.2); it is never defaulted
  into a fabricated requirement.
- Structured Intent **must** contain **no** platform-specific search queries and
  **must not** be a disguised list of search terms. It is source-independent.

#### 3.3.1 Provenance (semantic information carries its origin)
Semantic information has one of four provenances, which **must** be represented
structurally wherever it affects interpretation or downstream behavior:

- **explicit** — stated by the user.
- **inferred** — derived by the intent-understanding process (confidence < full).
- **profile** — supplied by the persistent user profile, not this request.
- **unknown** — not established.

Reasonable inference **must not** be promoted to `explicit`, and uncertainty
**must not** be converted into false certainty merely to simplify
implementation. This is the same explicit-vs-inferred discipline used by the
core's Evidence model (`docs/DATA_MODEL.md`), applied to intent.

#### 3.3.2 Unknown is first-class
If the user does not specify something, the system **must** be able to represent
it as `unknown` and proceed accordingly. It **must not** silently fill an unknown
with a product assumption.

In particular, an underspecified relationship type **must not** automatically
become "looking for a partner." The previous `seeking-partner` fallback behavior
is explicitly a **product/architecture smell** and **must not** survive as the
semantic default in the target architecture. Underspecification is handled by
profile-derived exploration (tagged `profile`) or by at most one clarification
(§8) — never by a fabricated default intent.

### 3.4 Opportunity Hypothesis
An Opportunity Hypothesis represents a **meaningful situation the system believes
may exist in the source and that is potentially relevant to the user's intent.**
It is the semantic bridge between what the user means and what evidence to look
for.

Example:

> An established Thai manufacturer is preparing to enter Europe and may need
> local commercial, distribution, or strategic support.

A hypothesis **must** be able to express the semantic relationship between:

- the type of **actor / entity** involved;
- the **situation** the actor is in;
- the relevant **need / problem / opportunity**;
- the **expected observable evidence** (which **signal families**, §3.5, would
  indicate it — referenced by concept, never as queries);
- potentially relevant **relationship / action types** (only when justified);
- **confidence / provenance** where appropriate (§3.7).

Rules:
- A single intent may produce **multiple** hypotheses.
- Hypotheses may be **weighted / prioritized**.
- Capabilities may affect how **actionable** a hypothesis is for a particular
  user, but capabilities **must not invent** hypotheses unsupported by the
  user's intent.

A hypothesis is **not**, and must not be implemented as, any of: a keyword; a
query; a signal family; a post; a score; a detection rule; or merely a list of
selected signal families. It is a semantic description of a situation, richer
than the families it references.

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

A Signal Family is a **reusable, platform-independent semantic category of
observable evidence**. It is the intermediate semantic bridge between hypotheses
and retrieval: a hypothesis references the families that would evidence it, and
the retrieval layer later expresses each family through source-specific queries.

A Signal Family is **not**, and must not be implemented as, any of: a search
query; a platform-specific keyword; a detection rule; an opportunity hypothesis;
or a score. Platform-specific vocabulary and query formulation **must** appear
downstream, in Retrieval Strategy / platform-specific retrieval — never in the
signal family itself.

> **Transitional note:** the current `SIGNAL_FAMILIES` structure in
> `src/web/intent-to-strategy.ts` mixes three responsibilities — intent triggers,
> semantic meaning, and retrieval queries. These **must** eventually be
> separated: triggers belong to Intent Understanding, the semantic family belongs
> here, and queries belong to Retrieval Strategy (see §16).

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

## 16. `src/web/intent-to-strategy.ts` status and migration

The current `intent-to-strategy.ts` is a **transitional deterministic
implementation**, not the target architecture. Do not treat its hardcoded
trigger list or keyword queries as the product's discovery model.

Its current mixed responsibilities include:

- **intent classification** — substring trigger matching against the raw text;
- **semantic interpretation** — ad-hoc domain/geography extraction;
- **signal-family selection** — choosing predefined families;
- **hypothesis generation** — static per-family hypothesis labels;
- **query construction** — building platform keyword strings;
- **retrieval policy** — bounded fallback/query-count behavior;
- **product-default fallback** — the `seeking-partner` default (a smell; §3.3.2).

Intended migration direction (not implemented in this stage):

```text
old mixed implementation
  → separate semantic responsibilities (understanding, hypotheses, families)
  → move retrieval-specific responsibilities downstream (queries, mode, budget)
  → remove the product-default fallback behavior
```

The file may be retained as a working demo bridge until the semantic vertical
slice (§19.3) replaces its responsibilities. It **must not** define the semantic
model.

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

## 19. Implementation guidance (conceptual model vs runtime)

The concepts in §3 are a **conceptual model**, not a prescription for runtime
structure. The following rules govern how implementation should relate to it.

### 19.1 Minimal implementation — conceptual boundaries, not class count
- Conceptual boundaries matter more than the number of classes/services/modules.
- Implementation **must** use the smallest set of modules/types that preserves
  the semantic boundaries (understanding vs strategy vs retrieval vs source
  adapter; intent vs profile; hypothesis vs signal family; retrieval strategy vs
  source adapter).
- Do **not** create an abstraction solely because a concept has a name, and do
  **not** proliferate frameworks/classes prematurely.
- A future implementation is judged by **responsibility and data flow**, not by
  how closely its file/class structure mirrors the conceptual model.

### 19.2 "Search Strategy" is a responsibility, not necessarily a runtime object
This document uses **Search Strategy** as a conceptual responsibility ("what
kinds of situations are worth looking for"). Whether it becomes a concrete
runtime class/object is an implementation decision to be made from actual needs
during Stage 4 design. Implementation **must not** mechanically create a runtime
object merely because the documentation names the concept. The same applies to
any named concept here.

### 19.3 Minimal vertical slice first
Phase 1 **must not** produce a semantic layer that exists in isolation and cannot
be exercised through discovery. The first implementation slice **must** be
deliberately narrow but **end-to-end testable**, demonstrating:

```text
natural-language intent
  → semantic interpretation → structured intent
  → hypothesis formation → semantic signal families
  → retrieval planning → source retrieval
  → existing core pipeline
```

Do not attempt to optimize the whole discovery system before this vertical flow
works. Retrieval optimization (§17) is explicitly deferred.

### 19.4 Result targets — extensibility without scope creep
Result targets (opportunity, person/relationship, conversation, project, trend)
remain conceptually extensible (§9). Extensibility **must not** become scope
creep: the MVP continues to focus on the opportunity/Situation pipeline, and
separate complete pipelines for every result target **must not** be built during
Phase 1.

### 19.5 Clarification is a decision mechanism, not an agent
Clarification (§8) is a single-decision mechanism, **not** a conversational-agent
architecture. At most one targeted question; the system **must** still proceed if
the user does not answer. Multi-turn chatbot discovery flows are out of scope.
