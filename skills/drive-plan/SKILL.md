---
name: drive-plan
description: Drive a substantial change from intent through preparation, implementation, and final review. Use when the user wants the planned work carried through rather than receiving a plan alone.
---

# Drive a plan

Own the change through a complete, reviewable outcome. Select planning artifacts and collaboration mechanisms according to the work; do not require a fixed idea-to-ADR-to-spec sequence.

## Establish continuity

Recover the objective, non-goals, decisions, applicable standards, acceptance evidence, open questions, tasks, and observations from conversation and repository sources. Maintain these in the repository's work record when one exists, or in an equivalent durable artifact or working context. Keep references to source decisions and update stale entries.

If intent is still unclear, perform the necessary exploration. If important existing behavior is undocumented, characterize only the boundary the change will affect. Plan enough to prevent foreseeable rework, using an ADR, behavioral spec, prototype, diagram, or task breakdown only when useful or required locally.

## Coordinate the work

Break implementation into bounded tasks with explicit dependencies and acceptance evidence. When agents are available and add value, assign only independent or safely partitioned work. Give each agent minimal relevant context: intent, non-goals, decisions, standards, target paths or interfaces, expected result, and stop condition.

Do not hard-code agent counts, models, or roles. Keep shared contracts and integration-sensitive edits coordinated. Follow up when a task completes or new evidence changes its boundary; avoid endless review fan-out. Work directly when delegation is unavailable or would cost more context than it saves.

When collecting worker results, use `integrate-work` if available; otherwise
apply its operation-aware contract directly. Record the integration owner,
verified normal-edit or active Git operation, whether collection must preserve
or complete it, and expected postconditions. Collected or reviewed work is not
automatically committed or complete. During an active merge, preserve merge
state and the shared index rather than creating intermediate slice commits.

## Build and maintain alignment

Implement against the current intent, decisions, standards, and acceptance evidence. Update the work record when discoveries change the plan. A prototype may graduate into the build only after it meets production expectations and repository standards.

Do not ask for confirmation at every phase boundary. Continue through actions already authorized and pause only for a material product decision, missing authority, irreversible external action, or genuine blocker.

Record unrelated issues as observations. Briefly flag meaningful nonblocking ones and preserve focus. Revisit an observation when work reaches the relevant boundary and during final review; record each as addressed with evidence, open-in-scope for review, follow-up with rationale, or disproved with evidence.

## Keep standards current

Treat standards as active constraints, not a checklist saved for the end. When the work exposes a stale or contradictory local standard, resolve the conflict if it is in scope or record the evidence and owner needed to resolve it. Propagate an accepted decision to the plan, tasks, and affected implementation so collaborators do not keep following obsolete guidance.

## Verify completion

Run focused validation throughout and the repository's relevant final checks. Review the integrated behavior against the original intent, non-goals, decisions, standards, and acceptance evidence. Scope-relevant defects, blockers, and unmet required standards must be resolved or clearly block completion.

Integrate before judging completion: reconcile outputs, inspect shared boundaries, and ensure later discoveries are reflected in every affected task or artifact. Re-run only the checks invalidated by fixes or integration changes, and review the affected result when needed to establish completion.

Verify integration preconditions before mutation and inspect effects outside
reported paths. A mismatch invalidates only dependent steps; continue other
work. Use operation-specific continuation for rebase, cherry-pick, revert, or
sequencer state, and never rely on global staging or an automatic push.

Finish with implemented behavior, artifacts and decisions, validation evidence, observation dispositions, and any remaining authorized next action. Suggest optional companion skills such as `track-observations`, `handoff`, or `resume-work` only when available; otherwise preserve the same information directly.

Do not weaken an applicable standard, redefine acceptance, or mark a decision accepted merely to make the work pass. Record a proposed change to the agreement and resolve it through the appropriate owner; existing user authorisation still governs.

Prefer an available LangWatch plugin and CLI for targeted trace checks when
repeated failures, unexpected latency, context pressure, or handoff rework leave
a question that could change the next action. Use `assess-usage` when available;
otherwise use the installed LangWatch guidance and bounded read-only queries.
If missing, suggest setup once per effort and continue the task. Preserve any
prior decline or deferral, and leave installation/sign-in/capture changes to
user authorisation. Never make telemetry availability a completion requirement.
