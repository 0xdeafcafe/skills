---
name: integrate-work
description: Integrate a worker result or local change into its owning worktree according to the verified Git operation in progress. Use when collecting, staging, committing, or continuing merge, rebase, cherry-pick, revert, or sequencer work; do not use for read-only review alone.
---

# Integrate work

Select a legal integration action from the intended outcome and current repository operation. A worker result being collected or reviewed does not imply that it should be committed or that its assignment is complete.

## Establish applicability

Identify the integration owner, worker assignment, reported base and head, owned paths, expected result, and requested outcome. State whether this action should only collect changes while preserving a running operation, or complete an integration boundary.

When the operation is uncertain or affects the next action, run:

```bash
python3 <skill-dir>/scripts/inspect-git-state.py --repo <worktree>
```

Resolve `<skill-dir>` from this loaded skill. The helper is a read-only observation, not authorization, a lock, or proof that the state remains unchanged. Inspect again immediately before a state-changing action when intervening work could have changed it.

Verify the actual diff, index, unmerged paths, operation metadata, HEAD, and effects outside the worker's reported files. Preserve unrelated user or agent changes. A mismatch invalidates only the step that depends on it; continue independent inspection, review, or work.

## Select the current operation

- **Normal edit:** an ordinary commit may be considered only when no merge, rebase, cherry-pick, revert, bisect, or sequencer operation is active, ownership is clear, and the intended postcondition calls for a commit.
- **Merge:** preserve the existing merge parents, index stages, and unrelated staged entries. During intermediate collection, stage only reviewed resolved owned paths when authorized. Do not move HEAD with a normal slice commit. Complete the merge only when that is the requested integration boundary and all required resolutions are ready.
- **Rebase or cherry-pick:** use that operation's continue, skip, or abort workflow as authorized and applicable. Never replace its continuation with a generic commit.
- **Revert or sequencer:** preserve the sequence and use its operation-specific continuation. Do not manufacture an ordinary commit merely because the working tree appears committable.
- **Bisect:** preserve the investigation state unless the requested action explicitly concerns advancing or ending it.

Interpret markers together: a multi-commit cherry-pick or revert can legitimately report both its operation and `sequencer`. If metadata describes incompatible operations or cannot be reconciled, diagnose it before mutation.

## Apply the integration

Review the worker result against intent, standards, assignment boundaries, and dependencies. Distinguish statuses explicitly: `reported`, `collected`, `reviewed`, `staged`, `operation-continued`, `committed`, and `assignment-complete` are different claims.

Avoid global staging. Add only known reviewed paths or hunks and verify the resulting index. When safe collection requires a local snapshot, use a tested repository-specific snapshot workflow that preserves the active operation and unrelated state; do not assume stash, patch, or commit semantics are safe.

A content checkpoint does not carry the live index stages or operation metadata to another worktree or machine. For a transfer, record the operation's original parents, staged/resolved and unmerged path inventory, and the reconstruction procedure. Verify that the destination recovered the required state before continuing; preserving the source is different from making it portable.

Before mutation, state the expected postconditions: operation still active or completed, expected HEAD movement, index contents, remaining conflicts, and ownership of remaining changes. Reinspect afterward and compare with those postconditions. Never push by default.

If authoritative instructions appear contradictory, resolve them by user intent, source authority, and applicability to the current operation. Do not choose the newest prose automatically. Raise an unresolved contradiction before a destructive or operation-changing step while continuing independent work.

## Guardrails and fallback

Prefer callable helpers that reject incompatible operation states where feasible; prose alone is not enforcement. If this skill or its helper is unavailable, perform the same state inspection and operation-specific reasoning with repository tools before mutation.

Return the verified operation, action taken, paths and index effects, HEAD before and after, postcondition result, remaining state, and whether the worker output is merely collected or the assignment is complete.
