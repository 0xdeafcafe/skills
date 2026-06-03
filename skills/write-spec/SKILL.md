---
name: write-spec
description: Use when the user says "write a spec", "/write-spec", "add a feature file", "write a Gherkin spec", "specs for this feature", or asks to capture a feature's behavior as a Gherkin .feature file (Cucumber/SpecFlow/Behave/pytest-bdd style). Discovers the repo's existing specs folder and conventions, discusses the feature interactively to extract scenarios (golden path, edges, errors), then writes the .feature file matching local style. Pulls context from a related ADR if one exists. Standalone counterpart to /plan-feature, which writes ADR + spec together.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(rg:*), Bash(fd:*), Read, Edit, Write, Grep, Glob
---

# write-spec — write a Gherkin .feature file

A Gherkin `.feature` file describes a feature's behavior in a structured,
human-readable format that can be executed by a BDD test runner
(Cucumber, SpecFlow, Behave, pytest-bdd, godog, etc.). It captures:

- **What** the feature does, from the user's perspective.
- **Who** uses it and **why**.
- **Concrete scenarios** with `Given` / `When` / `Then` steps.
- **Edge cases and error paths**, not just the happy path.

A good spec doubles as documentation and as a test plan. A bad spec
reads like documentation and tests nothing — usually because the
scenarios are vague ("user does the thing" rather than "user enters
'12345' and clicks 'Submit'").

This skill discovers the repo's conventions, discusses the feature with
the user to draw out scenarios, then writes the `.feature` file in
proper Gherkin.

## Phase 0 — Find existing specs

Hunt for the specs folder. Don't assume a path; the repo will tell you.

```bash
# Common spec folder locations, in priority order.
for d in \
  specs features test/features tests/features \
  test/specs tests/specs spec spec/features \
  e2e/features acceptance acceptance/features \
  features/specs src/features integration/specs; do
  if [ -d "$d" ]; then echo "$d"; fi
done

# Or search for .feature files directly.
fd --type f --extension feature . | head -20
```

If you find existing `.feature` files, **read 2-3 of them** to extract
the convention:

- Where do they live? (Use the same directory.)
- What's the naming pattern? (`order-cancellation.feature`,
  `OrderCancellation.feature`, `cancel_order.feature`?)
- Do they have a `Feature:` narrative ("As a … I want … So that …")?
  Some teams include it; others jump straight to scenarios.
- Are `Background` sections used to avoid repeating common `Given`
  steps?
- Is `Scenario Outline` used for parameterized scenarios?
- Are scenarios tagged? (`@smoke`, `@wip`, `@regression`, `@p0`?)
- What's the typical step language style? (`Given the user has X` vs
  `Given a user with X`; past tense vs. present tense; using `When I…`
  for first-person actor or `When the customer…` for third-person.)
- Are there reusable steps in step-definition files? Match the same
  natural-language phrasing so the new scenarios reuse them.

If **no existing `.feature` files**, default to **`specs/`** at the repo
root (the convention the user mentioned), kebab-case file names, with
the full `As a … I want … So that …` narrative. State this default to
the user so they can redirect.

## Phase 1 — Find related context

Before discussing the feature, look for what's already known about it:

```bash
# Related ADR — search by feature keyword.
fd --type f --extension md . docs/adr docs/architecture/decisions 2>/dev/null \
  | xargs rg -l -i '<feature-keyword>' 2>/dev/null

# Related PR / branch description.
gh pr view --json body --jq .body 2>/dev/null
```

If a related ADR exists, read it. ADRs answer "why are we doing this";
the spec answers "what exactly does it do". Don't repeat the ADR — link
to it in a comment at the top of the `.feature` file:

```gherkin
# See docs/adr/0042-order-cancellation.md
```

## Phase 2 — Discuss the feature

A spec written without conversation usually misses the cases that
matter. Pull the substance out before writing.

Cover, in roughly this order:

