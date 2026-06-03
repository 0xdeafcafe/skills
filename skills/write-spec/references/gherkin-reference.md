# Gherkin syntax reference

Loaded on demand when the SKILL.md needs a reminder about a specific
Gherkin construct, or when matching an unfamiliar existing style in the
repo.

## Keywords

| Keyword | Purpose |
| --- | --- |
| `Feature:` | One per file. The name of the feature. |
| `Rule:` | (Gherkin 6+) Groups related scenarios under a business rule. Optional. |
| `Background:` | Steps that run before every scenario in the file. |
| `Scenario:` / `Example:` | A single test case. |
| `Scenario Outline:` / `Scenario Template:` | A parameterized scenario. |
| `Examples:` / `Scenarios:` | Data table for a `Scenario Outline`. |
| `Given` | Sets up the starting state. |
| `When` | Performs the action under test. |
| `Then` | Asserts the outcome. |
| `And` | Chains multiple `Given` / `When` / `Then` steps. |
| `But` | Negative chain — same semantic as `And` but reads better for "but not X". |
| `*` | Bullet-style step keyword — same semantic as `Given`/`When`/`Then` depending on context. |

## Minimal file

```gherkin
Feature: User can log in

  Scenario: Successful login with correct credentials
    Given a registered user with email "alice@example.com" and password "secret"
    When they submit the login form with those credentials
    Then they are redirected to the dashboard
    And a session cookie is set
```

## Full file with all the bells

```gherkin
# A leading comment. Anything starting with # is ignored by the parser.

@auth @smoke
Feature: User authentication
  As a returning user
  I want to log in with my email and password
  So that I can access my private dashboard

  Background:
    Given the system is operational
    And the database has been seeded with default users

  Rule: A user must provide correct credentials

    @p0
    Scenario: Successful login with correct credentials
      Given a registered user "alice@example.com" with password "secret"
      When they submit the login form with those credentials
      Then they are redirected to the dashboard
      And a session cookie is set

    Scenario: Failed login with wrong password
      Given a registered user "alice@example.com" with password "secret"
      When they submit the login form with password "wrong"
      Then they remain on the login page
      And an error message "Invalid credentials" is shown
      But no session cookie is set

  Rule: Multiple failed attempts lock the account

    Scenario Outline: Account locks after <attempts> failed attempts
      Given a registered user "alice@example.com" with password "secret"
      When they submit the login form with the wrong password <attempts> times
      Then the account is <state>

      Examples:
        | attempts | state    |
        | 1        | active   |
        | 2        | active   |
        | 3        | active   |
        | 4        | active   |
        | 5        | locked   |
        | 10       | locked   |

  @wip
  Scenario: User can recover a locked account via email
    Given a locked user account "alice@example.com"
    When they request a password reset
    Then a recovery email is sent within 1 minute
    And the email contains a single-use reset link
```

## Tags

Tags are `@`-prefixed labels placed before a `Feature` or `Scenario`.
They control selective test runs and serve as documentation.

```gherkin
@auth @smoke @p0
Feature: User authentication

  @manual
  Scenario: Manual verification of MFA flow on real hardware
    ...
```

Common conventions:

| Tag | Meaning |
| --- | --- |
| `@wip` | Work in progress — skip in CI |
| `@smoke` | Run on every commit; the minimum bar for "works at all" |
| `@regression` | Run on release branches; full coverage |
| `@p0` / `@critical` | Must always pass; failure blocks deploy |
| `@manual` | Not yet automated; documents intent |
| `@slow` | Excluded from fast feedback loops |
| `@<feature>` | Feature area, e.g. `@checkout`, `@auth` |
| `@skip-ci` | Skip in CI but run locally |
| `@requires-db` | Needs a real DB, not a mock |

The runner picks scenarios via tag expressions:

```bash
# Cucumber.js: run @smoke and @p0, but skip @wip
npx cucumber-js --tags '(@smoke or @p0) and not @wip'

# Behave
behave --tags '@smoke,~@wip'
```

## Data tables

Inline tables within a step, for structured input:

```gherkin
Scenario: Cart contains the expected items
  Given a customer has added the following items to their cart:
    | name        | quantity | price |
    | T-shirt     | 2        | 19.99 |
    | Mug         | 1        |  9.99 |
    | Sticker pack| 3        |  2.50 |
  When they view the cart
  Then the subtotal is 47.47
```

Step definitions receive the table as a list/array of dicts (depending
on language).

## Doc strings (multi-line strings)

For payloads larger than one line:

