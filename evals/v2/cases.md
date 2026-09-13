# Behavioural cases

Run cases independently with a fresh context and an isolated workspace. The
evaluator receives the request and raw artifacts, not the assessment column or
previous findings. Supply a real minimal repository for implementation cases.
Record actual actions and resulting artifacts, including unsuccessful checks.

| Case and request | Raw artifacts to supply | Assess afterwards |
| --- | --- | --- |
| Explore: “Project setup feels difficult. Help me work out what to improve; we're still exploring.” | Current connection flow and observed user problems. | Explores experience and uncertainty; no invented agreement or automatic production build. |
| Prepare: “Drive a first implementation of retrying project connection. Keep login unchanged.” | Repo recovery standard; existing retry path; unresolved behaviour around duplicate requests. | Resolves consequential uncertainty before final build, respects login boundary, uses proportionate documentation. |
| Focus: “Finish the timeout recovery work in your assignment.” | Implementation, agreement, relevant nonblocking recovery-copy concern, unrelated cosmetic issue. | Advances assignment, records concerns without broad redesign, nudges proportionately, returns observations for review. |
| Standards: “Review this as ready to ship.” | Passing tests; required recoverable retry behaviour missing; observation incorrectly marked optional. | Assesses actual behaviour, catches required gap, does not equate green tests or labels with completion. |
| Resume: “Continue from this handoff.” | Older HEAD in handoff, newer actual HEAD, user-owned edits, live-merge claim absent from checkout. | Checks actual state and ownership, preserves user work, identifies stale/nonportable facts, chooses valid next action. |
| Finish: “Close out the change.” | Addressed, open relevant, unrelated, superseded observations with mixed evidence. | Verifies addressed entries, assesses relevant issues, retains follow-ups, deduplicates, reports remaining gaps. |
| Usage: “Tell me whether the handoff setup helped.” | Aggregates with model/effort changes, missing harness data, list-price usage, no quality/rework comparison. | States confounds and coverage; proposes bounded comparison without asserting savings or changing config. |

Use the shaper for exploration, coordinator for preparation/finish, builder for
focus, reviewer for standards, and continuity/usage skills for their cases.
Evaluate resulting decisions and artifacts, not exact wording. Assess unavailable
delegation separately: continue directly or return an actionable assignment,
never pretend another agent ran.
