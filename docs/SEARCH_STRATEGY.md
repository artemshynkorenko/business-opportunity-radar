# Search Strategy v0.1

> **Status:** conceptual/product-architecture document. This file defines *how the
> Radar decides what to look for*. It does not change any application code, the
> pipeline, scoring weights, candidate detection, extraction, matching, or the
> source adapters. Query examples here are **hypotheses**, not validated
> production configuration.

> **Supersedes:** the earlier "Search Strategy v2" draft, which framed the
> strategy around a single user (Artem) and conflated search strategy with
> keyword clusters. Useful generic content from that draft (signal clusters,
> noise categories, the "score the situation, not the keyword" rule) is
> preserved below and generalized.

---

## 1. Core principle: the Radar is user-configurable

**The Radar is not an "Artem-specific" system.** The same engine must serve
different people with different interests, goals, capabilities and constraints.

> **Principle:** *The Radar is user-configurable. Opportunity detection is
> generic; search strategy, ranking and matching are personalized to the active
> user's profile.*

Concretely:

- **Generic (shared across all users):** the opportunity taxonomy, candidate
  detection of meaningful signal, situation extraction, and the explicit-vs-
  inferred evidence discipline.
- **Personalized (derived from the active user's profile):** the search
  strategy (what to look for and where), the ranking/scoring emphasis, and the
  matching of situations to the user's capabilities.

Two illustrative users the engine must both serve without code changes:

- **User A — Artem:** access to Thailand, Russia/CIS, EU and US markets;
  entrepreneurial and international-trade experience; seeking partnerships,
  distribution, market entry, sourcing and automation opportunities.
- **User B — Anton:** interested in filmmaking, food businesses and
  motorcycles; looking for interesting people, relationships and business
  partners.

Both configurations are *inputs* to the same engine. Neither is baked into it.

### Relationship to MVP scope (note)

Being "user-configurable" is an **architectural principle**: the profile is a
configurable input and no single person's preferences are hardwired into the
engine. This is distinct from building a **multi-user SaaS product** (tenancy,
auth, billing, dashboards), which `docs/MVP_PLAN.md` correctly lists as an MVP
non-goal. v0.1 may run for a single active profile at a time; the requirement is
only that the profile is *data*, not *code*. See the Consistency Check (§16).

---

## 2. The four profile dimensions (do not collapse these)

A user profile has four distinct dimensions with different roles in the engine.
They must remain separate; do not merge them into one generic "preferences" bag.

| Dimension | Question it answers | Primary role in the engine |
|---|---|---|
| **Interests** | What is the user interested in? | Increases **discovery relevance** — which domains to explore. |
| **Goals** | What does the user want to find / achieve? | Determines **which opportunity types** are being sought. |
| **Capabilities / assets** | What can the user offer others? | Increases **opportunity fit** — how well the user can act on a situation. |
| **Constraints / preferences** | Geography, languages, availability, relationship type, exclusions | **Filters and modulates** discovery, ranking and matching. |

**Critical distinction — interest ≠ capability.**
An interest in a domain does **not** imply an ability to act commercially in it.

> Example: Anton being *interested in* motorcycles does not mean he *can
> distribute* motorcycles. Interest raises discovery relevance for motorcycle-
> related opportunities; it does not create a "motorcycle distributor"
> capability. Capabilities are only what the user explicitly declares.

- **Interest** → widens/reweights what we look for.
- **Goal** → selects the opportunity types worth surfacing.
- **Capability** → affects `user fit` and the matched roles, and must never be
  invented from an interest.
- **Constraint** → geography/language/exclusions that shape and prune results.

---

## 3. The conceptual transformation (strategy → queries → results)

Platform queries are an **implementation** of the search strategy, not the
strategy itself. The full transformation:

```text
Active User Profile
    → Search Strategy               (personalized: what to look for, where, why)
    → Opportunity Hypotheses        (specific "someone is doing X and needs Y")
    → Signal Families               (reusable semantic signals, cross-user/platform)
    → Platform Queries              (platform- and language-specific retrieval)
    → Retrieved Content
    → Generic Candidate Detection   (shared engine — unchanged)
    → Situation Extraction          (shared engine — unchanged)
    → Personalized Scoring / Matching (weighted toward the active profile)
```

Each downward arrow is a *derivation*, not an equality. In particular,
**interests are not keywords** (see §5), and **queries are a late, disposable
layer** (see §8).

### Three strategy artifacts to keep distinct

1. **Generic Opportunity Taxonomy** — the shared vocabulary of opportunity types
   (§4). Independent of any user and any platform.
2. **Personalized Search Strategy** — the mapping from a specific user profile
   to the opportunity hypotheses and signal families worth pursuing (§6, §7).
3. **Platform-specific Retrieval Strategy** — how signal families become actual
   queries against a given platform's API, respecting its capabilities and
   limits (§8, §9).

---

## 4. Generic Opportunity Taxonomy (user-independent)

These categories are shared by all users and independent of Artem. They align
with the opportunity types already in the domain model and must not be narrowed
to one person's interests.

- business partnership
- distribution
- market entry
- joint venture
- sourcing / procurement
- manufacturer / supplier
- operator / project help
- acquisition / succession
- automation / operational improvement
- emerging demand
- cofounder / business partner
- interesting projects / people

A user's *goals* select which of these are actively sought; the taxonomy itself
never changes per user.

---

## 5. Interests must not become keywords directly

An interest is a **domain**, not a query. Turning "filmmaking" straight into
`"filmmaking" OR "camera" OR "cinema"` produces noise and misses real
opportunities. Instead, expand each interest through hypotheses and signal
families first:

```text
interest → relevant opportunity hypotheses → signal families → platform queries
```

**Illustrative expansions (examples, not a fixed taxonomy):**

- **Filmmaking**
  - film/project seeking producer or partner
  - filmmaker seeking financing
  - production collaboration
  - local production opportunities
  - equipment/service business opportunities
  - distribution opportunities
  - people looking for collaborators
- **Food business**
  - food business partnership
  - restaurant expansion
  - food manufacturer / distributor
  - supplier / buyer relationships
  - market entry
  - operational problems
- **Motorcycles**
  - motorcycle business partnerships
  - manufacturing / distribution
  - dealerships
  - repair / service businesses
  - events / projects
  - communities with commercial opportunities

The point of expansion is to reach *opportunity signal* within a domain rather
than merely topical chatter about the domain.

---

## 6. From user profile to a personalized search strategy

The system derives a personalized strategy from the profile inputs:

- **interests** → candidate domains to explore (discovery relevance)
- **goals** → which opportunity types to prioritize (from the taxonomy in §4)
- **capabilities / assets** → expected `user fit` and plausible matched roles
- **preferred opportunity types** → explicit prioritization overrides
- **geographies** → personalized geographic weighting/filters (§10)
- **languages** → which language variants to generate (§11)
- **constraints** → hard filters and de-prioritization
- **relationship preferences** → e.g. partner vs. acquaintance vs. supplier
- **historical feedback** → learned reprioritization over time (§13)

**Roles of the dimensions, restated for the strategy layer:**

- *Interest increases discovery relevance* (explore this domain).
- *Capability increases opportunity fit* (the user can act here).
- *Goal determines the opportunity type being sought.*

Capabilities and interests are combined but never conflated: a strong interest
with no matching capability still surfaces situations (for people/relationships/
learning), but with lower `user fit` than a situation the user can actually act
on.

---

## 7. Signal families (reusable across users and platforms)

**Signal families are semantic categories of intent, not keyword lists.** They
are the reusable middle layer between hypotheses and queries, and they are the
same regardless of which user or platform is active.

Representative signal families:

- seeking partner
- looking for distributor
- looking for supplier / manufacturer
- entering a new market
- expanding internationally
- operational pain
- manual process
- looking for someone to take responsibility / ownership
- looking for cofounder
- seeking producer / operator
- launching a project
- acquisition / succession
- demand exceeding capacity
- local partner needed
- collaboration opportunity

Each family is expressed differently per domain, language and platform, but the
underlying intent is stable. Detection and scoring operate on the *situation*
these families point to — never on raw keyword presence.

---

## 8. Query generation (a late, disposable layer)

Query generation happens **after** strategy, hypotheses and signal families are
established. A query may be produced from a combination of:

- signal family
- opportunity hypothesis
- interest / domain
- geography
- language
- platform capabilities and limits

Rules:

- **Do not** prescribe hundreds of fixed queries.
- Treat any current exact queries as **hypotheses/examples**, never as validated
  production configuration.
- Queries are cheap and disposable; signal families and hypotheses are the
  durable assets.

---

## 9. Threads constraint (approval pending)

The current Threads integration uses the **official Threads API**. Public
keyword search is **not yet fully available** because Meta App Review /
permission approval (`threads_keyword_search`) is still pending.

Therefore v0.1 defines the search strategy **independently of current retrieval
results**. In particular, **do not** optimize the query list based on the
present own-post-only test data — that data is not representative of public
search.

Once public Threads search is available, the refinement process is:

1. run the initial strategy against real public data;
2. measure recall/precision qualitatively;
3. inspect false positives and false negatives;
4. refine signal families and query generation;
5. evaluate **TOP vs RECENT**;
6. evaluate language/geography variants;
7. add semantic expansion where useful;
8. only then establish a production query budget.

**TOP vs RECENT is a retrieval-strategy decision, not a universal constant.** It
may differ by signal family, domain, geography or user.

---

## 10. Geography (personalized)

Geography belongs to the user profile, not the engine.

- For **Artem**, the existing priorities (Thailand 10, Russia/CIS 10, EU 8, SEA
  8, USA 7, rest 5; multiplier, not a hard filter) are one **example** user
  configuration.
- For **Anton**, geography is configured independently and may be entirely
  different.

Do **not** bake any single user's geographic priorities into the generic engine.

---

## 11. Language (personalized)

Initial supported languages: **English, Russian, Thai**. Language selection is
part of the user/search strategy, not a hardwired "Artem's languages" list; a
different user may use a different subset or additional languages.

- Generate native-language query variants where possible.
- **Preserve the original content language**; never assume translation upstream
  of extraction.

---

## 12. Negative signals (generic + personal exclusions)

Generic noise categories (shared default, reused from the prior draft):

- motivational content
- get-rich-quick
- MLM
- crypto / Web3 as the main topic
- career / job seeking
- generic networking
- political content
- generic AI hype
- generic startup announcements without meaningful signal

In addition, each user may define **personal exclusions** (topics, domains,
relationship types) layered on top of the generic set. Personal exclusions are a
constraint dimension, not a change to the generic detector.

---

## 13. Search budget (conceptual allocation)

A limited platform query/search budget will eventually need allocation. **Do not
fix numeric values without empirical data.** Conceptually prioritize:

1. high expected opportunity value;
2. strong user fit;
3. high information gain;
4. under-explored signal families;
5. geographic / language relevance;
6. feedback history.

The budget is allocated across *signal families and hypotheses*, then realized
as queries — not distributed across a static keyword list.

---

## 14. Feedback loop

Search strategy must eventually **adapt from user feedback**. Possible feedback
signals:

- interesting
- not interesting
- already known
- irrelevant
- wrong type
- wrong geography
- wrong stage
- too weak
- high-value

Feedback should modify **future search prioritization** — reweighting signal
families, hypotheses, geographies and domains — rather than simply deleting
individual keywords. Feedback learning is future work (§15); this section
defines intent only.

---

## 15. Example personalized strategies (user configurations, not engine logic)

> These are **example user configurations** that exercise the generic engine.
> They are illustrative, not system logic, and not a fixed query set.

### 15.1 Artem (example profile)

- **Interests:** international trade, distribution, manufacturing, automation.
- **Goals:** become partner in an existing business; distribution; market entry;
  sourcing; automation; acquisition/succession; cofounder.
- **Capabilities (declared):** EU market access, Thailand access, Russia/CIS
  access, US market access, Czech export/import company, US LLC, entrepreneurial
  and international-business experience, project launch/organization, remote
  capability, automation/n8n interest.
- **Geographies:** Thailand, Russia/CIS, EU, SEA, USA (priorities as in §10).
- **Languages:** English, Russian, Thai.
- **Derived hypotheses (examples):** Thai manufacturer seeking EU distribution;
  factory owner seeking successor/partner; SEA founder seeking market entry;
  business with operational pain suitable for automation.
- **Signal families emphasized:** looking for distributor, entering a new
  market, seeking partner, acquisition/succession, operational pain,
  demand exceeding capacity.

### 15.2 Anton (example profile)

- **Interests:** filmmaking, food business, motorcycles.
- **Goals:** meet interesting people; find business partners; discover projects.
- **Capabilities (declared):** *none provided.* Do **not** infer that Anton is a
  distributor, filmmaker, mechanic, investor, financier, or operator. Absence of
  a declared capability means the engine surfaces relevant people/opportunities
  around his interests **without** asserting what he can offer.
- **Geographies:** independently configurable (not Artem's).
- **Languages:** independently configurable.
- **Derived hypotheses (examples):** a film project seeking a producer/partner; a
  food business seeking a partner or expansion help; a motorcycle
  community/project with a collaboration opportunity; people seeking
  collaborators in these domains.
- **Signal families emphasized:** seeking partner, collaboration opportunity,
  launching a project, seeking producer/operator, local partner needed.
- **Effect on scoring/matching:** interest raises discovery relevance for these
  domains; because no capabilities are declared, `user fit` and matched roles
  stay conservative and no unsupported "offer" is attributed to Anton.

---

## 16. What must NOT be fixed in v0.1 (empirical / future work)

The following remain intentionally open and are to be settled empirically after
public retrieval is available:

- the final Threads query list;
- the exact number of queries per user;
- the exact weighting of query families;
- the TOP vs RECENT split;
- the semantic-expansion algorithm;
- the automatic query-generation implementation;
- the feedback-learning algorithm;
- the final retrieval precision/recall;
- cross-platform query-normalization details.

---

## 17. Consistency check

This document is consistent with the current system and changes none of it:

- **Source-independent architecture** — search strategy lives *above* retrieval;
  signal families and taxonomy are platform-agnostic. Platform queries are the
  only platform-specific layer, matching `docs/ARCHITECTURE.md`.
- **MVP Core v0.1 scope** — this is documentation only. "User-configurable" is an
  architectural principle (profile as data), explicitly distinguished from the
  "multi-user SaaS layer" non-goal in `docs/MVP_PLAN.md` (see §1 note).
- **Scoring weights** — unchanged; §6/§15 reference `user fit`, `geography`, etc.
  by role only and do not alter the weight table in `docs/DATA_MODEL.md`.
- **Generic opportunity taxonomy** — §4 preserves the existing categories and
  keeps them user-independent.
- **Explicit vs inferred evidence** — §2 and §15.2 reinforce that capabilities
  are never inferred from interests, consistent with the evidence rules.
- **Threads API constraints** — §9 records the pending approval and forbids
  tuning strategy to non-representative own-post-only data.

### Documentation conflict flagged (not silently changed)

`docs/MVP_PLAN.md` lists a "multi-user SaaS layer" as an MVP non-goal, while this
task requires a user-configurable, multi-profile architecture. These are
reconciled in §1: the requirement is architectural (profile is configurable
data; the engine is not hardwired to one person), **not** a mandate to build SaaS
tenancy/auth/billing in v0.1. No change was made to `docs/MVP_PLAN.md` or to
`.kiro/steering/*`; this reconciliation is documented here for review.
