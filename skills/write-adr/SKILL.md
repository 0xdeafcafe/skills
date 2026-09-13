---
name: write-adr
description: Capture a durable architecture or engineering decision, its context, alternatives, and consequences in the repository's ADR format. Use when a decision has been made or needs a concrete reviewable proposal.
---

# Write an architecture decision record

Turn the user's decision intent into a durable, reviewable ADR. An ADR records why a choice was made and what follows from it; it should not pretend an undecided question is settled.

## Discover context

Read repository instructions and locate existing ADRs, templates, naming conventions, indexes, and related specs or plans. Read two representative records. Use [references/adr-formats.md](references/adr-formats.md) when the repository lacks a clear format or when choosing among established forms.

Establish the decision, scope, status, drivers, constraints, decision makers when known, and intended timing. Infer routine formatting from the repository. Ask only when a missing choice would materially change the decision; otherwise draft explicit assumptions for review.

## Draft the decision

Describe:

- context and the concrete problem;
- the decision in testable, bounded terms;
- viable alternatives and why they were not chosen;
- positive and negative consequences, risks, operational effects, and reversibility;
- migration, rollout, compatibility, or follow-up work when relevant;
- links to superseded or related decisions and behavior specs.

Match local length and tone. Do not manufacture alternatives, consensus, dates, owners, benchmarks, or approval. Mark unknowns honestly. Preserve the idea → plan → spec → implementation relationship through links when those artifacts exist, without requiring every artifact or stage.

Compare the draft with actual repository constraints and any implemented behavior in scope. Record incidental observations and reconcile them before completion as resolved in the ADR, relevant items for review, unrelated follow-ups, or disproved with evidence.

## Write and verify

Write to the established location and update an index only when local convention requires it. Do not commit unless requested. Verify filename, links, status, and formatting with repository-supported checks. Return the path, central decision, assumptions requiring review, verification, and follow-ups.
