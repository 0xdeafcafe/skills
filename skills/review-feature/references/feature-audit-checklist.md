# Feature audit checklist - long form

Load when you want a structured prompt for the audit. review-feature's
SKILL.md has the short version; this expands every category with
examples and common failure modes.

## Edge case grid

The classic input space. For every entry point, run through:

| Class | Examples | What usually breaks |
| --- | --- | --- |
| Missing | `null`, `undefined`, omitted field | Crashes; bad defaults |
| Empty | `""`, `[]`, `{}`, zero-length file | Off-by-one; "if list" succeeds for `[]` |
| Whitespace-only | `"   "`, `"\n\t"` | Looks empty after trim, but isn't before |
| Boundary | 0, 1, MAX_SAFE_INTEGER, negative | Off-by-one; overflow |
| Large | 1MB string, 10k-element array, 100MB file | OOM; timeouts; UI lag |
| Unicode | Emoji, combining chars, RTL, zero-width | Length lies (`"👨‍👩‍👧".length` = 8) |
| Locale | German floats `1,5`, Arabic digits, dates | Parsing assumes Latin-1 |
| Encoding | URL-encoded, base64-mangled, double-encoded | Decode-twice or not-at-all |
| Hostile | SQLi, XSS, path traversal, prototype pollution | Trust boundary failure |
| Stale | Outdated cached value, replayed request | Acts on wrong state |
| Concurrent | Same resource, simultaneous writers | Lost updates |

For each, decide whether the code handles it. "Handle" includes
"explicitly reject with a clear error" - silent rejection isn't handling.

## Failure modes

The places code fails, ranked by frequency in real outages:

1. **External call timeout / hang** - no timeout set, request hangs
   forever, holds connection pool open, cascades.
2. **Database constraint violation** - INSERT fails on a unique
   constraint mid-flow; was the rest of the operation transactional?
3. **Out-of-order events** - message queue redelivery, webhook retry
   from upstream, event A arrives after event B that depended on A.
4. **Authn/authz drift** - token valid but stale (user was deleted, role
   was removed); resource accessed under different identity than
   expected.
5. **Resource exhaustion** - disk full, memory limit hit, file
   descriptors exhausted, rate-limited by upstream.
6. **Deserialization errors** - unexpected schema, version drift,
   missing field that "could never be missing."
7. **Floating-point** - `0.1 + 0.2`, money in floats, currency rounding.
8. **Time zones** - server in UTC, user in local, DB stored as naive
   datetime.
9. **Daylight saving** - duplicate hour, missing hour, scheduled jobs
   firing twice or zero times.
10. **Leap seconds, leap days** - calendar arithmetic on Feb 29 or
    Dec 31 → Jan 1.

For every multi-step flow, ask: if step N of M fails, what's the state of
the world? Is it recoverable? Is it observable?

## Loading / pending state matrix

For every async operation surfaced to a user, the UI should distinguish:

| State | Trigger | What UI shows |
| --- | --- | --- |
| `idle` | Initial mount, no request fired | The form / blank state |
| `loading` | Request in flight, no prior data | Skeleton, spinner with delay |
| `loading-with-data` | Refresh while previous data exists | Old data + subtle refresh indicator |
| `success` | Request resolved, data present | The data |
| `success-empty` | Request resolved, no data | Designed empty state |
| `error` | Request rejected | Specific error + retry |
| `success-stale` | Data exists but is older than threshold | Old data + "last updated" + refresh |

Code should explicitly model these states. The common bug is collapsing
`loading` and `idle` into one falsy `data` check - works until it
doesn't, especially after a refresh.

## Side effects taxonomy

Side effects are operations whose primary purpose is something other
than computing the response. They are also where features break
quietly. Check each side effect for:

### Ordering

- Does the effect fire **before** the primary state change commits, or
  **after**?
