# Kiro Workflow

## Purpose

This file defines how Kiro should work on the repository.

It does not define product requirements, architecture, data models, or engineering rules.
Those are defined in the corresponding project documents and specifications.

## Source of Truth

Use the repository files as the authoritative project context.

Read the relevant files before making non-trivial changes.

| File | Defines |
|---|---|
| `.kiro/steering/00-project-context.md` | Project purpose, user priorities and capabilities, geographic priorities, current phase, high-level constraints |
| `.kiro/steering/01-development-rules.md` | Architecture, implementation boundaries, AI/inference rules, scoring weights, testing principles, Git rules, prohibited scope |
| `.kiro/steering/02-kiro-workflow.md` | Development workflow, decision process, test integrity, evaluation principles |
| `docs/*` | Project definition, architecture, data model, search strategy, MVP planning |
| Active `requirements.md` | What the system must do (current MVP) |
| Active `tasks.md` | Implementation work required to satisfy the requirements |

Requirements define **what the system must do**.

Tasks define **the implementation work required to satisfy those requirements**.

The active specification takes precedence over general planning documents when implementing the current MVP.

## Conflict Resolution

When project documents disagree:

1. Explicit user instruction has highest priority.
2. Active MVP requirements define required product behavior.
3. Steering rules define persistent project and engineering constraints.
4. Architecture/data-model documents define the intended technical design.
5. Planning documents describe direction and may be updated when implementation reveals a better approach.

Do not silently ignore a conflict.

If it can be resolved without changing product scope, resolve it consistently and update the affected documentation.

If resolving it would materially change product scope or a major architectural boundary, ask the user before proceeding.

## Standard Workflow

For any non-trivial task:

1. Inspect the current repository and relevant documentation.
2. Understand the goal and constraints.
3. Identify the applicable specification and affected files.
4. Plan the smallest coherent implementation.
5. Implement incrementally.
6. Add or update deterministic tests.
7. Run tests and type checking.
8. Run linting when configured.
9. Inspect the final Git diff.
10. Synchronize documentation when behavior or architecture changed.
11. Report what was changed, what was tested, and any remaining limitations.

For trivial local fixes, use proportional effort.

## Test Integrity

Tests must validate the intended behavior defined by requirements, not merely make the current implementation pass.

When a test fails:

1. Verify the expected behavior against the active requirements.
2. Verify that the fixture or test correctly represents that expected behavior.
3. Identify whether the implementation or the test is incorrect.
4. Change the implementation only when it violates the intended behavior.
5. Change the test or fixture only when the test itself is incorrect.

Do not tune thresholds, weights, heuristics, or scoring rules solely to maximize the number of passing fixtures.

Passing all tests does not by itself demonstrate real-world quality.

## Evaluation vs Implementation

Keep these concepts separate:

- **Implementation correctness** — the code conforms to requirements and behaves as specified.
- **Deterministic fixture coverage** — the test suite exercises the intended behaviors with synthetic data.
- **Real-world model quality** — the system produces useful results on actual production data.

Synthetic fixtures validate architecture and deterministic behavior. They are not evidence that the system is already effective on real-world data.

When a heuristic, threshold, weight, scoring rule, or detection rule is changed, the reason and expected behavioral effect must be clear and documented in the relevant implementation file or documentation. A change driven solely by fixture pass-rate is a signal that the test, not the implementation, may need review.

## Scope Control

Do not implement future phases unless explicitly requested.

If a future-phase concern affects the current design, preserve a clean extension point without implementing the future feature.

Do not expand the MVP merely because a technically interesting improvement is available.

## Decision Making

Kiro should make routine technical decisions autonomously.

Do not ask for approval for:
- ordinary implementation choices;
- refactoring required to satisfy the current specification;
- test structure;
- naming;
- file organization;
- minor documentation corrections.

Ask the user only when a decision would:
- change the product concept;
- expand the approved scope;
- change a major architectural boundary;
- introduce substantial external infrastructure or cost;
- conflict with an explicit user constraint.

## Completion Standard

A task is not complete merely because the code has been written.

Completion requires:
- implementation;
- tests;
- type checking;
- documentation synchronization where necessary;
- final diff review;
- confirmation that the implementation remains within scope.