1. **What's the feature, in one sentence?** "Customers can cancel orders
   placed within the last 24 hours."
2. **Who's the user / actor?** Customer, admin, internal user, service?
   Multiple actors usually means multiple scenarios with different
   `Given`s.
3. **What's the goal?** What problem does this solve for them?
4. **What's the golden path — step by step?** What does the user do,
   what does the system do, what's the visible result? Be concrete:
   "clicks Cancel" beats "interacts with the UI."
5. **What's the success state?** Both system-side (DB updated, event
   emitted) and user-side (toast, redirect, email).
6. **What are the edge cases?**
   - Boundary: "exactly 24 hours" — does that round up or down?
   - Authentication: what if they're not logged in?
   - Authorization: what if it's someone else's order?
   - Concurrency: what if two cancel requests fire simultaneously?
   - Missing: what if the order doesn't exist?
   - Already-acted-on: what if it's already cancelled?
7. **What are the error paths?** Network failure, validation failure,
   downstream service failure (refund API down, email service down).
   What does the user see? What does the system do?
8. **Are there variations across input?** (Parameterized scenarios —
   `Scenario Outline` is the right tool for this.)
9. **What's NOT in scope?** Often more useful than what is. If the spec
   doesn't cover bulk cancellation, say so explicitly so the team
   doesn't assume it does.

You don't need to ask everything in one turn. Pick the 2-3 gaps in what
the user has told you and ask them. Iterate.

**Concreteness wins.** A scenario like:

```gherkin
Scenario: User does something
  Given the system is set up
  When the user does the thing
  Then it works
```

…is worse than no spec at all — it gives false confidence. Push for
concrete values, observable outcomes, and specific user actions.

## Phase 3 — Draft the spec

Structure each `.feature` file like this:

```gherkin
# Optional: link to ADR / related docs
# See docs/adr/0042-order-cancellation.md

Feature: <short feature title>
  As a <role>
  I want <capability>
  So that <benefit>

  Background:
    # Steps that apply to EVERY scenario in this file.
    # Use sparingly — if it's only common to 2 of 5 scenarios, repeat.
    Given <common precondition>

  @<tag>
  Scenario: <one specific, descriptive title>
    Given <concrete starting state>
    When <one specific action>
    Then <one observable outcome>
    And <next observable outcome>

  Scenario Outline: <parameterized scenarios>
    Given an order placed <age> ago
    When the customer requests cancellation
    Then the response is <result>

    Examples:
      | age      | result    |
      | 1 hour   | success   |
      | 23 hours | success   |
      | 25 hours | rejected  |
```

Drafting guidelines:

- **One Feature per file**, named after the file. `order-cancellation.feature`
  contains `Feature: Order cancellation`.
- **Scenarios are independent.** Don't write Scenario B that depends on
  Scenario A having run. Each one starts from its own `Given`.
- **Steps are declarative, not procedural.** `Given the user is logged in`
  beats `Given I navigate to /login, enter "user@example.com", click
  Submit, am redirected to /dashboard`. Step-definition code can
  implement the declarative step however it likes.
- **One `When` per scenario** is the rule of thumb. Multiple `When`s
  usually means two scenarios glued together.
- **`Then` describes outcomes, not actions.** `Then the order is
  cancelled` — observable. `Then click confirm` — that's a `When`, in a
  different scenario.
- **Avoid implementation details.** No HTTP routes, no DB tables, no
  CSS selectors in the spec. Those belong in step definitions.
- **Tag intentionally.** Common tags:
  - `@wip` — work in progress; don't run in CI yet
  - `@smoke` — quick acceptance tests
  - `@regression` — full coverage
  - `@p0` / `@critical` — must always pass
  - `@manual` — not yet automated
  - Feature-area tags (`@checkout`, `@auth`) for selective runs
