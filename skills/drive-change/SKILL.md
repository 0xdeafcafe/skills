---
name: drive-change
description: Use when the user says "/drive-change", "drive the change", "audit the PR", "review my work", "run all the audits", "is this ready to ship", or wants Claude to run the full audit suite on the current change (PR or working tree). Always runs /review-code + /drive-test + /review-feature + /drive-security in sensible order. Adds /drive-ux automatically if UI files are touched (.tsx/.jsx/.vue/.svelte/.astro/.html/.css/.scss/.less). Produces a single unified report grouped by severity. Individual /drive-* skills remain callable directly when you want only one slice.
allowed-tools: Bash(gh:*), Bash(git:*), Read, Grep, Glob, Skill
---

# drive-change - run the full audit suite on the current change

`/drive-change` is the umbrella that runs the right combination of
audits on the current change. You don't have to remember which
`/drive-*` to invoke; this one picks the set.

Always runs:

- `/review-code` - per-file quality, lint, format
- `/drive-test` - test quality + coverage on touched files
- `/review-feature` - feature logic against ADR / spec
- `/drive-security` - authz, secrets, input validation, deps

Conditionally runs:

- `/drive-ux` - **if** the change touches UI files (`.tsx`, `.jsx`,
  `.vue`, `.svelte`, `.astro`, `.html`, `.css`, `.scss`, `.less`)

The individual `/drive-*` skills stay callable directly - use those
when you want only one slice.

## Phase 0 - Scope

Find what changed:

```bash
# PR context first
gh pr diff --name-only 2>/dev/null

# Working tree fallback
git diff --name-only HEAD
git diff --name-only --cached
git ls-files --others --exclude-standard
```

Build the list of touched files. Exclude lockfiles, generated files
(`linguist-generated=true`, `dist/`, `build/`, `generated/`,
`__generated__/`, `*.pb.*`), binary blobs, fixtures, vendored code -
same exclusions as `/review-code` Phase 0.

If the list is empty, how to proceed depends on how `/drive-change` was
invoked:

- **Implicit / pre-PR check** (`/drive-change` triggered as part of an
  earlier flow): stop. Nothing to audit.
- **Explicit user invocation** (the user ran `/drive-change` directly,
  perhaps after a revert or to verify a previous fix still holds): ask
  the user what scope to audit. They may want a specific path, the
  previous commit's diff, a particular file set, or "the working tree
  even though git shows no changes" (e.g. checking a built artefact).

## Phase 1 - Decide whether to include UX

Glob the touched files for UI extensions:

```bash
<touched-files> | grep -E '\.(tsx|jsx|vue|svelte|astro|html|css|scss|less)$' | head -1
```

If at least one match, include `/drive-ux`. Otherwise skip it.

Also include UX if a framework route file changed even without a CSS
touch:

```bash
<touched-files> | grep -E '(app|pages|src/routes)/.*\.(tsx?|jsx?)$' | head -1
```

The URL surface is in scope when route files change.

## Phase 2 - Establish carry-forward state

