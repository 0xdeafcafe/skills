# Change envelope

Shared contract for what a reviewer receives as input. The same shape works for a whole-diff review, a single-slice review, or a single-file review — so reviewer prompts don't have to branch on which mode the orchestrator is running.

## Why this exists

The audit orchestrators run in three modes depending on diff size:

- **Tiny** — single Opus pass over the whole diff. Skips fan-out.
- **Small** — full-diff fan-out to specialist reviewers in parallel.
- **Large** — slicer partitions the diff into domain slices; each slice gets its own fan-out; an integration pass runs across the slices.

The reviewers don't need to know which mode is active. They need a self-contained description of what to review, in a consistent shape. One contract, one reviewer prompt — no per-mode branching, no reviewer trying to figure out whether it's seeing a whole change or a fragment.

## Shape

A change envelope is a structured section the orchestrator passes to each reviewer:

```
## Change

### Diff
<unified diff for the scope this reviewer is looking at>

### Files
<list of file paths, one per line>

### Language hints
<primary language per top-level directory, e.g. "ui/: typescript, backend/: go">

### Pre-fetched outlines (optional)
<symbol outlines for changed files, when an LSP is available for the language>

### Slice metadata (optional, large mode only)
- slice name: <e.g. "auth domain">
- slice intent: <one sentence on what this slice changes and why it's a coherent unit>
- contracts crossing in: <names of symbols other slices reach into here>
- contracts crossing out: <names of symbols this slice exposes to other slices>
```

Reviewers ignore fields that don't apply to them. The hygiene reviewer leans on outlines; the design reviewer leans on the diff and the slice intent; the security reviewer leans on the diff and the contracts.

## Field guide

### Diff

A unified diff covering exactly the scope this reviewer should evaluate. For full-diff mode this is the entire change; for sliced mode it's the slice's portion only. Reviewers should treat the diff as the authoritative source for what changed — they should not run `git diff` themselves to broaden the scope. If the diff is incomplete for the reviewer's purposes, the right answer is to note the limitation in a finding, not to fetch more.

### Files

The list of paths the diff touches, surfaced separately so reviewers can quickly scan scope without parsing the diff. Used by reviewers that want to check "does this change touch a sensitive directory" before reading the diff body.

### Language hints

Primary language per top-level directory. Tells the reviewer which LSP family to query (or to skip LSP usage entirely). Skip this field for pure-documentation changes — there's no language tooling to apply.

### Pre-fetched outlines

When an LSP is available for the languages in scope, the orchestrator runs `outline` over each changed file once and broadcasts the result. This is the biggest single token saving in the pipeline: reviewers that would otherwise read 30 files now read 30 outlines (typically <5% of the file body) and use `tslsp find_symbol` / `references` / `hover` to drill in only where needed.

If outlines are absent, the reviewer falls back to `Read` — slower, costlier, but always works.

See [`language-tooling.md`](./language-tooling.md) for which LSP commands to prefer for which task.

### Slice metadata

Present only when the orchestrator is in sliced mode. Three fields:

- **slice name** — a short label the orchestrator assigns ("auth domain", "rendering pipeline"). Used in findings to say "this finding is in the auth slice"; the integration pass uses it to surface cross-slice contradictions.
- **slice intent** — one sentence on what this slice changes and what makes it a coherent unit. Lets the reviewer judge "is this change consistent with the slice's purpose" without re-deriving the slicing.
- **contracts crossing in / crossing out** — named symbols (e.g. `AuthService.refreshToken`, `SessionStore.invalidate`) that bridge into or out of the slice. These are the seams the integration verifier will check after all per-slice reviews complete.

A reviewer working on the auth slice should scope its findings to this slice. If it spots that a change to a crossing-out contract will break something in another slice, it can mention it — but the integration verifier owns cross-slice findings as a category. The per-slice reviewer's job is "is this slice internally correct".

## What the orchestrator always fills

- `Diff` and `Files` — required, every mode.
- `Language hints` — required when the change touches code (skip for pure-doc changes).
- `Pre-fetched outlines` — included whenever LSP support is detected for the languages in scope. Absent otherwise.
- `Slice metadata` — included only in large mode. Absent in tiny and small.

## Reviewer responsibilities

- Treat the envelope as the only source of truth about the change. Don't run `git diff`, don't `Read` files outside the `Files` list.
- If you need wider context, prefer symbol-level LSP queries (`tslsp find_symbol`, `references`, `hover`, `call_hierarchy`) over reading additional files. See [`language-tooling.md`](./language-tooling.md).
- If LSP queries aren't available for the language and the diff alone isn't enough, note the limitation in a finding rather than reaching beyond the envelope. The orchestrator can decide whether to re-run with a wider scope.
- When slice metadata is present, scope findings to *this slice*. Cross-slice findings belong to the integration verifier and will be derived from the contracts list automatically.