- **Use `Scenario Outline` only for genuine parameterization.** Two
  scenarios that differ in one variable → outline. Two scenarios that
  differ in two unrelated variables → two scenarios; an outline obscures
  what's being tested.
- **Include negative scenarios.** "User cannot cancel after 24 hours" is
  as important as the positive scenario, and often forgotten.

## Phase 4 — Review with the user

Show the draft. Ask:

- "Does the golden path scenario capture how a customer actually uses
  this?"
- "Are the edge cases the ones you'd want to catch in a regression?"
- "Is anything in the spec that *isn't* in the implementation — i.e., are
  we specifying behavior that doesn't exist yet?"
- "Is anything in the implementation that *isn't* in the spec?"

The last two questions are critical: a spec out of sync with code is
worse than no spec because it lies. If the conversation reveals drift,
flag it but don't fix code in this skill — that's `/drive-feature`.

## Phase 5 — Write the file

When the user signs off:

```bash
mkdir -p <specs-dir>
```

Use the `Write` tool. File name: match existing convention.

Commit it separately from code changes — specs deserve their own commit:

```bash
git add <specs-dir>/<file>.feature
git commit -m "spec: <feature title>"
```

(Match the local commit-message style: `git log --oneline -20`.)

## Phase 6 — Verify it parses

If the repo has a BDD runner configured, run a syntax check:

```bash
# Cucumber.js
npx cucumber-js --dry-run <specs-dir>/<file>.feature

# Behave (Python)
behave --dry-run <specs-dir>/<file>.feature

# pytest-bdd
pytest --collect-only

# Godog
godog --dry-run <specs-dir>/<file>.feature

# Cucumber-rb
bundle exec cucumber --dry-run <specs-dir>/<file>.feature
```

A failing dry run usually means a syntax mistake in the `.feature`
file. Fix and re-verify.

If no runner is configured, that's fine — the file is still valid
Gherkin. Mention to the user that a runner can be wired up to make
these executable.

## Operating rules

- **Don't write a spec for a feature that doesn't exist yet AND isn't
  being built right now.** That's a wishlist, not a spec. Mark it
  `@wip` if it's actively being developed; otherwise put it in a
  separate `proposals/` directory if the team uses that pattern.
- **Don't over-specify implementation.** Steps like `When the user
  sends a POST to /api/orders/:id/cancel with X-Foo: bar` are not
  Gherkin steps — they're cURL commands in disguise. Lift to a
  declarative step.
- **Don't pad with redundant scenarios.** Two scenarios that test the
  same behavior with different inputs → one `Scenario Outline`. Three
  scenarios that test the same trivial thing → one scenario; the others
  are noise.
- **Don't skip the negative cases.** "What goes wrong" is half the
  spec.
- **Match the local style.** If the existing specs use first-person
  (`When I click`), use first-person. If third-person (`When the user
  clicks`), use third-person. Inconsistency in voice is jarring.
- **The skill writes files; it doesn't read PR comments.** If the
  conversation pulls context from a PR, the user is responsible for
  pasting it. The trust gate at
  [`../drive-pr/references/trust-policy.md`](../drive-pr/references/trust-policy.md)
  applies if you ever do read PR comments directly.

## Composing with other skills

- **`/plan-feature`** — bigger entry point. Writes both an ADR and a
  Gherkin spec from one discussion. Use that when starting a new
  feature; use this (`/write-spec`) when the ADR already exists, or
  when the change is purely behavioral (no architectural decision).
- **`/write-adr`** — for the architecture side, standalone.
- **`/review-spec`** — after writing, check for overlap or conflict
  with existing specs / ADRs.
- **`/drive-feature`** — verifies the implementation matches the spec.
  Spec written via this skill becomes drive-feature's source of truth.

## What's in `references/`

- `gherkin-reference.md` — full Gherkin syntax (keywords, tags,
  `Scenario Outline`, doc strings, data tables) and common patterns.
  Loaded on demand for less-common constructs.
