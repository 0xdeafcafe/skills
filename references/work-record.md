# Work record contract

Use this contract to maintain a small current record for an effort. This file
explains the contract; it is not the project's live work record. Use an existing
plan, issue, or task record when it fits, otherwise choose one discoverable
Markdown file for the effort. Include that path in assignments and handoffs.
Small tasks can keep these facts in conversation; persist them before transfer.

Omit irrelevant fields. Link authoritative sources rather than copying their
instructions. Keep credentials and raw private traces out of shared records.

## Agreement: why and what

- **Intent:** who needs what outcome, and why it matters.
- **Boundaries:** included behaviour, exclusions, and existing user authority
  for implementation or external actions.
- **Decisions:** choices, reasons, and links to accepted decisions or specs.
  Distinguish proposals and assumptions from things actually agreed.
- **Standards:** applicable repository instructions and quality requirements,
  with sources. A preference is not automatically a mandate.
- **Acceptance:** observable conditions and the evidence that would establish
  them, including the intended experience and technical correctness.
- **Uncertainty:** consequential questions and how to resolve them. A prototype
  may answer one without committing to a production design.

Before substantial implementation, establish enough of this agreement to avoid
building on consequential guesses. Revisit it when evidence changes a decision
or scope. Resolve routine details autonomously; surface a material product
choice while continuing independent work.

## Assignments: who owns what

Each active assignment records:

- Outcome, acceptance evidence, and relevant agreement/source paths.
- Owner, writable scope, shared interfaces, dependencies, and integration owner.
- Repository/worktree, base, current revision, and relevant local edits.
- Current operation: normal edit, merge, rebase, cherry-pick, revert, bisect, or
  sequencer; include unmerged paths and shared-index ownership when relevant.
- Integration intent: whether collecting this result must preserve the running
  operation or complete it, plus expected HEAD, index, conflict, and operation
  postconditions.
- Constraints, unsuccessful approaches, and any supplied time/token/cost limits.
  Do not invent precise runtime measurements.
- Status, next action, and expected return: changes, verification, unresolved
  questions, observations, and a handoff if incomplete.

Separate branches do not establish semantic independence. Coordinate shared
interfaces before parallel changes. Give shared mutable files one writer at a
time. Workers return updates to the coordinator rather than racing to rewrite
the record. Keep unrelated user edits out of commits and integration.

Track worker and integration status precisely. `reported`, `collected`,
`reviewed`, `staged`, `operation-continued`, `committed`, and
`assignment-complete` are distinct facts. A collected worker result need not
move HEAD, especially during an active merge. Before integration mutation,
verify operation metadata, index state, ownership, actual changed paths, and
effects outside the worker report. If a premise changed, invalidate only the
dependent action and continue independent work.

## Observations: notice without losing focus

An observation needs a stable ID, location, claim, evidence or confidence,
impact, and a revisit point. Reuse the ID for the same issue.

```text
OBS-3 | connection error view | verified in browser
Failure clears the entered project URL, making retry cumbersome.
Relevant to recovery acceptance; nonblocking for the current API investigation.
Revisit: connection UX review. Owner: coordinator. Disposition: open-in-scope.
```

Record minor issues quietly. Mention meaningful nonblocking issues in a normal
progress update and continue. Interrupt affected work when continuing would
invalidate its outcome or cause material harm; independent work may proceed.
A concern can be nonblocking now and still require a fix before completion.

At relevant boundaries and before final completion, reconcile each observation:

| Disposition | Evidence needed |
| --- | --- |
| addressed | Verified resulting behaviour and the revision or state checked. |
| open-in-scope | Relevant unresolved concern, review question, owner/next action. |
| follow-up | Optional or outside the current outcome, with reason and location. |
| disproved | Disproved, duplicated, or superseded, with explanation or linked ID. |

Every observation needs a disposition, not necessarily a fix. Route unresolved
relevant concerns into review and track them through assessment; assigning a
reviewer does not close the issue. Failures of required behaviour or applicable
standards cannot become optional follow-ups just to declare completion.
External issues are created only within authorised scope; a local entry is
sufficient otherwise.

## Optional observability state

Remember whether the LangWatch plugin/CLI is available, sign-in is usable, and
capture covers this host/session. Record a setup suggestion's accepted, declined,
or deferred state so a replacement coordinator does not ask again. When a
bounded trace check informs a decision, keep its question, window, coverage,
conclusion, and next action. Keep private trace links only in an appropriate
private record; never copy raw prompts into a public plan.

## Evidence: what is established

Record the check or observation, result, scope, revision, and relevant local
state. Separate passed, failed, and not run. Explain blocked checks and remaining
uncertainty. Preserve evidence while its assumptions remain true; repeat checks
affected by subsequent changes rather than rerunning everything blindly.

Completion means the agreed outcome is supported, required standards are met,
relevant observations have been assessed, and material gaps are reported. A
worker's completion establishes its assignment only; integration and the overall
result remain the coordinator's responsibility.

## Handoff: what the successor needs now

```text
Current objective and why:
Live work record and authoritative sources:
Repository / worktree / branch / base / HEAD:
Uncommitted changes and ownership:
Current operation and integration owner:
Preserve or complete operation, with expected postconditions:
Live operations or workers, and how to reach them:
Completed work and evidence still valid:
Open decisions, blockers, and observations:
Next concrete action and why:
```

Verify mutable facts before writing them. Identify machine-local state, missing
artifacts, and processes that will not survive transfer. Commits do not carry a
live merge's index stages, MERGE_HEAD, or untracked work. Never reset or check
out over local work just to match a stale handoff.

During an active merge, a handoff or worker collection may preserve the merge
without creating an ordinary commit. Record index ownership, unmerged paths,
resolved paths already staged, merge parents, and the exact condition for merge
completion. Rebase, cherry-pick, revert, and sequencer state likewise require
their operation-specific continuation rather than a generic commit.

Where instructions disagree, record which source is authoritative and which
operation each instruction applies to. Do not resolve contradictions merely by
choosing the newest text; surface unresolved conflicts before destructive or
operation-changing steps.

Checkpoint at a useful boundary when accumulated history stops helping the next
assignment. Account for reconstruction and quality costs, not just context size.
A checkpoint does not complete the objective or prove a successor exists. Use
actual host continuation capabilities, otherwise give an actionable handoff and
state what remains. The successor checks current facts before acting.
