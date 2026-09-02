# MVP Core v0.1 Requirements

## R1 — Normalize Content
The system shall convert source-specific input into a normalized Content model.

Normalized content should preserve:
- source
- content ID
- author ID
- text
- timestamp
- permalink
- community / channel
- language when available
- metadata needed for later enrichment

The core domain must not depend on Reddit- or Threads-specific fields.

## R2 — Candidate Detection
The system shall identify content that may contain a meaningful opportunity signal.

Candidate detection must prioritize concrete:
- business needs
- operational pain
- partnership requests
- market-entry needs
- sourcing / manufacturing needs
- automation problems
- project/operator needs
- acquisition/succession situations
- emerging demand signals

Keyword presence alone is insufficient.

Noise such as generic motivation, get-rich content, MLM, crypto hype, career/job seeking, and generic networking should be rejectable.

## R3 — Situation Extraction
The system shall convert candidate content into a structured Situation.

A Situation should capture, where supported by evidence:
- author
- business
- summary
- language
- geography
- business context / stage
- assets
- needs
- constraints
- intent
- opportunity types
- timing
- evidence
- possible user roles

Explicit statements and inferred attributes must be distinguishable.

## R4 — Opportunity Scoring
The system shall calculate an explainable Opportunity Score using the weights defined in steering rules.

It must also calculate Relationship Confidence separately.

The system should avoid false precision when evidence is insufficient.

## R5 — User Matching
The system shall compare Situation needs against the user's capabilities.

It should identify possible roles such as:
- partner
- distributor
- market-entry partner
- sourcing/procurement partner
- operator
- automation implementer
- project partner
- connector

A match must include an explanation.

## R6 — Persistence Abstraction
The core must expose a persistence interface without coupling domain logic to a specific production database.

A simple in-memory implementation is sufficient for v0.1.

## R7 — Opportunity Card
The system shall be able to render a compact opportunity card containing at least:
- type
- score
- source
- geography
- summary
- author need
- potential user offer
- why relevant
- suggested next action
- source link

## R8 — Tests
The implementation shall include deterministic tests covering:
- normalization
- candidate detection
- situation extraction
- scoring
- matching
- opportunity card rendering
- representative positive and negative fixtures

## Non-Functional Requirements
- TypeScript/Node.js preferred.
- No external credentials required.
- No production API calls required.
- No source-specific ingestion implementation.
- Clean modular structure.
- Deterministic tests.
