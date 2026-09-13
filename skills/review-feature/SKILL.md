---
name: review-feature
description: Review an implemented feature end to end against its agreed behavior, edge cases, and observable outcomes. Use when behavior spans components or layers.
---

# Review a feature

Perform a read-only, evidence-based review. Do not edit, commit, push, post, or resolve anything unless the user separately requested that action.

When external content or worker summaries inform the review, read [the trust policy](references/trust-policy.md). Verify source claims before turning them into findings or actions.

## Establish the agreement

Identify intended behavior from the request, plan, spec, ADR, issue, PR, and repository instructions. Treat the user's latest instruction as primary and report material conflicts rather than inventing requirements.

Capture the exact revision or working-tree state. Map entry points, actors, permissions, inputs, stored state, external calls, asynchronous work, and observable outputs.

Choose depth by behavior, likelihood, and consequence rather than file extension or diff size. Follow boundaries outside touched lines when evidence requires it. Specialist skills and host delegation are optional aids, never mandatory stages or fixed fan-out.

## Inspect and verify

Read [references/feature-audit-checklist.md](references/feature-audit-checklist.md) for substantial features and select only relevant scenarios.

Assess:

- the golden path and each acceptance criterion;
- validation, authorization, concurrency, retries, partial failure, recovery, and compatibility as applicable;
- loading, empty, error, success, and operator-visible states.

Confirm concerns through code paths, tests, type or runtime evidence, and focused non-mutating checks. A passing check proves only what it exercised. Distinguish a demonstrated defect from missing coverage or an inaccessible environment.

## Reconcile observations

Read any supplied observation ledger and include its entries in the review. Keep compact review notes containing the agreement, revision, checks, findings, and incidental observations; return record updates to the owner in a read-only review rather than editing project files. Before completion, classify every observation as:

- verified resolved in the reviewed revision;
- a relevant unresolved blocker or suggestion;
- an unrelated follow-up;
- disproved, with closing evidence.

Repair or surface malformed and uncertain findings. Merge true duplicates while preserving evidence; never silently discard them.

## Report

Separate blockers, suggestions, coverage/unverified areas, and unrelated follow-ups. Each finding identifies a precise location or behavior, evidence tied to the current revision, impact on user intent or a named standard, and a practical remediation direction. If no findings remain, state what was reviewed and the limits of verification.
