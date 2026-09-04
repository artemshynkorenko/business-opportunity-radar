# Personalization Evaluation Set (synthetic)

## What this is

A small, deterministic set of ~30 synthetic social-media-style source contents used
to validate the **product hypothesis**:

> "The same public situation can represent different opportunities for different users."

The fixtures are fed through the **real pipeline** (candidate detection → situation
extraction → scoring → capability matching) — nothing is bypassed. Two example
profiles are used: `ARTEM_PROFILE` and `ANTON_PROFILE`.

## What this is NOT

- **It does not establish real-world precision/recall.** All content is synthetic and
  hand-written to exercise deterministic architecture and personalization behavior.
- It is **not** an evaluation framework, dashboard, or benchmark. It is a fixture set
  plus deterministic tests.
- It does **not** tune scoring weights, thresholds, the opportunity taxonomy, or the
  detector. If a fixture and the implementation disagree, the fixture is corrected
  unless the disagreement reveals a genuine bug.

Real-world evaluation (recall/precision on live data, TOP vs RECENT, query refinement)
will happen **after public Threads keyword search is approved** — see
`docs/SEARCH_STRATEGY.md` §9.

## Categories

| Code | Meaning | Count |
|---|---|---:|
| A | Strong Artem opportunities | 5 |
| B | Strong Anton opportunities | 5 |
| C | Different user fits (same situation, very different value per profile) | 5 |
| D | Interest but no capability (Anton's interest is relevant; no evidence he can perform the role) | 5 |
| E | Interesting but poor fit for both | 5 |
| F | Noise / negative (expected to be rejected by the detector) | 5 |

## Modeling notes / honest limitations

- **Anton has no declared capabilities.** In the current architecture that means the
  capability matcher returns no matches for him and his `userFit` score is 0 — for
  every situation. This is correct: interests must never be treated as capabilities.
- Anton's **relevance** is therefore expressed as *interest/goal-to-situation domain
  alignment*, computed read-only from the profile in the tests (there is no
  interest-based scoring mechanism in the engine, and this set does not add one).
- Because the detector is business-signal oriented, Anton-domain fixtures are written
  as genuine partnership/project/operator opportunities (e.g. "film project seeking a
  production partner"), not as generic "meet interesting people" posts — the latter are
  correctly rejected as noise.
