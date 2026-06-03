# Code-quality checklist - long form

Load when you want the structured prompt. drive-code's SKILL.md has the
short version inline; this is the deep-dive when you need a reminder of
categories.

## Toolchain detection

Detect what the project uses, in priority order. Stop at the first hit
per category.

| Category | Detection order |
| --- | --- |
| **Linter** | `biome.json` → biome · `eslint.config.{js,ts,mjs}` / `.eslintrc*` → eslint · `ruff.toml` / `pyproject.toml[tool.ruff]` → ruff · `golangci.yml` → golangci-lint · `Cargo.toml` → `cargo clippy` |
| **Formatter** | `biome.json` → biome format · `.prettierrc*` / `prettier` in package.json → prettier · `pyproject.toml[tool.black]` → black · `gofmt` for Go · `rustfmt.toml` → cargo fmt |
| **TS/JS symbol intel** | `tsconfig.json` present → use the `tslsp` skill (do NOT fall back to grep/Edit for symbol-level work) |
| **Test runner** | `vitest.config.*` → vitest · `jest.config.*` → jest · `playwright.config.*` → playwright · `pytest.ini`/`pyproject.toml[tool.pytest]` → pytest · `go test` for Go · `cargo test` for Rust |

## Single Responsibility

A unit of code (file, class, function, module) should have one reason to
change. If you can write a single-sentence description of what it does
without using "and", that's a good sign.

**File-level smells:**

- A file whose name doesn't match what most of its code does.
- A file with multiple unrelated exports (a util grab-bag is OK; a mix of
  React component + data-fetching hook + validation logic is not).
- A file imported by very different kinds of consumers (a UI util that's
  also imported by a CLI script suggests it's secretly two utils).

**Function-level smells:**

- A function that handles multiple levels of abstraction in the same body
  - e.g., does HTTP, then JSON parsing, then business logic, then DOM
  manipulation.
- A function with many flags / booleans as parameters - usually each
  branch wants to be its own function.
- A function whose name contains "and" or a vague suffix
  (`processAndSave`, `handleAll`, `doStuff`).

**Fix pattern:** Split by reason-to-change. If "this changes when X
happens" and "this changes when Y happens" are different, they belong in
different units.

## Modularity & Layering

### Service / Repository

The common pattern: **service** holds business rules; **repository** holds
data access; **controller / route handler** translates between transport
and service.

```
HTTP request
  → controller/route   (parse, validate request shape)
    → service          (apply business rules, orchestrate)
      → repository     (read/write storage)
```

**Direction of dependency:** strictly downward. A repository never imports
from a service. A service never imports from a controller.

**Smells:**

- A repository that knows about HTTP request bodies.
- A service that does its own SQL or fetch().
- A controller that does business logic.
- A controller-to-controller import (two routes calling each other
  directly).

### Hexagonal / Ports & Adapters

If the codebase uses this pattern (you'll see `core/`, `domain/`,
`adapters/`, `ports/`), the rules are similar:

- Domain has no imports from infrastructure.
- Adapters depend on domain interfaces (ports), never the reverse.
- Application services compose ports; they don't reach into adapters.

### Feature-sliced

Files organised by feature (`features/orders/`, `features/users/`).
Common rules:

- A feature doesn't import directly from another feature's internals -
  only its public API (an index file).
- Shared code lives in `shared/` or `common/`, not in some specific
  feature.

### What to do when there's no obvious layering

Don't impose one in a single PR. Note in the report: "this codebase
doesn't have a clear service/repository boundary, and this PR doesn't
need to be the place to introduce one - but X file is mixing HTTP and DB
in a way that will be painful at scale."

## Utility placement

A utility is code with **no domain knowledge** - generic string handling,
date math, array helpers, etc. Domain-aware functions are not utilities;
they're domain code that happens to be reused.

**Rules of thumb:**

- 1 user → keep it local.
- 2 users → keep it local, copy-paste is fine.
- 3+ users → promote to a util, but only if it's truly domain-agnostic.
- 3+ users, but domain-aware → promote, but to the right domain module,
  not to `utils/`.

**Smells:**

- `utils.ts` files with a grab-bag of unrelated functions.
- A utility that imports from a feature (utilities should be leaves of
  the dependency tree).
- A utility that's only used in one place but lives in `utils/` (probably
  premature promotion).

## Length & density

| Threshold | Signal |
| --- | --- |
| File > 300 LOC | Probably doing more than one thing |
| Function > 50 LOC | Probably doing more than one thing |
| > 4 parameters | Consider object param or split |
| Cyclomatic > 10 | Too many branches; split or refactor |
| React/Vue/Svelte > 8 props | Consider composition or context |
| JSX depth > 6 | Extract a subcomponent |

These are signals, not rules. A 400-line file that implements one
well-bounded thing (e.g., a parser for a specific grammar) is fine. A
60-line function that linearly walks a state machine with no branches is
fine.

## Naming

### Functions

