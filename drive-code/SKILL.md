---
name: drive-code
description: Use when the user says "drive the code", "/drive-code", "clean up the code in this PR", "make sure the touched files follow best practices", or asks Claude to do a code-quality pass on the files a PR (or working tree) touches. Evaluates each touched file for single-responsibility, modularity, service/repository pattern compliance, utility placement, naming, length, and runs the project's linter + formatter. Applies mechanical fixes automatically; proposes (with diff) any structural refactor before changing it. Does NOT verify the feature's behavior (use /drive-feature) or its UX (use /drive-ux).
allowed-tools: Bash(gh:*), Bash(git:*), Bash(npm:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(npx:*), Bash(eslint:*), Bash(prettier:*), Bash(biome:*), Bash(ruff:*), Bash(black:*), Bash(gofmt:*), Bash(go:*), Bash(cargo:*), Bash(rustfmt:*), Bash(just:*), Bash(make:*), Read, Edit, Write, Grep, Glob, Skill
---

# drive-code — per-file code-quality pass on every touched file

drive-code looks at every file the PR changed and asks: does this file
still earn its keep after this change? Specifically:

- Does each file / function do one thing? (SRP)
- Are utilities in the utilities folder, services in services, repositories
  in repositories?
- Is anything growing past the point where a reader can hold it in their
  head?
- Does the linter pass? Does the formatter pass?
- Is naming clear, are abstractions earning their complexity?

The skill applies **mechanical fixes** (lint --fix, format) automatically.
For **structural changes** (splitting a file, extracting a function, moving
a util) it shows a diff first, applies it, and flags it in the report so a
human can review what changed and why.

## Phase 0 — Scope

Decide which files are in scope, in this priority order:

1. **PR context**: `gh pr diff --name-only` against the base branch.
2. **Working tree**: `git diff --name-only HEAD` for uncommitted work.
3. **An explicit list** passed by the user.

Exclude from the audit:

- Lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Cargo.lock`,
  `go.sum`, `poetry.lock`, etc.) — these aren't code-shaped.
- Generated files: anything matched by the repo's `.gitattributes` with
  `linguist-generated=true`, or anything under `dist/`, `build/`, `generated/`,
  `__generated__/`, `*.pb.go`, `*.pb.ts`.
- Pure binary blobs (images, fonts, archives).
- Files that exist purely as test fixtures (`fixtures/`, `__fixtures__/`,
  `testdata/`).
- Vendored third-party code (`vendor/`, `third_party/`, `external/`).

For everything else, run the full pass.

## Phase 1 — Discover the toolchain

Detect what the project uses, in priority order. Stop at the first hit per
category.

| Category | Detection order |
| --- | --- |
| **Linter** | `biome.json` → biome · `eslint.config.{js,ts,mjs}` / `.eslintrc*` → eslint · `ruff.toml` / `pyproject.toml[tool.ruff]` → ruff · `golangci.yml` → golangci-lint · `Cargo.toml` → `cargo clippy` |
| **Formatter** | `biome.json` → biome format · `.prettierrc*` / `prettier` in package.json → prettier · `pyproject.toml[tool.black]` → black · `gofmt` for Go · `rustfmt.toml` → cargo fmt |
| **TS/JS symbol intel** | `tsconfig.json` present → use the `tslsp` skill (do NOT fall back to grep/Edit for symbol-level work) |
| **Test runner** | `vitest.config.*` → vitest · `jest.config.*` → jest · `playwright.config.*` → playwright · `pytest.ini`/`pyproject.toml[tool.pytest]` → pytest · `go test` for Go · `cargo test` for Rust |

Read `CLAUDE.md` and the relevant `README.md` first — the project may
document its own conventions that override the defaults above.

## Phase 2 — Mechanical fixes (always safe to apply)

Run these in parallel where possible:

```bash
# Lint with --fix on the touched files only:
<linter> --fix <paths>

# Format the touched files only:
<formatter> --write <paths>  # or whatever the tool's flag is

# Organize imports on TS/JS (use tslsp, not generic shells):
tslsp code-action --file <path> --kind source.organizeImports --apply 0
```

After running:

- Diff what changed. Mechanical fixes are commit-worthy on their own.
- If lint still has unfixable issues, capture them — they go into the
  Phase 4 report.

Commit mechanical fixes separately from structural ones — keeps PR history
readable:

```bash
git add -- <only the mechanically-changed files>
git commit -m "lint + format on touched files"
```

## Phase 3 — Per-file quality review

For each file in scope, read it (use `tslsp outline` first for TS/JS to
get structure cheaply, then `Read` only the interesting parts) and evaluate
the categories below. The full long-form checklist is in
`references/code-checklist.md` — load it on demand.

### 3a. Single responsibility (file + function level)

- A file should have **one reason to change**. A `users.ts` that defines
  the `User` type, fetches users from the API, validates user input, and
  formats user names for display has four reasons to change.
- A function should do **one thing at one level of abstraction**.
  `handleSubmit` that validates, transforms, calls the API, writes to
  analytics, and updates state is doing five things — pull out the steps.
- Concrete signal: if you can't name the file or function without using
  "and" or a vague suffix like `Manager` / `Helper` / `Utils`, that's a
  smell.

### 3b. Modularity & layering (service / repository pattern)

Identify the repo's architectural layers from the directory structure.
Common patterns:

- **Service / Repository**: `services/` hold business logic;
  `repositories/` (or `data/`, `dal/`) hold data access. Services depend
  on repositories, never the reverse.
- **Hexagonal / Ports & Adapters**: `core/` (domain), `adapters/`
  (infra), `ports/` (interfaces).
- **Feature-sliced**: `features/<feature>/{api,model,ui}/` with strict
  imports between slices.

For each touched file, check:

- Is it in the right layer for what it does? A repository file that calls
  out to a third-party API for non-storage reasons is in the wrong layer.
- Does it cross a layer boundary it shouldn't? (UI importing a repository
  directly, bypassing the service.)
- Does it leak infrastructure types (DB row shapes, HTTP request objects)
  into the domain layer?

If the repo doesn't have an obvious layering, note that in the report but
don't force one in.

### 3c. Utility placement

Common smell: a one-off helper defined at the top of a file that should
live in a shared util.

- If a function has no dependency on the file's main concern, lift it to
  the appropriate `utils/` or `lib/` directory.
- Conversely: if a "util" is only used in one file, **don't** lift it. A
  premature shared util is worse than a local helper. Three usages is a
  good threshold for promotion.

### 3d. Length and density

Rough caps. These are signals to investigate, not hard rules:

| Element | Signal threshold |
| --- | --- |
| File LOC | > 300 lines |
| Function LOC | > 50 lines |
| Function parameters | > 4 |
| Function cyclomatic complexity | > 10 (eyeball nested `if`/`switch`/`for`) |
| Component (React/Vue/Svelte) props | > 8 |
| Component JSX depth | > 6 levels of nesting |
| Test file | Larger than the file it tests — sometimes fine, often a sign of over-mocking |

When a file blows past one of these: ask "could a reader find what they
need quickly?" If the file is one cohesive feature that genuinely needs
the lines, leave it. If it's three loosely-related things bolted together,
split.

### 3e. Naming

- Names match the level of abstraction. `getUser` reads at the same level
  as `getOrder` — `extractUserFromAuthHeaderAndValidate` does not.
- Booleans answer a question: `isAdmin`, `hasAccess`, `shouldRetry`. Not
  `admin: bool`.
- Avoid `Manager`, `Helper`, `Util`, `Handler`, `Service<Name>Service` —
  they're noise. Replace with what the thing actually does.
- Pluralization is consistent: `users` is a collection, `user` is one.
- File names match their primary export.

### 3f. Readability

- Comments explain **why**, never **what**. If a comment paraphrases the
  next line of code, delete it.
- No dead code — commented-out blocks, unused exports, unused imports.
- No `console.log` / `print` / `dbg!` left from development.
- No `TODO`s without a date or ticket reference. A `TODO` from 2019 is
  archaeology, not a task.
- Early returns over deeply-nested conditionals.
- Explicit over clever: don't golf one line into seven operators when two
  lines read better.

### 3g. Tests

- New code paths have tests, **at the right level**: unit for pure logic,
  integration for "does it talk to the DB right", e2e for "does the user
  flow work".
- Tests don't mock the thing they're testing. ("Mocking the function
  under test" is a frequent rookie smell.)
- Tests fail with a useful message — assert on the specific thing, not on
  `JSON.stringify(everything)`.
- Don't test the framework. `expect(useState).toBeDefined()` is not a test.

## Phase 4 — Structural changes (propose, then apply)

For any structural change identified in Phase 3 — splitting a file,
extracting a function, moving a util, renaming a symbol — do this:

1. **State the change in one sentence**: "Move `formatUserName` from
   `src/profile/UserCard.tsx` to `src/utils/users.ts` — used by 4 other
   files."
2. **Show the diff** (don't apply yet). For TS/JS use `tslsp` so imports
   are rewritten automatically:
   ```bash
   tslsp rename-file src/profile/UserCard.tsx src/utils/users.ts --dry-run
   tslsp rename --symbol formatUserName --new-name formatUserName --dry-run
   ```
3. **Apply** if it's clearly correct. Group related structural changes
   into one commit per logical change:
   ```bash
   git commit -m "extract formatUserName to src/utils/users.ts"
   ```
4. **Flag in the report** — the user should see, on a single line, every
   structural change that landed.

If a structural change is borderline (could go either way, depends on
where the codebase is heading), don't apply it. Note it in the report as
"considered but not applied: <change>, because <reason>".

## Phase 5 — Verify nothing broke

After Phase 2 + Phase 4:

```bash
# Type check (TS):
tslsp diagnostics --files <paths>

# Type check (Go / Rust / Python with pyright):
go build ./... | cargo check | npx tsc --noEmit | pyright

# Run the test suite for the affected packages (not the whole monorepo
# unless that's fast):
<test-runner> <paths>
```

If anything fails, stop, surface the failure, and undo the structural
change that caused it. Mechanical fixes (lint/format) almost never
introduce failures — if they do, the project's tooling is misconfigured;
flag that to the user.

## Phase 6 — Report

```
drive-code reviewed N files in <pr>/<working tree>.

Mechanical fixes applied:
  - lint: <K> issues auto-fixed across <M> files
  - format: <K> files reformatted
  - imports organized: <K> files

Structural changes applied (each its own commit):
  - <sha> extract formatUserName to src/utils/users.ts (4 callers)
  - <sha> split src/api/users.ts (387 LOC) into users/{queries,mutations,types}.ts

Considered but not applied:
  - merge userValidator + orderValidator into a shared Validator — not
    clearly better; the two share little behavior

Unresolved lint issues (X):
  - src/foo.ts:42  no-explicit-any  consider typing this
  - src/bar.ts:18  prefer-const     mutation looks intentional, leave to author

Files I'd flag for a human re-read:
  - src/api/orders.ts — 540 LOC, doing 3 jobs; recommend splitting in a
    follow-up PR (out of scope for the current change)

CI-equivalent gates run locally:
  - tsc: ✅
  - test: ✅ 142 passed
```

Be specific. "src/foo.ts is too long" is not actionable; "split
`src/foo.ts` into `foo/queries.ts` + `foo/mutations.ts` — the two share
no state" is.

## Operating rules

- **Mechanical fixes commit automatically.** Structural changes commit
  automatically only when the change is unambiguous; ambiguous ones get
  surfaced and skipped.
- **Don't refactor code that the PR didn't touch.** Out-of-scope cleanup
  bloats diffs and makes review harder. If you notice something nearby
  that needs attention, list it in the "files I'd flag" section, don't
  fix it in this pass.
- **Don't add abstractions for hypothetical futures.** Three usages is
  the threshold for promotion to a util. Two is not enough.
- **Don't fight the codebase's existing style.** If the repo uses
  `Manager` suffix everywhere, your one PR isn't the place to relitigate.
  Match the local style; raise a separate concern if it's actively
  harmful.
- **Use tslsp for TS/JS symbol-level work.** Never grep-and-edit a rename.
  The `tslsp` skill is mandatory in TS projects — see its SKILL.md.
- **Never `--no-verify` or `--no-edit`.** If pre-commit fails, fix the
  cause.
- **The trust gate still applies** if drive-code is used to address a
  specific review comment. Re-read `references/trust-policy.md`.

## Composing with other skills

- `/drive-pr` may suggest `/drive-code` when it notices reviewers are
  flagging the same kind of code-quality issue repeatedly.
- After `/drive-code`, `/drive-feature` is a good follow-up: code that
  *reads* well still has to *behave* well across edge cases.
- `/drive-ux` is orthogonal — it cares about the user-facing surface,
  not the code shape.

## What's in `references/`

- `code-checklist.md` — long-form, language-agnostic checklist with
  examples. Load it when you want a structured prompt.
- `trust-policy.md` — short pointer to the shared policy.
