---
name: start-feature
description: Establish the intent and preparation needed to begin a feature, fix, refactor, or product change. Use when the work is known but its current state, uncertainty, or appropriate path still needs to be assessed.
---

# Start a feature

Turn a stated change into a grounded next action without imposing a document sequence. Preserve the user's goal and existing authorization throughout the lifecycle.

## Establish the change

Summarize the objective, affected users or systems, non-goals, and evidence of success. Inspect the repository for relevant code, tests, conventions, active plans, decision records, and feature documentation. Prefer repository truth over generic ceremony.

Determine:

- whether this is new behavior, a correction, maintenance, or an extension of existing behavior;
- what is already decided and what remains uncertain;
- which repository standards or ownership boundaries apply;
- whether current behavior needs characterization before it changes;
- what preparation is proportionate to the risk and reversibility.

Do not require an ADR, formal spec, ticket set, or prototype by default. Create or update one when it resolves a real ambiguity, communicates a durable contract, or is required by repository convention.

## Choose the useful path

- Continue directly to implementation when intent and acceptance are clear and the change is bounded.
- Use `backfill-feature` when important existing behavior or rationale is undocumented and changing it safely requires a baseline.
- Use `plan-change` when decisions, dependencies, sequencing, or acceptance need to be worked out first.
- Return to exploration when the proposed feature is still a proxy for an unclear problem.

These are capabilities, not mandatory gates. If a companion skill is unavailable, perform the corresponding work directly.

## Maintain continuity

For sustained work, keep a compact work record in the repository's established location, or in working context if no durable location fits. Capture objective, non-goals, decisions, standards references, acceptance evidence, open questions, tasks, and observations. Correct it when the direction changes instead of preserving obsolete history as instruction.

If agents are available and useful, give each a bounded assignment with only the context needed: intent, relevant decisions and standards, target surface, expected output, and stop condition. Agents are optional; continue in a single-agent environment.

## Finish preparation

Preparation is complete when the next worker can act without guessing at the intent or violating a known standard. Scope-relevant blockers and required standards must be resolved or explicitly surfaced; they cannot be deferred merely to declare the feature started.

Report the selected path, why it fits, what context carries forward, and any decision the user must make. Continue without another confirmation when the user already authorized that next action.