- Verb-phrase: `getUser`, `validateEmail`, `renderHeader`.
- Boolean-returning: question-phrase: `isAdmin`, `hasAccess`,
  `canEdit`, `shouldRetry`.
- Async functions: avoid `getUserAsync` - every async function is async,
  the suffix is redundant.
- Don't smuggle return-shape into the name: `getUserList` is worse than
  `getUsers` (the type already says it's a list).

### Variables

- Singular vs. plural matters: `user` is one, `users` is many.
- Avoid abbreviations except for canonical ones (`id`, `url`, `http`,
  `db`). `usr`, `ord`, `prd` make code unsearchable.
- Avoid Hungarian notation: `strName`, `iCount` - modern type systems
  do this better.

### Types

- Singular: `User`, `Order`, `Address`.
- Suffix only when the name needs disambiguation: `UserDTO`, `UserEntity`,
  `UserViewModel`. Don't suffix everything just for consistency.

### Files

- Match the primary export's name: `UserCard.tsx` exports `UserCard`.
- One default export per file, named consistently with the file.
- Index files (`index.ts`) re-export public API only.

## Readability

### Comments

- **Why, not what.** If a comment says "increment i", delete it.
- **Don't paraphrase the code.** Code already says what it does.
- **Do explain non-obvious choices.** "Using setTimeout(0) here because
  Safari fires `change` before `input` and we need the new value."
- **Don't sign comments.** No "// AFR added this" or "// fix for #123".
  Git blame and PR description carry that info.

### Dead code

- Commented-out code: delete.
- Unused imports: delete.
- Unused exports: delete (verify with `tslsp references` first for TS/JS).
- Unused parameters: prefix with `_` to silence the linter, but ask
  whether the function should take them at all.

### Logging

- No `console.log` in committed code (replace with proper logger or
  remove).
- Errors should be logged at the boundary where they're caught, not at
  every layer they pass through.
- Log levels matter: debug ≠ info ≠ warn ≠ error.

### TODOs

- TODOs without a ticket reference or owner have a half-life of
  "forever".
- If you write a TODO, link it: `TODO(#1234)` or `TODO(@username)`.
- Old TODOs (months+) - delete or address. Old TODOs are archaeology.

## Tests

### Coverage where it matters

- Pure logic → unit tests (fast, exhaustive).
- Anything talking to a network / file / DB → integration test (real
  dependencies, slower, fewer).
- User flows → e2e (Playwright/Cypress, slowest, fewest).

### What good tests look like

- One assertion per test, conceptually. (Multiple `expect` calls about
  the same outcome are fine; mixing "did it call the API" + "did it
  format the response" + "did it write to localStorage" in one test is
  not.)
- Test names are sentences: `describe("formatPrice")` →
  `it("returns '$1,234.56' for 1234.56")`.
- Failures point at the right thing. `expect(actual).toEqual(expected)`
  with simple values beats `expect(JSON.stringify(actual)).toBe(...)`.

### What bad tests look like

- Mocking the function under test.
- Asserting on implementation details (e.g., "this method was called
  internally").
- Tests that pass for the wrong reason - e.g., the assertion never
  runs because the test silently returns early.
- "Smoke tests" with no real assertions (`expect(true).toBe(true)`).
- Snapshot tests for things that change every release (timestamps, IDs,
  generated CSS class names) - these are noise generators.

## Common code smells (language-agnostic)

### Switch statements over types

```ts
switch (shape.kind) {
  case "circle": return Math.PI * shape.r ** 2;
  case "square": return shape.s ** 2;
}
```

Often this should be polymorphism or a discriminated union with a
method. Once you have N callsites doing the same switch, the switch is
the smell.

### Boolean parameters

```ts
processOrder(order, true);  // ← what's `true`?
```

Replace with two functions, or an enum, or a config object with a named
property.

### Long parameter lists

> 4 parameters is a sign to consolidate into an options object or split
the function. Especially bad: many parameters of the same type
(`function move(x, y, z, dx, dy, dz)` - easy to swap, hard to spot).

### Stringly-typed APIs

```ts
getStatus("active")
```

Where "active" must be one of a known set - use a type / enum so the
compiler catches typos.

### Functions returning multiple shapes

```ts
function find(x): User | string | null
```

If the return type has more than 2 distinct shapes, you probably want
multiple functions or a tagged result.

### Hidden mutability

```ts
const config = { ... };
config.value = newValue;  // mutation in a function nominally returning a new config
```

Either be obvious about mutation, or be obvious about returning a new
value. Hidden mutation is bug bait.

## When to NOT clean up

- **It's out of scope for the PR.** Document the smell in the report; do
  not fix it in this pass.
- **The cleanup is bigger than the original change.** Often a sign the
  cleanup deserves its own PR.
- **The "cleaner" version is more complex.** If three almost-identical
  lines are clearer than the DRY'd abstraction, leave them.
- **You're not sure.** "When in doubt, leave it" is correct more often
  than "when in doubt, refactor."
