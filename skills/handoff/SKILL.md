---
name: handoff
description: Preserve enough verified work state for another agent or later session to continue without reconstructing the task. Use before changing ownership, pausing substantial work, or crossing a fragile repository state.
---

# Handoff

Create a compact continuation record grounded in the repository's actual state. Optimize for a capable successor: preserve decisions and hazards that are expensive to rediscover, not a transcript of routine activity.

## Build the handoff

1. Read the effort’s live work record, plan, spec, or ADR when present. Do not require any of them.
2. Inspect the current repository state. Record the working directory, branch, HEAD, relevant base, staged and unstaged changes, untracked files, and worktree when applicable.
3. Compare completed work with acceptance criteria and the assignee's scope. State what is done, what remains, and the next useful action.
4. Record validation commands and their exact outcomes. A nonzero tool exit is an observation to interpret, not automatically proof that the work failed.
5. Preserve open observations with evidence, confidence, impact, and disposition. Do not silently turn suggestions into requirements.

If an integration question exists, use `integrate-work` when available or apply
its state inspection directly. Name the operation, integration owner, whether
collection preserves or completes the operation, and expected postconditions.
Creating a handoff does not require committing collected work.

When a shared work record exists, update the relevant assignment and handoff fields without rewriting unrelated owners' entries. Otherwise return the same information in the response or a location chosen by the caller.

## Repository state

Use commit identifiers rather than phrases such as “latest main.” Include a base and head when they define the review or implementation scope. Describe any state that cannot travel through a commit:

- uncommitted or untracked files;
- partially staged hunks;
- merge, rebase, cherry-pick, or bisect state;
- conflict files and resolutions already attempted;
- stashes, worktrees, generated artifacts, or local services needed to continue;
- dependencies on another owner's still-unmerged work.

Never claim that a commit contains local changes unless verified. Do not clean, reset, stash, commit, or push merely to make the handoff tidy.

During an active merge, preserve merge parents, index stages, unrelated staged
entries, and resolutions already collected. Record which owned paths are
reviewed or staged; collected, committed, and assignment-complete are separate
facts. Rebase, cherry-pick, revert, and sequencer state require their
operation-specific next action.

## Suggested output

```markdown
### Handoff: <assignment>
- Intent: <desired outcome>
- Scope: <owned paths or responsibilities>
- State: <worktree>, branch <branch>, HEAD <sha>, base <sha/ref>
- Operation: <kind>, owner <integration owner>, <preserve or complete>
- Expected postconditions: <HEAD, index, conflicts, operation state>
- Completed: <concrete results>
- Remaining: <concrete gaps>
- Validation: `<command>` — <outcome and interpretation>
- Observations: <IDs and current dispositions>
- Nonportable state: <local-only or in-progress git state, or none>
- Next action: <one useful continuation step>
```

Keep commands and identifiers exact. Keep reasoning only when losing it would cause rework or a likely wrong turn.
