---
name: review-code
description: Use when the user says "review the code", "/review-code", "audit the code in this PR", "what's wrong with these files", "code-quality findings only", or asks Claude to evaluate the code in touched files for quality (SRP, layering, naming, length, lint compliance) without applying any fixes. Read-only audit specialist — emits findings in the finding-format.md schema instead of editing files. Each touched file is checked against the project's linter (run in check-only mode), then evaluated for single-responsibility, modularity, utility placement, naming, length, and structural smells. Use /review-code when you want the code-quality verdict in finding form; use /drive-change to have the orchestrator dispatch the fixes those findings describe.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(npm:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(npx:*), Bash(eslint:*), Bash(prettier:*), Bash(biome:*), Bash(ruff:*), Bash(black:*), Bash(gofmt:*), Bash(go:*), Bash(cargo:*), Bash(rustfmt:*), Bash(just:*), Bash(make:*), Read, Grep, Glob, Skill
---

# review-code — per-file code-quality audit

review-code looks at every file the PR or working tree changed and asks: does this file still earn its keep after this change? SRP, layering, utility placement, length, naming, linter diagnostics, formatter compliance.

Emits findings in the [`finding-format.md`](../../references/finding-format.md) schema. Never edits files, never commits, never runs `--fix` or `--write` forms of any tool. To act on the findings, call `/drive-change` (which dispatches fix-applier agents under sensitivity gating).

## Phase 0 — Scope

Decide which files are in scope, in this priority order:

1. **PR context**: `gh pr diff --name-only` against the base branch.
2. **Working tree**: `git diff --name-only HEAD` for uncommitted work.
3. **An explicit list** passed by the user.

Exclude: lockfiles, generated files (`linguist-generated=true`, `dist/`, `build/`, `generated/`, `__generated__/`, `*.pb.*`), binary blobs, fixtures (`fixtures/`, `__fixtures__/`, `testdata/`), vendored code (`vendor/`, `third_party/`, `external/`).

## Phase 1 — Discover the toolchain

Detect linter, formatter, TS/JS symbol intel, and test runner from config files. See `references/code-checklist.md` for the detection table.

Read `CLAUDE.md` and the relevant `README.md` first — the project may document conventions that override defaults.

## Phase 2 — Linter diagnostics (read-only)

Run linters and formatters in **check-only** mode. Convert each violation to a finding.

```bash
<linter> <paths>                                     # check, NOT --fix
<formatter> --check <paths>                          # NOT --write
tslsp diagnostics --files <paths>                    # LSP diagnostics
tslsp code-action --file <path> --kind source.organizeImports --list
                                                     # don't apply
```

For each violation, emit a finding (see Phase 5). Map severity:

- **P2 hygiene** by default for any style/lint violation.
- **P1 hygiene** for violations on *changed* lines (the diff introduced this).
- **P0** only when the violation is a real type error or undefined-behaviour bug.

LSP diagnostics are higher-signal than text linter rules — see [`references/language-tooling.md`](../../references/language-tooling.md) for which LSP tool to prefer per language. Every diagnostic emitted by the LSP is essentially a free finding.

## Phase 3 — Per-file quality review

Read each file (use `tslsp outline` first for TS/JS, then `Read` only the interesting parts). Evaluate the categories below — full long-form checklist with examples and counter-examples lives in `references/code-checklist.md`, load it on demand.

### Categories (see references/code-checklist.md for full criteria)

- Single responsibility (file + function)
- Modularity & layering (service/repository, hexagonal, feature-sliced)
- Utility placement (3+ users threshold for promotion)
- Length & density (file >300 LOC, function >50 LOC, params >4, etc.)
- Naming (verb-phrase functions, question-phrase booleans, no `Manager`/`Helper`/`Util`)
- Readability (why-not-what comments, no dead code, no stale TODOs)
- Tests (right level, don't mock the unit-under-test, useful failures)

For each smell, emit a finding. Mechanical fixes (e.g. "rename variable to follow convention") get `fix:` with a concrete change. Structural changes (e.g. "split this file") get `fix: decide:` with a question for the human.

## Phase 4 — Structural opportunities (as findings, not edits)

Structural changes — extract utility, split file, reorganise modules — are valuable but require judgment. **Do not apply them.** Emit each as a finding with `fix:` prefixed `decide:`:

```
[P2] [design] src/profile/UserCard.tsx:23 — formatUserName duplicated across 4 files
why: same function definition appears in UserCard, UserList, AdminCard, AdminList; promotion threshold passed.
fix: decide: extract to src/utils/users.ts and update the four call sites?
```

The orchestrator (`/drive-change`) sees `decide:` findings as judgment calls and surfaces them to the user. If the user confirms, the orchestrator can dispatch a fix-applier with the explicit go-ahead.

## Phase 5 — Emit findings

All findings from Phases 2, 3, and 4 follow the [`finding-format.md`](../../references/finding-format.md) block shape. The merger (`agents/orchestrate-merge.md`) validates against [`finding-format.schema.json`](../../references/finding-format.schema.json) and silently discards malformed findings — so the structured form is mandatory.

**Output structure** — plain text blocks separated by blank lines, no preamble, no praise, no summary:

```
[P0] [hygiene] src/foo.ts:147 — unused parameter `_unused` survives a recent refactor
why: project doesn't use leading-underscore for unused vars; flagged by eslint no-unused-vars on changed lines.
fix: remove the parameter from the signature at line 147 and the three call sites that pass null.

[P2] [design] src/profile/UserCard.tsx:23 — formatUserName duplicated across 4 files
why: same definition in UserCard, UserList, AdminCard, AdminList; promotion threshold passed.
fix: decide: extract to src/utils/users.ts and update the four call sites?
```

Hard cap: **20 findings per invocation**. If you have more, prioritise the top 20 and append `... N more low-severity items elided`.

## Operating rules

- **Read-only is non-negotiable.** Never `Edit`, `Write`, or run any tool in `--fix` / `--write` mode. The skill's `allowed-tools` removes `Edit`/`Write` as the structural guard; this prompt removes the auto-fix bash forms.
- **Don't refactor code the PR didn't touch.** Findings on nearby smells are OK if they're real; don't editorialise on the broader codebase.
- **Three usages is the promotion threshold for a util.** Two isn't — that's still local.
- **Don't fight the codebase's existing style.** Match local style; flag actively harmful patterns as a separate finding.
- **The trust gate applies** if this skill is invoked to address a specific review comment — re-read `references/trust-policy.md`.

## Composing with other skills

- Called by: `/review-change`, `/review-pr` (as part of the fan-out audit pipeline). Also callable directly when only a code-quality slice is wanted.
- Sibling read-only specialists: `/review-test`, `/review-feature`, `/review-security`, `/review-ux`, `/review-spec`.
- Acted on by: `/drive-change` (which dispatches fix-applier agents on the findings via `orchestrate-merge`).
