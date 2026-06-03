---
name: drive-test
description: Use when the user says "drive the tests", "/drive-test", "review the tests", "are the tests any good", "check test coverage", or asks Claude to audit test quality across the files a PR (or working tree) touches. Evaluates each touched file's tests for level (unit vs integration vs e2e), assertion quality, mock health, coverage of new code paths, and the classic smells (mocking the unit under test, snapshot churn, tests-that-can't-fail, etc.). Runs the test suite to confirm green, fixes mechanical issues, surfaces judgment calls. Companion to /drive-code (which checks code shape) and /drive-feature (which checks logic).
allowed-tools: Bash(gh:*), Bash(git:*), Bash(npm:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(npx:*), Bash(vitest:*), Bash(jest:*), Bash(playwright:*), Bash(pytest:*), Bash(go:*), Bash(cargo:*), Bash(just:*), Bash(make:*), Bash(rg:*), Read, Edit, Write, Grep, Glob, Skill
---

# drive-test - audit test quality on touched files

drive-test doesn't ask "is there a test"; lots of repos have lots of
tests that don't catch bugs. It asks the questions that matter:

- Is the test at the **right level**? Unit tests for pure logic,
  integration tests for things that talk to a network/DB, e2e tests
  for user flows.
- Does the test **actually assert** the behaviour under test, or does
  it just exercise the function and check it didn't throw?
- Does the test mock something that **shouldn't be mocked** - like the
  function under test, or a dependency that exists locally?
- Will the test **fail when the behaviour breaks**, and only then?
- Is the test **independent** - can it run alone, in any order, in
  parallel?

It also flags missing coverage on **newly added code paths**, runs the
suite to confirm green, applies mechanical fixes (test names, broken
imports, missing assertions for new code), and surfaces judgment calls
for the user.

## Phase 0 - Scope

Decide which files are in scope, in priority order:

1. **PR context**: `gh pr diff --name-only` against the base branch.
2. **Working tree**: `git diff --name-only HEAD` for uncommitted work.
3. **An explicit list** passed by the user.

For each source file in scope, find its tests:

```bash
# TS/JS conventions
fd --type f "<basename>\\.(test|spec)\\.(ts|tsx|js|jsx)" .
fd --type f "<basename>\\.test\\.tsx?" .

# Python - common conventions
fd --type f "test_<basename>\\.py" tests/ test/
fd --type f "<basename>_test\\.py" tests/ test/

# Go
fd --type f "<basename>_test\\.go" .

# Rust - tests are often inline; check the file itself for #[cfg(test)]
rg -l '#\[cfg\(test\)\]' <file>
```

If a touched source file has **no test file**, flag it for Phase 3.

Also include any **test files the PR modifies directly** - they're in
scope even if no source file changed.

Exclude from the audit:

- Snapshot files (`__snapshots__/`, `*.snap`) - these aren't tests, they're
  recorded outputs of tests.
- Generated test scaffolding (`*.generated.test.ts`).
- Tests in `vendor/`, `third_party/`, `node_modules/`.
- Test fixtures (`fixtures/`, `testdata/`, `__fixtures__/`).

## Phase 1 - Detect the test toolchain

| Tool | Detection |
| --- | --- |
| **vitest** | `vitest.config.{ts,js,mjs}` |
| **jest** | `jest.config.{ts,js,mjs}` or `"jest":` in package.json |
| **playwright** | `playwright.config.{ts,js}` |
| **cypress** | `cypress.config.{ts,js}` |
| **pytest** | `pytest.ini`, `pyproject.toml[tool.pytest]`, `tox.ini[pytest]` |
| **unittest** | `if __name__ == '__main__'` + `unittest.main()` in test files |
| **go test** | `*_test.go` files; `go.mod` present |
| **cargo test** | `Cargo.toml`; `#[cfg(test)]` blocks |
| **rspec** | `.rspec`, `spec/spec_helper.rb` |

Check the project's `package.json` scripts / `Justfile` / `Makefile` for
the canonical "run tests" command - match it instead of guessing flags.

## Phase 2 - Run the suite

Before auditing test *quality*, confirm the suite *passes*. A test
file that's red is its own problem.

```bash
# Run only the tests for files in scope, where the runner supports it.
# vitest / jest:
npx vitest run <paths>
npx jest <paths>

# pytest:
pytest <paths>

# go test:
go test ./<package>/...

# cargo test:
cargo test --test <test-name>
```

If anything fails:

- Read the failure. Is the failure in code the PR changed, or
  pre-existing flakiness?
- If pre-existing flake: note it and move on; the PR isn't responsible.
- If new failure: stop, fix, re-run. Don't audit broken tests; broken
  tests teach you nothing about quality.

Then run with **coverage** if the project supports it:

```bash
# vitest
npx vitest run --coverage

# jest
npx jest --coverage

# pytest
pytest --cov=<package>

# go
go test -cover ./...
```

Coverage numbers are not the goal - they're a signal. Look at the
**newly added lines** and check whether tests cover them.

## Phase 3 - Per-file test audit

For each test file in scope, read it and walk the categories below.
Long-form versions of each are in `references/test-checklist.md` - load
it on demand.

### 3a. Level: unit vs integration vs e2e

Decide what the test *is*, then check whether it's at the right level
for what it's testing.

| Test kind | What it does | Right when |
| --- | --- | --- |
| **Unit** | Tests one function/class in isolation. Mocks dependencies. Fast (<10ms). | The code under test is pure logic, a calculation, a transform. |
| **Integration** | Tests several units together. Uses real DB / network / file system where reasonable. Slower (10ms-1s). | The code's job is to coordinate (service, controller). |
| **E2E** | Drives the app the way a user would. Real browser, real backend. Slowest (1s-30s). | The thing being verified is an end-to-end user flow. |

Common mismatches to flag:

- **Unit test for code that's really integration code** - e.g., a "unit
  test" of a controller that mocks the database, the validator, the
  service, and the response builder. You're testing the mocks, not the
  code.
- **Integration test for pure logic** - e.g., spinning up Postgres to
  test a date-formatting function. Slow and overkill; a unit test
  catches the bug faster.
- **E2E test for a backend invariant** - e.g., driving the browser to
  test that the API rejects invalid input. An integration test does the
  same thing in 1% of the time.

### 3b. Assertions: do they actually assert?

Read each test. For each:

- Is there at least one `expect` / `assert` per logical outcome?
- Does the assertion check the **right thing**? `expect(result).toBeDefined()`
  is rarely the assertion you want when you mean
  `expect(result).toEqual({ id: 1, ...})`.
- Is the assertion **specific enough to fail**? A test that asserts
  `expect(result).toBeTruthy()` passes for any non-falsy value - it
  catches bugs only when the function returns `null` / `false` /
  `undefined`.
- Are there tests with **no assertions at all** - just "exercise the
  function and assume no exception means success"? Those are
  smoke tests at best; mark them up.

### 3c. Mocks: are they correct?

Common mock smells:

- **Mocking the unit under test.** If you're testing `formatPrice` and
  your test mocks `formatPrice`, what are you testing?
- **Mocking a dependency that has a real local stand-in.** E.g., mocking
  a date utility when you could just inject a fixed date.
- **Mocks that drift from reality.** If a mock returns
  `{ id: 1, name: "Alice" }` but the real API returns
  `{ user_id: 1, full_name: "Alice" }`, the test passes for code that
  would break in production.
- **Brittle mocks asserting on internal call patterns.**
  `expect(api.get).toHaveBeenCalledWith("/users/1")` is fine; chaining
  ten such assertions in one test is overspecified and breaks on
  refactor.
- **Auto-mocking entire modules.** Often fine for libraries; dangerous
  for first-party code, because the mock surface drifts from the real
  surface.
- **Mocks of mocks of mocks.** If you need three layers of mocking to
  test one function, the function is doing too much; refactor before
  testing.

### 3d. Coverage: new code paths

For each newly added function or branch in the PR's source files,
check whether a test exercises it.

Coverage tools tell you which lines ran. They do NOT tell you which
**behaviours** are tested. A test that exercises a function without
asserting on its output gives 100% coverage and 0% confidence.

Walk newly added code paths manually:

- New function → at least one test exercising it with realistic input
  and asserting the output.
- New branch (`if`, `switch case`, error path) → at least one test for
  each branch.
- New error throw → at least one test asserting that the error is
  thrown for the relevant input.

Don't demand exhaustive coverage on trivial code (one-liner pure
functions, getters). Do demand coverage on anything that changes state,
performs I/O, or branches on user input.