Before invoking any sub-audit, build a small structured state block in
working memory. It seeds each sub-audit with the change context (so
the ADR / spec / PR summary doesn't have to be re-derived per audit),
collects findings as each audit completes, and feeds the unified
report in Phase 4.

This is structured handoff, not context compaction. Each sub-audit
still does its full body of work - reads the files, runs the linter,
walks the UX - and that work still hits Claude's context as tool
output. What the state does is keep the load-bearing facts (change
summary, ADR decisions, severity-tagged findings, mechanical-fix
SHAs) in one well-known place, so the final report is built from the
state rather than from re-reading five sub-audit transcripts.

Initial state, set once before Phase 3:

```
## Change context
- Summary: <one paragraph from PR description, or git log if no PR>
- ADR(s):
    docs/adr/0042-order-cancellation.md
      key decisions: <one-line> ; <one-line>
- Spec(s):
    specs/orders.feature
      scenarios touching the diff: <one-line each>
- Scope: <N> files across <M> dirs (touched paths, collapsed)
- UX in scope: yes | no  (from Phase 1)

## Findings (empty - filled as audits complete)

## Mechanical fixes (empty - filled as audits commit)

## Carry-forward notes (empty - filled as audits flag context for
## later audits)
```

Sourcing each piece:

- **Summary**: `gh pr view --json body --jq .body` if a PR exists,
  else `git log <base>..HEAD --pretty='%B'` reduced to one paragraph.
- **ADRs**: search the diff for paths under `docs/adr/` (or the repo's
  convention), and the PR / commit messages for ADR identifiers. Read
  each and pull 1-2 lines of the Decision section.
- **Specs**: same for `.feature` files. Read each and pull the
  scenario titles that touch the diff.
- **Scope**: the file list from Phase 0, collapsed to directory level
  (e.g. `src/orders/* (4)`, `tests/orders/* (2)`).

Sizing rule: keep the **change-context block** tight (one screen
maximum - it's set once and travels with every sub-audit). The
**findings and notes sections** can grow as long as they need to;
their value is cross-referencing across audits, not compression. If
three sub-audits all flag the same root cause from different angles,
that overlap is exactly what the state is for - don't truncate it to
hit a size target.

If an ADR or spec is long, summarise to the load-bearing bits in the
change-context block; a sub-audit can re-read the full file if it
actually needs to, but it shouldn't *have* to.

The **carry-forward notes** section is the highest-value piece in
practice - it's where one sub-audit tells the next "I noticed X, you
should look at it from your angle." Example shape:

```
## Carry-forward notes
- review-code split src/orders.ts into queries.ts and mutations.ts;
  drive-test should check both for coverage
- review-feature flagged that the cancellation path emits an
  `order.cancelled` event - drive-security should verify the event
  payload doesn't leak PII
- drive-security found that the refund webhook is unauthenticated;
  review-feature may want to revisit whether the spec covers the
  unauth case
```

Write notes liberally. They cost almost nothing and turn five
independent audits into one coherent picture.

If there's no PR, no ADR, no spec, the state is just "working-tree
diff, no scaffolding" - that's fine. The carry-forward still helps
because findings accrete into the same place.

## Phase 3 - Run in order

Run the audits in this order. The dependency is mechanical: code
fixes first (so later audits see the polished code), then logic /
security / UX:

1. `/review-code` - mechanical fixes (lint, format) often produce
   diffs the later audits should see.
2. `/drive-test` - test quality on the now-formatted code.
3. `/review-feature` - behaviour against spec.
4. `/drive-security` - secrets, authz, deps, input validation.
5. `/drive-ux` (if scope includes UI files) - browser walk-through.

Invoke each via the Skill tool. The invocation passes the current
carry-forward state as context, so the sub-audit starts with the
change summary, ADR decisions, and prior findings already in hand.

The sub-audit produces its own report in its own format. drive-change
reads that report and turns it into severity-tagged one-liners for the
state.

**Severity ownership varies by sub-audit:**

- `/drive-security` already uses P0-P3 tiers in its own findings -
  pass these through verbatim, don't re-translate.
- `/review-code`, `/drive-test`, `/review-feature`, `/drive-ux` don't
  assign severity natively. drive-change assigns it using the rubric
  below.

This keeps drive-security's domain expertise (CVSS-aligned) intact
while giving the other audits a consistent rubric.

Severity rubric (drive-change applies when the sub-audit hasn't
already):

- **P0** - Blocks merge: security vulnerability (defer to
  drive-security's call), broken feature against spec, failing tests,
  data-loss risk.
- **P1** - Should fix before merge: known bug, missing edge case,
  code smell that hurts maintainability at the point of change.
- **P2** - Polish: nits, style, redundancy, "could be tighter."
- **P3** - Future work / observation only, not blocking.

Append findings to the state as:

```
- P0  <one-line>  (<file>:<line>, if applicable)
- P1  <one-line>  (<file>:<line>)
- P2  <one-line>  (<file>)
```

Mechanical fixes (committed by the sub-audit itself) get pulled into
the state as:

```
- <sha>  <one-line description of what changed>
```

Carry-forward notes (free-form, one per line) capture anything a
later audit should know about - e.g. "review-code split src/orders.ts
into two files; drive-test should look at both."

By the time `/drive-ux` finishes (or the run ends without it), the
state holds the full picture: change context, all findings, all
mechanical fixes, all notes. Phase 4 builds the unified report from
this state.

If a sub-audit applies mechanical fixes that create commits, the
later sub-audits run against the post-fix state - which is what you
want.

## Phase 4 - Unified report

After all sub-audits finish, produce a single combined report:

```
drive-change ran <N> audits on <PR #N or working tree>.

  review-code:     <one-line summary>
  drive-test:     <one-line summary>
  review-feature:  <one-line summary>
  drive-security: <one-line summary>
  drive-ux:       <one-line summary>   | "skipped - no UI files touched"

Findings, severity-ordered:

  P0  <one-line finding>          (from drive-security)
  P0  <one-line finding>          (from review-feature)
  P1  <one-line finding>          (from review-code)
  P2  <one-line finding>          (from drive-test)
  ...

Mechanical fixes applied (each its own commit):
  <sha> lint + format on touched files       (review-code)
  <sha> <other mechanical fix>               (drive-security)

Next steps:
  - <suggested action>
  - <suggested action>
```

Group findings by severity, not by sub-audit. The user wants "here's
what to fix and in what order", not a wall of text per audit.

Build from the carry-forward state, not from re-reading sub-audit
transcripts. The state already has the findings (severity-prefixed),
the mechanical fixes (with SHAs), and the change context. The report
is essentially a re-ordering of the state into a user-friendly view.

If `/drive-change` is run as part of pre-PR checks, hide sub-audits
that found nothing behind a one-line "clean." Save the long-form
output for the audits that found something.

## Phase 5 - Recommend next step

End the report with one of:

- **No findings**: "Ready for `/open-pr`."
- **Only P2 polish**: "Safe to `/open-pr` now; P2 findings can land in
  a follow-up."
- **P1 findings**: "Address P1s before `/open-pr`. Want me to go
  through them?"
- **P0 findings**: "Block. Fix P0 before PR."

The user decides; the skill states the read.

## Operating rules

- **Always run code, test, feature, security.** No skipping unless
  the user explicitly opts out for a specific reason.
- **UX is conditional.** Skip if no UI files touched. Don't fire up a
  browser to audit a backend-only change.
- **Don't double-fix.** Each sub-audit applies its own mechanical
  fixes. Run order in Phase 3 means `/review-code` gets there first;
  later audits see the post-fix state.
- **The carry-forward state is the source of truth for the report.**
  Don't rebuild findings from transcripts at the end - that defeats
  the point. Append structured findings as each audit finishes; read
  back from the state when building the report.
- **Surface, don't hide.** Findings the user might disagree with
  still belong in the report. The user decides which to act on.
- **Don't open the PR.** That's `/open-pr`. `/drive-change` is the
  pre-PR pass; `/drive-pr` is the post-open iteration loop.

## Composing with other skills

- **Calls:** `/review-code`, `/drive-test`, `/review-feature`,
  `/drive-security`, `/drive-ux` (conditional).
- **Before:** `/plan-change` (the change being audited).
- **After:** `/open-pr` (turn the change into a PR), or back to
  implementation if findings need addressing.
