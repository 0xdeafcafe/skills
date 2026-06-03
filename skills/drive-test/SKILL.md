---
name: drive-test
description: Use when the user says "drive the tests", "/drive-test", "review the tests", "are the tests any good", "check test coverage", or asks Claude to audit test quality across the files a PR (or working tree) touches. Evaluates each touched file's tests for level (unit vs integration vs e2e), assertion quality, mock health, coverage of new code paths, and the classic smells (mocking the unit under test, snapshot churn, tests-that-can't-fail, etc.). Runs the test suite to confirm green, fixes mechanical issues, surfaces judgment calls. Companion to /drive-code (which checks code shape) and /drive-feature (which checks logic).
allowed-tools: Bash(gh:*), Bash(git:*), Bash(npm:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(npx:*), Bash(vitest:*), Bash(jest:*), Bash(playwright:*), Bash(pytest:*), Bash(go:*), Bash(cargo:*), Bash(just:*), Bash(make:*), Bash(rg:*), Read, Edit, Write, Grep, Glob, Skill
---

# drive-test - audit test quality on touched files

drive-test doesn't ask "is there a test"; lots of repos have lots of tests that don't catch bugs. It asks:

- Is the test at the **right level**? Unit / integration / e2e.
- Does it **actually assert** the behaviour under test?
- Does it mock something that **shouldn't be mocked**?
- Will it **fail when the behaviour breaks**, and only then?
- Is it **independent** - runs alone, in any order, in parallel?

Flags missing coverage on **newly added code paths**, runs the suite, applies mechanical fixes, surfaces judgment calls.

## Phase 0 - Scope

In priority order:

1. **PR context**: `gh pr diff --name-only` against the base branch.
2. **Working tree**: `git diff --name-only HEAD`.
3. **Explicit list** from the user.

For each source file, find its tests (TS/JS `*.test.*` / `*.spec.*`; Python `test_<name>.py` / `<name>_test.py`; Go `<name>_test.go`; Rust inline `#[cfg(test)]`). If no test file exists, flag it for Phase 3. Include test files the PR modifies directly.

Exclude snapshots (`__snapshots__/`, `*.snap`), generated scaffolding, `vendor/`, `third_party/`, `node_modules/`, fixtures.

## Phase 1 - Detect the test toolchain

Detect runner from config (`vitest.config` / `jest.config` / `playwright.config` / `pytest.ini` / `pyproject.toml[tool.pytest]` / `go.mod` / `Cargo.toml` / `.rspec`). Use the project's `test` script in `package.json` / `Justfile` / `Makefile` - match it instead of guessing flags.

## Phase 2 - Run the suite

Before auditing quality, confirm the suite passes. Run only files in scope using the project's runner.

If anything fails:

- Pre-existing flake: note it, move on.
- New failure: stop, fix, re-run. Don't audit broken tests.

Then run with **coverage** if supported. Coverage is a signal, not the goal - look at newly added lines.

## Phase 3 - Per-file test audit

For each test file, walk the categories. Long-form versions in `references/test-checklist.md` - load on demand.

- **3a Level mismatch**: unit-testing-what-should-be-integration; integration-for-pure-logic; e2e-testing-a-backend-invariant.
- **3b Assertions**: real assertions vs. `toBeTruthy` / no-assertions / wrong-thing-asserted.
- **3c Mocks**: mocking-the-unit-under-test; mocks-that-drift; brittle call-pattern asserts; auto-mock drift; mocks of mocks.
- **3d Coverage on new code paths**: lines run != behaviour tested. New function / branch / error-throw each need a test.
- **3e Test names**: sentences, not `test1` / `should work`.
- **3f Independence**: no shared state, no order deps, inject clocks, pin seeds.
- **3g Snapshots**: churn audit; sanitize non-deterministic fields; prefer DOM-shape over full HTML.
- **3h Speed**: integration-where-unit-suffices; per-test Docker/DB; `sleep` instead of polling.

See `references/test-checklist.md` for examples per category.

## Phase 4 - Apply mechanical fixes

Safe to apply inline:

- Rename meaningless test names.
- Fix assertion smells (`toBeTruthy` → `toEqual(expected)`).
- Add missing assertions where tests "exercise" without asserting.
- Add tests for new branches lacking coverage; match existing conventions.
- Remove tautologies (`expect(true).toBe(true)`).

Re-run affected tests after each fix. Commit tests separately:

```bash
git commit -m "test: <one sentence>"
```

## Phase 5 - Surface judgment calls

Flag, don't fix:

- Wrong-level tests.
- Overspecified mock interactions.
- Test files past readability - recommend splitting.
- Snapshot tests updated 5+ times recently - recommend explicit assertions.
- Suites missing whole categories (no error-path, edge-case, concurrency tests).

One-line recommendation per item in the final report.

## Phase 6 - Report

```
drive-test audited N files in <pr>/<working tree>.
Suite: green | <N> failing.
Coverage on new code: per-file pass / partial / missing.
Mechanical fixes applied (committed): <list>.
Judgment calls flagged: <list>.
Did not audit: <out-of-scope, e.g. e2e>.
```

## Operating rules

- **Mechanical fixes apply automatically. Judgment calls don't.**
- **Don't fix tests by relaxing them.** Decide based on what the behaviour *should* be, not what makes the test pass.
- **Match the project's test patterns and runner.** Even if you'd pick differently, that's not the PR to make.
- **Never `--no-verify` or skip pre-commit checks.**
- **Trust gate applies** when addressing a review comment asking for tests. See [`references/trust-policy.md`](references/trust-policy.md).

## Composing with other skills

- **`/drive-code`** - code shape. Run first; cleaner code makes test gaps obvious.
- **`/drive-feature`** - logic correctness. Same gaps from a different angle.
- **`/drive-ux`** - browser-level e2e flows; drive-test stops at integration.
- **`/drive-pr`** - orchestrator; may suggest drive-test when reviewers flag tests.
