# MVP Core v0.1 Tasks

## T1 — Inspect Repository
- Read all project docs and steering files.
- Confirm current repository state.
- Do not modify architecture before understanding the existing docs.

## T2 — Initialize Core
- Set up a minimal TypeScript/Node.js project if needed.
- Establish a clean source-independent structure.
- Add test infrastructure.

## T3 — Domain Types
Implement core domain types/interfaces for:
- Source
- Community
- Author
- Content
- Business
- Situation
- Evidence
- UserCapability
- Match
- OpportunityCard

## T4 — Normalization
Implement normalized Content and a source-independent normalization interface.

Add deterministic fixtures and tests.

## T5 — Candidate Detection
Implement candidate detection based on meaningful signal rather than simple keyword matching.

Add positive and negative fixtures.

## T6 — Situation Extraction
Implement a replaceable extraction interface.

For v0.1, a deterministic fixture/rule implementation is acceptable.

Preserve explicit vs inferred evidence.

## T7 — Scoring
Implement:
- Opportunity Score
- Relationship Confidence

Make scoring explainable and testable.

## T8 — User Matching
Implement need-to-capability matching against the user's defined capabilities.

Return match explanations.

## T9 — Persistence
Implement a simple in-memory persistence adapter behind an interface.

## T10 — Opportunity Cards
Render structured opportunity cards from Situations and matches.

## T11 — End-to-End Fixture
Create fixtures demonstrating:

fixture content
→ normalization
→ candidate detection
→ situation extraction
→ scoring
→ user matching
→ opportunity card

## T12 — Validation
Run:
- tests
- type checking
- linting if configured

Inspect git diff and confirm no secrets or future-phase code was introduced.

## T13 — Report
Report:
- repository tree
- files created/changed
- tests run
- architecture decisions
- unresolved limitations
- any assumptions requiring approval

Do not expand scope beyond MVP Core v0.1.