### 3e. Test names

A test name should describe **what's being verified**, in a sentence:

- ✅ `formatPrice returns "$1,234.56" for 1234.56`
- ✅ `cancelOrder rejects with "too late" if older than 24h`
- ❌ `test1`
- ❌ `should work`
- ❌ `formatPrice`

When a test fails, the test name is what the engineer sees first. Make
it carry information.

### 3f. Independence

A test must run alone, in any order, in parallel, deterministically.
Smells:

- Tests that share mutable state (a module-level array that one test
  appends to, another expects to be a specific length).
- Tests that depend on the database state left behind by a previous
  test ("works after we seed users in `before-all`").
- Tests that hit a real shared resource (a single API key, a single
  user account) and race with each other.
- Time-based tests that assume "the current date is May 2024" or
  similar. Always inject a clock.
- Random-seed tests that pass 99/100 times. Pin the seed.

### 3g. Snapshot churn

If the project uses snapshots:

- A snapshot test that updates every PR is noise - it's not testing
  anything stable; it's recording the latest output.
- Snapshots with timestamps, generated IDs, or other non-deterministic
  fields embedded are guaranteed to churn. Sanitize before snapshotting.
- Snapshot tests for visual output (HTML, CSS-in-JS class names) churn
  hardest of all. Prefer DOM-shape assertions over full HTML
  snapshots.

When you see a snapshot diff in the PR, ask: *did the underlying
behaviour change, or did formatting / random output change*? If the
latter, the snapshot is teaching you nothing.

