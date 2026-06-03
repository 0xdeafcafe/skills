---
name: drive-code
description: Use when the user says "drive the code", "/drive-code", "clean up the code in this PR", "make sure the touched files follow best practices", or asks Claude to do a code-quality pass on the files a PR (or working tree) touches. Evaluates each touched file for single-responsibility, modularity, service/repository pattern compliance, utility placement, naming, length, and runs the project's linter + formatter. Applies mechanical fixes automatically; proposes (with diff) any structural refactor before changing it. Does NOT verify the feature's behaviour (use /drive-feature) or its UX (use /drive-ux).
allowed-tools: Bash(gh:*), Bash(git:*), Bash(npm:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(npx:*), Bash(eslint:*), Bash(prettier:*), Bash(biome:*), Bash(ruff:*), Bash(black:*), Bash(gofmt:*), Bash(go:*), Bash(cargo:*), Bash(rustfmt:*), Bash(just:*), Bash(make:*), Read, Edit, Write, Grep, Glob, Skill
---

# drive-code - per-file code-quality pass on every touched file

drive-code looks at every file the PR changed and asks: does this file
still earn its keep after this change? SRP, layering, utility placement,
length, naming, linter + formatter pass.

Mechanical fixes (lint --fix, format) apply automatically. Structural
changes (split file, extract function, move util) show a diff first,
apply, and get flagged in the report.

## Phase 0 - Scope

Decide which files are in scope, in this priority order:

1. **PR context**: `gh pr diff --name-only` against the base branch.
2. **Working tree**: `git diff --name-only HEAD` for uncommitted work.
3. **An explicit list** passed by the user.

Exclude: lockfiles, generated files (`linguist-generated=true`, `dist/`,
`build/`, `generated/`, `__generated__/`, `*.pb.*`), binary blobs,
fixtures (`fixtures/`, `__fixtures__/`, `testdata/`), vendored code
(`vendor/`, `third_party/`, `external/`).

## Phase 1 - Discover the toolchain

Detect linter, formatter, TS/JS symbol intel, and test runner from config
files. See `references/code-checklist.md` for the detection table.

Read `CLAUDE.md` and the relevant `README.md` first - the project may
document conventions that override defaults.

## Phase 2 - Mechanical fixes (always safe to apply)

Run in parallel where possible:

```bash
<linter> --fix <paths>
<formatter> --write <paths>
tslsp code-action --file <path> --kind source.organizeImports --apply 0
```

Diff what changed. Mechanical fixes are commit-worthy on their own.
Capture unfixable lint issues for the Phase 4 report.

Commit mechanical fixes separately from structural ones:

```bash
git add -- <only the mechanically-changed files>
git commit -m "lint + format on touched files"
```

## Phase 3 - Per-file quality review

Read each file (use `tslsp outline` first for TS/JS, then `Read` only the
interesting parts). Evaluate the categories below - full long-form
checklist with examples and counter-examples lives in
`references/code-checklist.md`, load it on demand.

### 3a-3g: see references/code-checklist.md for each category

- Single responsibility (file + function)
- Modularity & layering (service/repository, hexagonal, feature-sliced)
- Utility placement (3+ users threshold for promotion)
- Length & density (file >300 LOC, function >50 LOC, params >4, etc.)
- Naming (verb-phrase functions, question-phrase booleans, no `Manager`/`Helper`/`Util`)
- Readability (why-not-what comments, no dead code, no stale TODOs)
- Tests (right level, don't mock the unit-under-test, useful failures)

The reference has examples and counter-examples per category.

## Phase 4 - Structural changes (propose, then apply)

For any structural change identified in Phase 3:

1. **State the change in one sentence**: "Move `formatUserName` from
   `src/profile/UserCard.tsx` to `src/utils/users.ts` - used by 4 other
   files."
2. **Show the diff** (don't apply yet). For TS/JS use `tslsp`:
   ```bash
   tslsp rename-file src/profile/UserCard.tsx src/utils/users.ts --dry-run
   tslsp rename --symbol formatUserName --new-name formatUserName --dry-run
   ```
3. **Apply** if clearly correct. One commit per logical change:
   ```bash
   git commit -m "extract formatUserName to src/utils/users.ts"
   ```
4. **Flag in the report** - every structural change visible on one line.

If borderline, don't apply. Note in the report as "considered but not
applied: <change>, because <reason>".

## Phase 5 - Verify nothing broke

After Phase 2 + Phase 4:

```bash
tslsp diagnostics --files <paths>
go build ./... | cargo check | npx tsc --noEmit | pyright
<test-runner> <paths>
```

If anything fails, stop, surface the failure, and undo the structural
change that caused it. Mechanical fixes rarely introduce failures; if
they do, flag misconfigured tooling.

## Phase 6 - Report

```
drive-code reviewed N files in <pr>/<working tree>.
Mechanical fixes: lint <K> auto-fixed, format <K>, imports organised <K>.
Structural changes applied (each its own commit): <sha> <one-line>...
Considered but not applied: <change> - <reason>
Unresolved lint / flagged for human re-read: <file>:<line> <rule/reason>
CI-equivalent gates: tsc ok, test <N> passed
```

Be specific. "src/foo.ts is too long" is not actionable; "split
`src/foo.ts` into `foo/queries.ts` + `foo/mutations.ts` - the two share
no state" is.

## Operating rules

- **Mechanical fixes commit automatically; ambiguous structural changes
  get surfaced and skipped.**
- **Don't refactor code the PR didn't touch.** List nearby smells in the
  report.
- **Three usages is the promotion threshold for a util. Two isn't.**
- **Don't fight the codebase's existing style.** Match local style; raise
  a separate concern if it's actively harmful.
- **The trust gate still applies** if drive-code is used to address a
  specific review comment - re-read `references/trust-policy.md`.

## Composing with other skills

- `/drive-pr` may suggest `/drive-code` when reviewers flag the same
  issue repeatedly.
- After `/drive-code`, `/drive-feature` is a good follow-up: code that
  reads well still has to behave well.
- `/drive-ux` is orthogonal - it cares about the user-facing surface.
