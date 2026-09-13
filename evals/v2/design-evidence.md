# Evidence behind this draft

This draft follows the user's intent: ship reusable skills and agents using
them, preserve the idea-to-delivery capability, prepare properly, actively refer
back to standards, and record incidental observations without derailing work.

## Research provenance

Read-only inspection of LangWatch's two branches established the chronology on
11 September 2026, Amsterdam time:

- `worktree-agent-usage-advisor-ideation`: original ideation at 13:26 and wider
  analysis at 13:46, tip `20852d5c48e93218597444756d7756d3d7693b61`.
- `feat/agent-usage-advisor-ideation`: originals reapplied at 13:55, corrections
  at 14:26, subsequent probe updates through 17:15, inspected tip
  `d300192b5f385f1183fda49c3140b39b30111fff`.

The [later research and corrections](https://github.com/langwatch/langwatch/tree/d300192b5f385f1183fda49c3140b39b30111fff/dev/docs/plans)
supersede original claims where they disagree. These documents concern one
account and incomplete harness coverage, not universal agent behaviour.

The LangWatch plugin's CLI guidance was also used to read eight recent traces
from the user's personal project. A handoff trace illustrated the distinction
between portable snapshots and live Git merge state. This convenience sample
informed that operational requirement; it does not establish frequency, savings,
or comparative model quality. Private prompts and trace exports are not bundled.

## Decisions and limits

| Evidence or correction | Draft decision | What remains unproven |
| --- | --- | --- |
| Context is consumed per model call; first-call context is only a proxy for static instructions. | Keep descriptions and active instructions small; load relevant references on demand. | Token savings from this draft in a real installed session. |
| A long session can plateau after compaction and keep accumulating usage. | Reconsider continuation at useful milestones as well as context pressure. | The best checkpoint cadence for this user and each host. |
| Checkpoint simulations omit reconstruction and quality costs. | Preserve intent and verified state; assess rework before claiming savings. | Whether a handoff improves total cost or completion time. |
| Carry ratio can improve merely because output or thinking grows. | Compare outcome, quality, rework, time, and usage together. | A reliable normalised measure across models and harnesses. |
| Nonzero shell exit codes include expected test and search results. | Interpret command purpose and evidence before classifying a failure. | Which repeated failures represent avoidable work in future traces. |
| Recorded dollar values may price subscription usage at list rates. | Separate measured tokens, list valuation, and billed spend. | Recoverable cash savings. |
| Missing harnesses and missing events limit observed behaviour. | State coverage and missing measurements explicitly. | Cross-harness performance of these roles. |

The user selected Sol for drafting this version. Shipped agents inherit their
host's configured model; this authoring choice is not a runtime routing policy.
