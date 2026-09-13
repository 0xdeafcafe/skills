---
name: plan-change
description: Turn an intended product or engineering change into an actionable plan while preserving unresolved exploration. Use when decisions, acceptance, dependencies, or sequencing need preparation before implementation.
---

# Plan a change

Produce enough shared understanding to build confidently. The plan serves the intent; it is not a mandatory chain of technical artifacts.

## Ground the plan

Read the current work context and relevant repository material. Restate the objective, non-goals, affected behavior, and success evidence. Identify decisions already made, standards that apply, dependencies, ownership boundaries, and uncertainties that could change the approach.

Refer back to source intent and decisions while planning. Do not silently replace product goals with implementation convenience.

## Explore before converging

Keep viable alternatives visible while consequential questions remain open. Compare options on the constraints that matter here. Use a bounded prototype, spike, or measurement when it can cheaply resolve uncertainty; record its question, result, and limitations.

Ask the user only for decisions that materially affect the outcome and cannot be inferred from authorized context. Once a direction is authorized, continue through routine planning work without repeated confirmation.

## Choose useful artifacts

Follow repository conventions. Create or update an ADR when a durable architectural decision benefits future maintainers or local policy requires it. Write a behavioral spec when precise scenarios form the clearest contract. Use diagrams, task lists, interface notes, or no separate artifact when those better fit the change.

Whatever form the plan takes, cover:

- behavior and acceptance evidence;
- implementation boundaries and affected seams;
- ordering, dependencies, migration, and rollback where relevant;
- validation needed for important risks;
- decisions still open and who or what can resolve them.

## Maintain the work record

For sustained work, use the repository's preferred durable record or maintain an equivalent summary with objective, non-goals, decisions, standards references, acceptance evidence, open questions, tasks, and observations. It may link to ADRs or specs instead of duplicating them. Update or replace stale content as the plan changes.

Agents may research independent questions or validate plan slices when the host supports them. Give bounded assignments and minimal relevant context. Prefer event-driven follow-up to repeated full-plan fan-out. The workflow must also work without agents.

## Decide readiness

A plan is ready when implementation can proceed without guessing about the intended outcome or violating a known constraint. Scope-relevant blockers, unmet required standards, and unresolved decisions that can invalidate the build are not deferrable. Lower-risk details can remain explicit implementation tasks.

End with the chosen direction, acceptance evidence, task boundaries, references, and remaining questions. Continue to `implement-change` or `drive-plan` when already authorized; otherwise leave a concrete, reviewable plan for the user.

Do not weaken an applicable standard, redefine acceptance, or mark a decision accepted merely to make the work pass. Record a proposed change to the agreement and resolve it through the appropriate owner; existing user authorisation still governs.