- Before: faster perceived latency, but if commit fails the effect is
  orphaned (event published for an order that doesn't exist).
- After: safer correctness, but if the effect fails the primary
  operation looks complete-but-incomplete to downstream.
- The outbox pattern resolves this by writing the effect intent to the
  same transaction as the primary change, then dispatching async.

### Atomicity

- If a flow has 3 side effects and the 2nd one fails, are the 1st and
  3rd applied? Rolled back? Compensating transaction?
- For irreversible effects (sent emails, charged cards): is there a
  documented way to handle "primary succeeded but compensating effect
  failed"?

### Idempotency

- If the effect runs twice (queue redelivery, manual retry), what's the
  impact?
- Common idempotency techniques: idempotency keys, deduplication via
  unique constraints, natural keys (an email is dedup'd by message-id).

### Observability

- Is the effect logged? Traced? Counted in metrics?
- When the effect fails, is the failure surfaced anywhere a human can
  see it?

### Reversal

- When the primary operation is undone (cancel, delete, refund), are
  the effects undone too? Usually no - sent emails can't be unsent.
- For effects that *can* be reversed (counter increments, role grants),
  is there an explicit reversal path?

## Authorization checklist

For every entry point:

- Is there an explicit authn check? (Token validation, session lookup.)
- Is there an explicit authz check? (Can this user access this
  resource?)
- Is the authz check at the **right level**? (At the controller for
  coarse access; at the service for resource-level access; at the
  repository as a backstop.)
- Are 401, 403, 404 distinguished correctly?
  - 401: not authenticated.
  - 403: authenticated but not authorized.
  - 404: resource doesn't exist OR caller can't see it (often correct
    to return 404 instead of 403 to avoid leaking existence).
- Is admin access logged?
- Is access to other-tenant data prevented?

## Data-integrity checklist

- Are foreign keys enforced (DB-level, not just app-level)?
- Are uniqueness constraints enforced in the DB, not just by app code?
- Are check constraints used for invariants (e.g., `balance >= 0`)?
- Is currency stored in integer minor units (cents) or in floats? (If
  floats: that's a bug.)
- Are dates / times stored with explicit time zones?
- Are deletes hard or soft? If soft, is the soft-delete predicate
  applied **everywhere** the data is queried?

## API design checklist

- Are response shapes documented (OpenAPI, JSDoc, contract test)?
- Are response shapes versioned? Or is there a single rolling version?
- Is the public API the same as the internal API, or is there a
  translation layer (DTO)?
- Error responses follow a consistent shape (`{ error: { code, message } }`
  or RFC 7807, etc.)?
- Is pagination consistent (limit/offset vs. cursor)?
- Are list endpoints bounded (max page size enforced)?
- Are filter / sort parameters whitelisted, not passed straight to the
  ORM?

## Background jobs / queues

- Is the job idempotent on redelivery?
- Is the job's input small enough to fit in a message? (Or does it
  fetch input by ID from a DB, which is usually right?)
- Does the job have a maximum runtime?
- Does the job have a retry policy with backoff?
- Does the job have a dead-letter handler?
- Are job failures alerted on, or do they pile up unseen?

## Migrations

- Does the migration require a deploy ordering (forward-compatible
  reads while writes are still on old schema)?
- Is the migration online-safe at the table's row count? (`ADD COLUMN
  NOT NULL DEFAULT` on a 50M-row table is not online-safe.)
- Is there a backout plan if the migration goes wrong?
- Does the migration preserve data already in the table?

## "Worked locally" vs. "works in prod" - production-only failure modes

- Concurrency: prod has parallel writers; dev usually doesn't.
- Data volume: prod has millions of rows; dev has tens. Queries that
  were fine become slow.
- Network: prod has variable latency, intermittent failure; dev is
  loopback.
- Authn: prod uses real tokens / SSO; dev often uses stubs.
- Feature flags: prod has a real flag service; dev might bypass.
- Time: prod runs across midnight, across DST, across leap day; tests
  often pin time.

For every change, ask: "what production condition is harder than my
local condition?" That's where the bug will be.

## Telemetry / observability

- Are the metrics needed to operate this feature in place?
  Throughput, latency, error rate at minimum.
- Are the metrics dimensioned usefully? (Per route, per status, per
  customer tier - not just a single global counter.)
- Are SLOs defined? Is this feature in scope of an existing SLO?
- Is there a dashboard? An alert?
- Are logs structured (JSON) or raw text?

## When the spec is missing or contradictory

- If multiple specs disagree, surface the disagreement; don't pick a
  winner unilaterally.
- If the spec is missing, default to common-sense defaults but call out
  every place you applied a default - those are the lines someone needs
  to write a spec for.
- If the code makes a non-obvious choice and the spec is silent, flag
  the choice. Even if it's the right one, it should be documented.
