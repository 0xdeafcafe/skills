# Test-quality checklist - long form

Load when you want the full audit prompt. drive-test's SKILL.md has the
short version inline.

## The testing pyramid (the version that actually works)

```
       ───────
      │  e2e  │      few, slow, fragile
     ───────────
    │ integration │  many, medium, reliable-ish
   ───────────────
  │      unit       │  lots, fast, deterministic
 ─────────────────
```

The wrong shape: an upside-down pyramid (all e2e). Slow CI, flaky tests,
nothing catches a bug until the whole thing is wired together. The other
wrong shape: all unit, no integration. Every unit passes but they
don't compose.

Right shape: lots of fast unit tests, a healthy band of integration
tests for the seams, a few e2e tests for the highest-value user flows.

### Unit tests

- **Cheap to write, cheap to run.** Should execute in <10ms each.
- **Pure functions are the easiest** - same input, same output, no side
  effects.
- **For impure functions, inject dependencies.** A function that calls
  `Date.now()` is hard to test deterministically; pass in a clock.
- **Mock at the boundary, not inside.** Don't mock the calculator your
  function uses internally; mock the network call your function makes
  to an external API.
- **Coverage target**: high (80%+ for pure logic).

### Integration tests

- **Test the seams.** When two of your modules collaborate, you want at
  least one test that runs them together with realistic data.
- **Use real dependencies where you can.** A real Postgres in Docker is
  better than a mock that drifts.
- **Run them on a faster cadence than e2e but slower than unit.** A
  pre-merge gate is reasonable; a per-keystroke gate is not.
- **Don't mock your own code.** If a service has a repository, don't
  mock the repository when testing the service - that's a unit test in
  disguise.

### E2E tests

- **Expensive. Use sparingly.** One e2e test per critical user flow,
  not one per feature.
- **Drive the real product.** Playwright, Cypress, Selenium against the
  real frontend + real backend (or as close as possible to prod).
- **Tolerate latency.** Use waits-for-conditions, not sleeps.
- **Expect flake; design for retries.** Idempotent setup, deterministic
  IDs, fixed seed data.

## The deadly sins of testing

### Sin 1: Mocking the unit under test

```ts
// Testing formatPrice
import { formatPrice } from './formatPrice';

vi.mock('./formatPrice', () => ({
  formatPrice: vi.fn(() => '$10.00'),  // ← what are you testing?
}));

it('formats prices', () => {
  expect(formatPrice(10)).toBe('$10.00');  // tests the mock, not the function
});
```

Don't laugh - this happens. Usually when someone auto-mocks an entire
module and forgets the function-under-test is in there.

### Sin 2: Mocks that drift from reality

```ts
// Real API response: { user_id: 1, full_name: "Alice" }
vi.mock('./api', () => ({
  getUser: () => ({ id: 1, name: "Alice" }),  // ← wrong shape
}));

// Code that consumes:
const user = await getUser();
console.log(user.id);  // works against the mock
// But against the real API, user.id is undefined; user.user_id is what's there.
```

The fix: either consume from contract tests (Pact, OpenAPI-driven), or
write integration tests that hit a real (or recorded) backend.

### Sin 3: Asserting on call patterns

```ts
expect(api.get).toHaveBeenCalledTimes(1);
expect(api.get).toHaveBeenCalledWith('/users/1');
expect(api.get).toHaveBeenCalledBefore(api.post);
expect(api.post).toHaveBeenCalledWith('/audit', { event: 'view' });
```

Fine in moderation. Past a few of these per test, you're testing
implementation, not behaviour. The refactor that swaps `api.get` for
`fetch` breaks every one of those assertions without changing what the
code *does*.

### Sin 4: Tests that "exercise" without asserting

```ts
it('processes the order', async () => {
  await processOrder(order);
  // ← no assertions. Test passes if the function doesn't throw.
});
```

Bug-catching value: ~0. If `processOrder` silently corrupts data, this
test still passes.

The fix: assert on observable outcomes. State of the DB, the response
shape, the side effects emitted.

### Sin 5: Snapshot tests for things that change every commit

```ts
it('matches snapshot', () => {
  expect(render(<App />)).toMatchSnapshot();
});
```

The snapshot is a 500-line dump of HTML including generated class names
(`css-1a2b3c4`), timestamps, and randomly-ordered props. Every PR
"updates" the snapshot; nobody reads the diff.

The fix: snapshot specific, stable things - the DOM structure, the
text content, the user-visible state. Not the whole rendered tree.

### Sin 6: Time-based tests that aren't deterministic

```ts
it('is recent', () => {
  const created = new Date();
  const order = createOrder();
  expect(order.created_at.getTime()).toBeGreaterThan(created.getTime() - 1000);
});
```