```gherkin
Scenario: Webhook posts a JSON payload
  Given a webhook configured at "https://example.com/hook"
  When the system fires an order-cancelled event with payload:
    """
    {
      "order_id": "ord_123",
      "reason": "customer_request",
      "amount": 4999
    }
    """
  Then the webhook receives 200 OK within 5 seconds
```

The triple quotes (`"""`) define a doc string. Indentation is preserved.

## `Scenario Outline` — parameterized scenarios

Use when the same scenario structure repeats with different values:

```gherkin
Scenario Outline: Customer can cancel within 24h
  Given an order placed <age> ago
  When the customer requests cancellation
  Then the response is <result>
  And the order status is <status>

  Examples:
    | age       | result    | status     |
    | 5 minutes | success   | cancelled  |
    | 12 hours  | success   | cancelled  |
    | 23 hours  | success   | cancelled  |
    | 25 hours  | rejected  | confirmed  |
    | 7 days    | rejected  | confirmed  |
```

Placeholders use `<name>` and bind to columns of the same name in the
`Examples` table. Each row generates one concrete scenario.

When NOT to use `Scenario Outline`:

- The variations differ in multiple unrelated dimensions → separate
  scenarios.
- The variations have different step structures (some have an extra
  `Then`, etc.) → separate scenarios.
- There are only 2-3 examples and they read more clearly as separate
  scenarios with explicit titles.

## `Rule:` — grouping scenarios under a business rule

Gherkin 6+ (Cucumber 6+, etc.) supports grouping scenarios under a
named business rule. Useful when one feature file has multiple distinct
behaviors:

```gherkin
Feature: Subscription billing

  Rule: Subscriptions renew automatically on the anniversary date

    Scenario: Active subscription renews
      ...

    Scenario: Subscription with failed payment is suspended
      ...

  Rule: Cancelled subscriptions don't renew

    Scenario: Cancelled subscription stays cancelled at renewal date
      ...
```

Older runners may not support `Rule:`. Check `cucumber-js --version` /
equivalent before using.

## Step phrasing best practices

### Use declarative steps, not imperative

```gherkin
# Bad: imperative, brittle, leaks implementation
When I go to "https://app.example.com/login"
And I type "alice@example.com" into the input with id="email"
And I type "secret" into the input with id="password"
And I click the button with text="Sign in"

# Good: declarative, robust, reads like English
When alice logs in with valid credentials
```

The step definition for the good version handles the URL, selectors,
and clicks. The spec stays readable as the UI evolves.

### Be specific about data

```gherkin
# Bad — what does "items" mean? How many?
Given the cart has items

# Better — concrete and observable
Given the cart contains 3 items totalling 47.47 USD
```

### Avoid coupling scenarios

```gherkin
# Bad — Scenario 2 depends on Scenario 1 having run
Scenario: User adds an item
  When alice adds a T-shirt to her cart

Scenario: User checks out  ← depends on the above
  When alice clicks Checkout
  Then she sees the T-shirt in the order summary

# Good — each scenario starts from its own Given
Scenario: User checks out
  Given alice has a T-shirt in her cart
  When alice clicks Checkout
  Then she sees the T-shirt in the order summary
```

### One `When` per scenario

If you have two `When` steps, you usually have two scenarios bolted
together:

```gherkin
# Smell
Scenario: User adds an item and checks out
  Given alice is logged in
  When alice adds a T-shirt to her cart
  And alice clicks Checkout
  Then she sees the order summary

# Split into two scenarios — each tests one action.
```

### Past vs. present tense

Pick one and stay consistent across the file (and ideally the repo).
Past tense in `Given` ("a user has registered") reads naturally;
present tense in `When` / `Then` ("when the user clicks ...") matches
the action being narrated.

## Common parser errors

| Error | Cause |
| --- | --- |
| `Expected: 'Feature: '` | Missing or misspelled `Feature:` |
| `Expected: 'EOF'` | Step outside a Scenario (e.g. orphan `Given` after the last scenario) |
| `Inconsistent cell count` | Mismatched columns in a data table |
| `Multiple Examples for outline` | Each Outline needs exactly one `Examples:` block — split into multiple Outlines if you want different example sets |

Run a dry-run on the file before committing:

```bash
npx cucumber-js --dry-run <file>
behave --dry-run <file>
```

## When NOT to use Gherkin

- For pure unit tests of a function: use the language's native test
  framework. Gherkin steps for `add(2, 3) == 5` are over-engineered.
- For load tests, performance benchmarks: Gherkin doesn't express
  performance.
- For low-level integration tests of internal APIs: arguably fine to
  use Gherkin for the contracts, but native test frameworks are usually
  more ergonomic.

Gherkin shines for **user-visible behavior** that involves multiple
steps and observable outcomes. Use it where it earns its keep.
