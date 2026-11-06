# Work primitives

Use this map when ordinary language implies a work pattern but does not name a
skill. It helps select the smallest useful capability; it is not a mandatory
sequence and does not replace the user's stated outcome.

| User intent | Primitive or existing skill | Useful result |
| --- | --- | --- |
| “Read through all this”, “digest these files”, “summarise this corpus” | `read-context` | Source manifest, coverage ledger, cited synthesis, contradictions |
| “Help me understand this” | Direct inspection or `read-context` when broad | Explanation grounded in the supplied sources |
| “Compare these” | Bounded source reading, then a purpose-led comparison | Comparable criteria, evidence, differences, uncertainty |
| “Think this through” | `start-discussion` | Clarified intent, constraints, and useful next action |
| “Plan this change” | `plan-change` | Decisions, acceptance, dependencies, and proportionate preparation |
| “Implement this” | `implement-change` or `drive-change` | Working change and relevant validation |
| “Verify this” | Targeted checks or the applicable review skill | Evidence against stated acceptance and standards |
| “Review this” | `review-change` or a relevant specialist | Prioritized findings with concrete evidence and actions |
| “Continue this work” | `resume-work` | Verified live state and first unfinished action |
| “Hand this over” | `handoff` | Compact, verified continuation context |

Choose by the current operation and requested output, not by a universal
lifecycle. One request may compose several primitives, but do not create five
stages when direct work suffices.

For broad independent reading or implementation, partition by disjoint source
ranges, paths, or interfaces. Record ownership, dependencies, permissions,
expected output, and any token, time, or cost limits. Share only the context each
assignment needs; keep intent, decisions, standards, and acceptance available by
reference instead of copying all context everywhere.

Model routing is task-specific. For broad reading, follow `read-context`:
prefer Haiku for bounded extraction and straightforward summaries, Sonnet for
cross-source synthesis or ambiguity, and retain consequential decisions with
the coordinator when those models are available. Explicit user choices and host
constraints take precedence. State an allowed equivalent when the preferred
model is unavailable; do not substitute silently.

Primitives inherit the authority of the user's request. Reading does not grant
editing or publishing rights, review does not grant fixing rights, and a
handoff does not prove the work is complete. Verify mutable state again when a
later primitive depends on it.