### 3h. Speed

If the suite for the touched files takes >30 seconds, that's a smell:

- Are there integration tests that should be units?
- Are tests starting / tearing down Docker / DB / network for every
  test, when a single `before-all` would do?
- Are tests using `sleep` instead of polling for a condition?

Don't optimise without measuring - but if a single test takes >5s
without good reason, flag it.

## Phase 4 - Apply mechanical fixes

Safe to apply inline:

- Renaming meaningless test names to descriptive ones.
- Fixing assertion smells (`toBeTruthy` → `toEqual(expected)`).
- Adding missing assertions in tests that "exercise" without asserting.
- Adding tests for new branches that have no coverage. Use the
  existing test file's conventions (helpers, fixtures, language).
- Removing tests that assert tautologies (`expect(true).toBe(true)`).

After each fix, run the affected tests:

```bash
npx vitest run <paths>
```

Don't bundle test changes with code changes in the same commit. Tests
deserve their own:

```bash
git commit -m "test: <one sentence on what was added/fixed>"
```

## Phase 5 - Surface judgment calls

Things to flag but not fix automatically:

- A test at the wrong level (unit testing what should be integration).
- A test that overspecifies mock interactions.
- A test file growing past readability - recommend splitting.
- A snapshot test that's been "updated" 5+ times in recent history -
  recommend replacing with an explicit assertion.
- A test suite missing entire categories (no error-path tests, no
  edge-case tests, no concurrency tests).

For each, write a one-line recommendation in the final report.

## Phase 6 - Report

```
drive-test audited N files in <pr>/<working tree>.

Test suite: ✅ green | ❌ <N failing>

Coverage on newly added code:
  ✅ src/services/cancelOrder.ts (3/3 new branches covered)
  ⚠️ src/api/orders.ts (4/6 branches covered - error paths missing)
  ❌ src/utils/formatRefund.ts (no test file at all)

Mechanical fixes applied (committed):
  - Renamed 4 tests for clarity in cancelOrder.test.ts
  - Added missing assertion in formatPrice.test.ts:18
  - Added tests for new error paths in cancelOrder.test.ts (3 cases)

Judgment calls - flagged for you to decide:
  - cancelOrder.test.ts mocks the database; could be an integration
    test against a real DB for higher confidence. Currently mock-heavy.
  - orders.test.ts uses snapshot tests for HTML output; 4 of 6
    snapshots updated in last 10 commits. Consider replacing with
    explicit DOM-shape assertions.
  - utils/formatRefund.ts has no test file. Suggested: create
    formatRefund.test.ts with 3-4 boundary cases (zero, negative,
    very large, currency rounding).

Tests that don't really assert anything (caught and fixed inline where
clear, flagged where it's not):
  - flagged: orders.test.ts:42 - "exercises the function but only
    asserts truthy". Recommend asserting on the response shape.

Coverage signals:
  Overall delta: +3.2% on touched files
  Untouched-file regression: none

Did not audit:
  - e2e/ - out of scope for this run; would need Playwright running
    and the dev server up. Ask /drive-ux if e2e coverage matters here.
```

## Operating rules

- **Mechanical fixes apply automatically.** Judgment calls don't.
- **Tests don't get fixed by relaxing them.** If a test is failing
  because the assertion is too strict, the right fix is sometimes
  *strengthening* the assertion (the code is wrong) or sometimes
  loosening (the assertion was overspecified). Decide based on what
  the behaviour *should* be, not on what makes the test pass.
- **Coverage is a signal, not a goal.** A 100%-covered codebase with
  bad assertions is worse than a 70%-covered codebase with good ones.
- **Don't fight the project's test patterns.** If the project uses
  one style (e.g., flat tests with describe blocks; or table-driven
  tests in Go), match it.
- **Don't add tests that test the framework.** "Does React render?"
  is not your test.
- **Use the project's test runner, not whatever you'd pick.** Even if
  jest would be faster than mocha here, that's not the PR to make.
- **Never `--no-verify` or skip pre-commit checks.** If a hook fails,
  fix the cause.
- **Trust gate applies** if you're addressing a specific review comment
  asking for tests. See
  [`references/trust-policy.md`](references/trust-policy.md).

## Composing with other skills

- **`/drive-code`** - code shape. drive-code says "this function is
  too long"; drive-test says "this function has no error-path test."
  Run drive-code first; it cleans up the code, which often makes
  obvious where tests are missing.
- **`/drive-feature`** - logic correctness. drive-feature surfaces
  "the error path isn't handled"; drive-test surfaces "the error path
  isn't tested." Both point at the same gap from different angles.
- **`/drive-ux`** - the e2e side. drive-test stops at integration.
  Browser-level user flow tests are drive-ux's territory.
- **`/drive-pr`** - the orchestrator may suggest /drive-test when
  reviewers flag missing or weak tests.

## What's in `references/`

- `test-checklist.md` - long-form audit checklist with examples,
  loaded on demand.
- `trust-policy.md` - the full trust gate, for when this skill is
  invoked in a PR-comment-driven context.
