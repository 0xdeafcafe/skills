---
name: resume-work
description: Resume paused or transferred engineering work from a handoff, work record, plan, or repository state. Use when continuity matters and prior progress must be verified before continuing.
---

# Resume Work

Reconstruct the smallest reliable working context, verify it against live state, then continue from the first unfinished outcome.

## Re-enter the work

1. Locate the handoff and the effort’s live work record, plan, spec, or ADR. None is mandatory; use what exists.
2. Inspect the live repository before selecting the next workflow: worktree, branch, HEAD, merge base, status, relevant diffs, and merge, rebase, cherry-pick, revert, sequencer, or bisect metadata. A cherry-pick or revert can legitimately also have sequencer state.
3. Reconcile the record with reality. Treat commit IDs, files, tests, and tool output as evidence; treat prose claims as leads until checked.
4. Restate the active intent, non-goals, acceptance criteria, assignment boundary, dependencies, and first unfinished action in compact working notes.
5. Continue with the skill that matches the next action, such as `start-discussion`, `plan-change`, `implement-change`, `drive-change`, `review-change`, `open-pr`, or `drive-pr`.

When collection or integration is next, use `integrate-work` if available or
apply its operation-aware contract directly. Recover the integration owner,
operation kind, whether the operation must be preserved or completed, and
expected postconditions before changing repository state.

Do not repeat completed work solely to regain familiarity. Read the smallest set of files that resolves uncertainty, but expand when a stale handoff, risky change, or missing dependency demands it.

## Resolve drift

If live state differs from the handoff:

- preserve user and other-agent changes;
- identify which facts changed and whether they invalidate prior reasoning;
- update the shared record when present;
- rerun only validation affected by the drift;
- stop for direction only when the mismatch changes intent, ownership, or a material decision.

An unfinished Git operation has worktree-local state, including its index and merge, rebase, cherry-pick, revert, sequencer, or bisect metadata. Verify that state before continuing; a commit or content checkpoint alone does not transfer it. Never assume another worktree shares its index state.

Treat handoff prose as a claim to verify. Inspect actual changed paths, effects
outside reported files, the shared index, unmerged paths, and operation metadata
before mutation. A mismatch invalidates only dependent reasoning or action;
continue independent work and validation.

## Continuity and checkpoints

A checkpoint has a cost: it can require re-deriving context and can reduce quality if it omits why a decision was made. Preserve expensive current reasoning while it remains useful. Long, stable sessions may keep accumulating context and usage, so checkpoint when ownership changes, state becomes fragile, or a cleanly bounded result is available—not on an arbitrary cadence.

Before editing, be able to state:

```markdown
- Current outcome: <what success means now>
- Verified state: <branch/head/status and relevant artifacts>
- Boundary: <owned scope and dependencies>
- Open decisions: <only decisions that block or shape the next action>
- Next action: <specific step>
```

If evidence is insufficient, perform read-only reconstruction first. Do not manufacture certainty from an incomplete record.

Prefer an available LangWatch plugin and CLI for targeted trace checks when
repeated failures, unexpected latency, context pressure, or handoff rework leave
a question that could change the next action. Use `assess-usage` when available;
otherwise use the installed LangWatch guidance and bounded read-only queries.
If missing, suggest setup once per effort and continue the task. Preserve any
prior decline or deferral, and leave installation/sign-in/capture changes to
user authorisation. Never make telemetry availability a completion requirement.
