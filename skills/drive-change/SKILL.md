---
name: drive-change
description: Implement, validate, and finish a clear change end to end. Use when the intent is actionable and the user wants execution without a separate planning deliverable.
---

# Drive a change

Carry an authorized change to a complete, reviewable result. Add preparation when evidence shows it is needed, without turning every clear change into a formal planning exercise.

## Establish the contract

Recover the objective, non-goals, relevant decisions, repository standards, and acceptance evidence from the conversation and repository. Inspect the affected implementation, tests, callers, and current changes. If the intent is ambiguous in a way that could produce the wrong behavior, resolve it before editing.

Use the repository's preferred work record for sustained work, or maintain an equivalent concise state containing objective, non-goals, decisions, standards references, acceptance evidence, open questions, tasks, and observations. Link existing plans or specs rather than requiring new ones.

If a major unresolved design choice or undocumented compatibility boundary makes direct implementation unsafe, perform the focused work needed to resolve it. Use `plan-change` or `backfill-feature` when available and useful, or do that work directly. Do not route away merely because the change is large.

## Implement

Map the smallest coherent surface that satisfies the intent. Follow existing architecture and conventions unless the authorized change calls for altering them. Keep tests and documentation aligned with behavior. Refer back to recorded decisions and acceptance evidence as implementation choices arise.

Continue through routine edits and checks without repeated confirmation. Ask only when a decision materially changes user-visible behavior, scope, or authority and cannot be resolved from context.

Agents are optional. When supported and beneficial, give them bounded, non-overlapping assignments with minimal context and explicit validation. Coordinate shared contracts centrally and integrate completed work as events arrive. Avoid hard-coded models, fixed fan-out, and repeated whole-change reviews.

Integrate worker output through `integrate-work` when available, or apply the
same operation-aware checks directly. Before mutation, verify the current Git
operation, integration owner, actual changed paths and index, whether collection
must preserve or complete the operation, and expected postconditions. Treat
collected, reviewed, committed, and assignment-complete as distinct states.

During an active merge, preserve merge parents and unrelated index entries;
never create a normal slice commit for intermediate collection. Rebase,
cherry-pick, revert, and sequencer work uses its own continuation workflow.
Avoid global staging and pushing by default. If state differs from the report,
invalidate only the dependent action and continue independent work.

## Review and correct

Validate incrementally, then review the integrated change for behavior, regressions, tests, security, accessibility and UX where relevant, and repository standards. Use focused reviewers or companion review skills only when they add signal. Apply supported fixes within scope and re-run checks affected by those fixes.

Record unrelated issues as observations. Give a mild nudge for meaningful nonblocking issues, then continue. Revisit them at the relevant boundary and final review; disposition each without assuming it belongs in this change.

Keep the standards used by the change internally consistent. If implementation reveals that a referenced local rule is stale or conflicts with an authorized decision, resolve the scope-relevant conflict and update the source when appropriate. Record out-of-scope standards work with evidence and a clear disposition.

## Complete

Completion requires acceptance evidence for the intended behavior and satisfaction of applicable required standards. Scope-relevant blockers or defects cannot be deferred merely to report success. If something truly cannot be resolved, state its impact and the missing decision or dependency.

Report what changed, why it meets the intent, validation performed, material limitations, and observation dispositions. Preserve enough state for `handoff` or `resume-work` if those companion skills are available; otherwise provide the same continuity directly.

If work must stop before completion, leave the next action bounded and state which evidence, decision, or dependency will unblock it. Do not represent a paused or partially validated change as finished.

Do not weaken an applicable standard, redefine acceptance, or mark a decision accepted merely to make the work pass. Record a proposed change to the agreement and resolve it through the appropriate owner; existing user authorisation still governs.

Prefer an available LangWatch plugin and CLI for targeted trace checks when
repeated failures, unexpected latency, context pressure, or handoff rework leave
a question that could change the next action. Use `assess-usage` when available;
otherwise use the installed LangWatch guidance and bounded read-only queries.
If missing, suggest setup once per effort and continue the task. Preserve any
prior decline or deferral, and leave installation/sign-in/capture changes to
user authorisation. Never make telemetry availability a completion requirement.