This works locally and fails on a slow CI runner. Fix: freeze time
(`vi.useFakeTimers()`, `freezegun`, `clock`-injection).

### Sin 7: Tests that depend on each other

```ts
let userId;

it('creates a user', async () => {
  userId = await createUser();
});

it('updates the user', async () => {
  await updateUser(userId);  // ← fails if previous test didn't run
});
```

Test 1 fails → Test 2 fails for the wrong reason. Test runner that
reorders or runs in parallel → flake.

Fix: each test sets up what it needs from scratch.

### Sin 8: Tests that share mutable state

```ts
const orders = [];  // module-level

beforeEach(() => {
  orders.push(makeOrder());
});

it('checks orders has length 1', () => {
  expect(orders.length).toBe(1);
});

it('checks orders has length 1 again', () => {
  expect(orders.length).toBe(1);  // ← actually 2 after first test ran
});
```

Fix: reset state in `beforeEach`, or scope state inside the test.

### Sin 9: Flakiness, ignored

A test that fails 1 in 20 runs is broken. Ignoring it ("just rerun CI")
breeds more flakes. Either fix it or skip-with-a-ticket.

### Sin 10: Coverage as the only metric

Hitting a coverage target by writing tests with `toBeDefined()` and
`toBeTruthy()` is worse than skipping coverage. The tests give you
confidence you haven't earned.

## What good test names look like

Test names should answer: **what behaviour is being verified?**

| Bad | Good |
| --- | --- |
| `test1` | `formatPrice returns "$1,234.56" for 1234.56` |
| `should work` | `cancelOrder rejects when order is older than 24h` |
| `it renders` | `OrderList shows an empty state when orders is []` |
| `success case` | `createUser returns a user with a generated id` |
| `error case` | `createUser throws DuplicateEmailError when email already exists` |

A failure message printed in CI is the test name. Make it carry signal.

## What good assertions look like

### Specific

```ts
// Vague
expect(result).toBeTruthy();

// Specific
expect(result).toEqual({ id: 'ord_123', status: 'cancelled' });
```

### Self-documenting

```ts
// Vague - what's the magic number?
expect(orders).toHaveLength(3);

// Self-documenting
expect(orders.filter(o => o.status === 'cancelled')).toHaveLength(3);
```

### Stable

```ts
// Brittle - depends on key ordering, whitespace
expect(JSON.stringify(result)).toBe('{"id":1,"name":"Alice"}');

// Stable
expect(result).toEqual({ id: 1, name: 'Alice' });
```

## What good test setup looks like

### Builder / factory pattern

Instead of inline literal objects everywhere:

```ts
// Repetitive, breaks when the shape changes
const order = { id: 'ord_1', userId: 'u_1', amount: 100, status: 'pending', createdAt: new Date() };

// Builder
const order = makeOrder({ status: 'cancelled' });
// makeOrder fills in defaults, lets you override only what matters.
```

Most assertions then become: "the only thing that varies is X".

### Arrange / Act / Assert

Make the structure of the test obvious:

```ts
it('cancels an order within 24h', async () => {
  // Arrange
  const order = makeOrder({ createdAt: hoursAgo(2) });
  await db.orders.insert(order);

  // Act
  const result = await cancelOrder(order.id);

  // Assert
  expect(result.status).toBe('cancelled');
  const stored = await db.orders.findById(order.id);
  expect(stored.status).toBe('cancelled');
});
```

Three visual sections; each has one job.

### Single subject per test

A test asserts one thing - though "one thing" may need multiple
`expect` calls to fully express. What you want to avoid is a test
that asserts the cancel behaviour AND the refund behaviour AND the email
behaviour in one body. Those are three tests.

## Language-specific notes

### TypeScript / JavaScript (vitest / jest)

- Run with `--changed` to scope to git changes.
- Mock with `vi.mock` / `jest.mock` at the top of the file.
- Use `expect.objectContaining` for partial matches when you don't care
  about every field.
- Don't `await` `expect(promise).resolves.toBe(x)` - `await` is wrong
  there; the matcher handles it.

### Python (pytest)

- Use fixtures (`@pytest.fixture`) for shared setup.
- `parametrize` is the equivalent of `Scenario Outline` - table-driven
  tests.
- `assert` is the assertion (no separate library needed).

### Go

- Table-driven tests are the idiom: `for _, tc := range tests`.
- `t.Helper()` makes assertion-failure line numbers point at the
  test, not the helper.
- `t.Parallel()` makes parallelism explicit; combined with
  `tc := tc` inside the range loop.

### Rust

- Tests live in `#[cfg(test)] mod tests` blocks at the bottom of the
  file, or in `tests/` directory for integration tests.
- `#[should_panic]` for testing panics.
- Avoid `unwrap()` in tests when you mean "expect this Ok" - use
  `expect("with a message")` so failures explain themselves.
