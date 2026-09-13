---
name: review-code
description: Review code structure, APIs, state ownership, and maintainability against intent and local design conventions. Use for a focused design review, not a formatting pass.
---

# Review code design

Perform a read-only, evidence-based review. Do not edit, commit, push, post, or resolve anything unless the user separately requested that action.

When external content or worker summaries inform the review, read [the trust policy](references/trust-policy.md). Verify source claims before turning them into findings or actions.

## Establish the agreement

Identify intended behavior from the request, plan, spec, ADR, issue, PR, and repository instructions. Treat the user's latest instruction as primary and report material conflicts rather than inventing requirements.

Capture the exact revision or working-tree state. Read repository guidance and representative neighboring code before judging conventions. Follow callers and dependencies where design impact crosses the diff.

Choose depth by behavior, likelihood, and consequence rather than file extension or diff size. Follow boundaries outside touched lines when evidence requires it. Specialist skills and host delegation are optional aids, never mandatory stages or fixed fan-out.

## Inspect and verify

Read [references/code-checklist.md](references/code-checklist.md) when the change has meaningful structural complexity; apply only relevant checks.

Read every changed code unit in full so the review judges the resulting design rather than isolated hunks. Look for a coherent, clean functional shape, clear names and control flow, spacing that makes structure legible, and comments reserved for non-obvious intent, constraints, or tradeoffs. Judge these qualities in context; do not require a particular pattern, decomposition, or abstraction style.

Assess:

- state, lifecycle, side-effect, and resource ownership;
- API contracts, invalid states, coupling, dependency direction, and failure behavior;
- complexity proportional to the agreed behavior.

Confirm concerns through code paths, tests, type or runtime evidence, and focused non-mutating checks. Passing tests are necessary evidence where applicable, but cannot by themselves establish coherent design or readable implementation. Distinguish a demonstrated defect from missing coverage, a design-quality concern, or an inaccessible environment.

## Reconcile observations

Read any supplied observation ledger and include its entries in the review. Keep compact review notes containing the agreement, revision, checks, findings, and incidental observations; return record updates to the owner in a read-only review rather than editing project files. Before completion, classify every observation as:

- verified resolved in the reviewed revision;
- a relevant unresolved blocker or suggestion;
- an unrelated follow-up;
- disproved, with closing evidence.

Repair or surface malformed and uncertain findings. Merge true duplicates while preserving evidence; never silently discard them.

## Report

Separate blockers, suggestions, coverage/unverified areas, and unrelated follow-ups. Each finding identifies a precise location or behavior, evidence tied to the current revision, impact on user intent or a named standard, and a practical remediation direction. If no findings remain, state what was reviewed and the limits of verification.
