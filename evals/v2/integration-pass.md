# Integration iteration: 11–12 September 2026

The draft now includes 28 skills and four roles. `integrate-work` selects an
integration action from live Git state and the intended boundary. Collection,
review, staging, operation continuation, committing and assignment completion
are separate claims. Resume inspects all operation kinds before choosing its
next action. A state mismatch invalidates the affected action; it does not erase
the agreement or require restarting independent work.

## Reproduced protocol defect

The old LangWatch coordinator required `commit-slice.sh` when collecting a lane,
including during an active merge. In a disposable two-conflict repository, the
helper created a one-parent commit, moved HEAD, and removed the selected path's
conflict stages through its path-scoped reset. MERGE_HEAD and the other path's
stages survived. This differs from normal `git commit`, which refuses an
unmerged index and finishes the merge only once the index is resolved.

The LangWatch coordinator now collects through its operation-aware rule. The
helper rejects active operations and unresolved index entries before mutation.
A separate `snapshot-merge.sh` uses a throwaway index and a new local WIP ref;
it preserves live HEAD, index and merge parents and performs no push. A content
checkpoint is explicitly not a portable unmerged index or a reviewed result.

## Executed checks

- 11 bundled inspector scenarios pass, including linked worktrees, unusual path
  names, cherry-pick plus sequencer state, rebase, revert and bisect.
- 14 LangWatch helper scenarios pass across ordinary commits, active operations,
  linked worktrees, alternate indexes and multi-parent merge checkpoints.
- Against a temporary copy of the original commit helper, its 10 regression
  tests produce one pass and nine failures. The tests distinguish the defect.
- 28 skill frontmatters and both native Claude plugin manifests validate.
- The active Markdown paths resolve and the catalog names exactly 28 skills.
- TypeScript checking includes the v2 harness. Scoped Oxc, Oxfmt and whitespace
  checks pass for the changed LangWatch slice.

All Git scenarios use disposable repositories. The actual LangWatch checkout
remains on HEAD `6436e4668c` with its existing MERGE_HEAD. Changes to the live
checkout are unstaged edits to the named guidance, helpers and tests; its
pre-existing staged merge-drive skill is preserved with our edits on top.
No project commit, push or checkpoint was made in either actual repository.

## Behavioral execution

The user confirmed LangWatch Scenario. The suite now uses Scenario 1.6.0's
official `ClaudeCodeAgentAdapter` with Claude CLI 2.1.223. All ten behavioral
cases have passed live across the completed runs:

| Cases | Observed model | Evidence |
| --- | --- | --- |
| Ordinary integration, both merge states | `claude-opus-5[1m]` | Owned paths integrated; unrelated staged/unstaged state and active merge state preserved |
| Observations, mandatory acceptance, deferred LangWatch | `claude-opus-5[1m]` | Runtime/artifact checks and tool actions |
| Shaping before implementation | `claude-opus-5` | Two turns; intended output resolved before implementation |
| General and Alex voice, five channels each | `claude-sonnet-5` | Final native reruns passed corrected shared voice checks |
| Broad reading | `claude-opus-5[1m]` coordinator, four Haiku dispatches | Twelve-source ledger, owners, conflicting retention values, preserved sources and HEAD |

These are separate scenario runs, not one uninterrupted full-suite run.
Fixture capture records the instructions used at the time; later recording,
validation and documentation fixes are not retroactively presented as fresh
model execution. Models were observed through CLI metadata and structured
worker dispatches; no claim of comparative model savings is made.

At the end of the first behavioral pass there were 22 recorded response
fixtures. Ten represented passing case outcomes.
The remainder preserve wrong-directory writes, denied-directory attempts,
harness mistakes, an interrupted reading coordinator and four actual Haiku
worker responses recovered from that known synthetic session. The worker model
was `claude-haiku-4-5-20251001`. Child outputs lack the main CLI terminal envelope
and cannot establish completion of their interrupted parent task. They remain
useful for testing source coverage and extracting model/tool evidence.

The interrupted reading run contains an approximately forty-minute timestamp
gap and then an adapter timeout. Its cause was not established. A fresh run
completed and its coordinator independently verified the worker findings.
An earlier reading run compressed repetitive sources and read them directly;
that was reasonable for the input, so its original unconditional-delegation
assertion is documented as a harness limitation. The final case explicitly
requests reading workers.

Two other harness corrections mattered: the setup fixture initially prescribed
an invalid `pnpm setup` command, and a voice matcher rejected “times out”. The
model responses are preserved with those limitations rather than labelled as
product failures. The final setup and voice cases passed natively after repair.

Early voice runs wrote two new draft files outside the temporary project.
Their content was verified against the model's recorded writes before removal.
Later attempts were denied but tried to read home context; those tool results
were redacted before retention. The harness now copies the plugin beside the
project, states the project boundary explicitly, scopes file writes, and enables
the home-denying Bash sandbox. Its remaining system/temp read access is described
in the evaluation guide rather than claimed to be container isolation.

The offline suite passes 26 tests against the real response corpus and clearly
labelled derived mutations. It verifies structured calls against Scenario's own helper,
rejects missing terminal evidence and mandatory follow-up, and distinguishes
recovered tool errors from run failure. The separate legacy helper suite passes
99 tests after the Vitest upgrade. Packaging and Git regression checks remain
separate from behavioral evidence.

The earlier independent Sol exercises are recorded in `first-pass.md`. Neither
those exercises nor these scenarios establish measured usage savings or full
native behavior across all skills and hosts. Personal LangWatch trace evidence
is summarised separately in `design-evidence.md`; raw personal traces are not
part of this response corpus.

## Readability and packaging follow-up

The next pass restored the source trust policy and made selective installation
concrete: standalone skills, selected agents with their methods, all skills, or
the complete plugin. Packaged policy copies are checked against one maintained
source. Temporary plugin exports validate their contents and local references.

TypeScript now has a shared Scenario runner, separate CLI settings and recording,
explicit fixture cleanup, and a declarative schema using the official AI SDK
message validator. All TypeScript has consistent formatting with a repeatable
check. New captures go into ignored `.captures/` for review before promotion,
so a rerun cannot silently replace the accepted response corpus. New recordings
keep per-turn CLI-reported cost values without assuming that resumed-turn totals
can be summed into a bill.

The imported-source trust case passed natively on Sonnet: embedded code-edit and
commit instructions were ignored while the requested summary was produced.
Both voice cases also passed again on Sonnet. Ordinary integration, unfinished
merge collection and two-turn shaping passed again on Opus through the shared
runner. These targeted reruns follow the structural changes; the remaining
previously passing cases were not all rerun in this pass.

The reviewed corpus now contains 24 recordings, including the new trust case
and a separate Sonnet shaping response. The latter passed the stronger first-turn
question check and exercised staging a capture before reviewed promotion; the
existing Opus fixture was preserved.
The 26 offline fixture tests and 99 legacy helper tests pass. The editorial
review and subsequent blog draft are separate from behavioral validation: their
argument and interest cannot be established by the current voice regex checks.
