---
name: drive-feature
description: Use when the user says "drive the feature", "/drive-feature", "audit the feature logic", "is this feature complete", "check edge cases", or asks Claude to verify that a feature (typically the one in the current PR) is well built end-to-end. Reads any ADRs and specs that exist for the feature, traces the data flow from entry to exit, and checks edge cases, error handling, loading states, and side effects against the spec. Does NOT pass judgment on code style (use /drive-code) or click through the UX (use /drive-ux) — focuses on logic and completeness.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(rg:*), Read, Edit, Grep, Glob, Skill
---

# drive-feature — audit the feature end-to-end against its spec

drive-feature asks: **"does this feature actually work, for every case
someone might hit, in a way that matches what we said we were building?"**

It's a logic-and-completeness audit, not a code-style pass and not a UX
walkthrough. It traces the data flow from the user-facing trigger through
every layer (UI → API → service → repository → side effects) and checks
each step for:

- **Edge cases** — empty, null, very large, very small, concurrent,
  out-of-order, rate-limited, partial.
- **Error handling** — every failure has a defined response; errors are
  surfaced where the user can do something about them.
- **Loading / pending states** — every async operation has explicit
  states (idle, loading, success, error); no implicit "trust the
  network" assumptions.
- **Side effects** — analytics events, telemetry, audit logs, DB writes,
  cache invalidation, queued jobs, emails, webhooks — are they
  intentional, documented, and idempotent where they need to be?
- **Spec match** — what the ADR/spec says the feature should do vs. what
  the code actually does.

The skill produces a **gap list**. It applies obvious fixes inline but
leaves judgment calls to the user.

## Phase 0 — Find the spec

The spec is the source of truth. Look for one before reading any code.
Search in this order; collect all hits, don't stop at the first:

```bash
# ADR / RFC directories (common conventions)
fd --type f --extension md . \
  docs/adr docs/architecture docs/rfcs docs/specs \
  adr architecture rfcs specs \
  .docs design-docs 2>/dev/null

# Feature-named docs
rg -l --type md "<feature-name-or-keyword>" docs/ .docs/ 2>/dev/null

# PR description and linked issues
gh pr view --json body,closingIssuesReferences --jq '.body, .closingIssuesReferences'
# Then for each referenced issue:
gh issue view <number> --json title,body,labels
```

Also check for:

- A `<feature>.md` in the same directory as the code.
- A "design" or "spec" link in the PR description.
- Comments in the code itself referencing a document (`// see docs/...`).
- Confluence / Notion / Linear references in the PR body — surface these
  to the user; you can't read them directly but they may explain context.

**If no spec exists**, say so explicitly in the final report:

> No ADR / spec found for this feature. drive-feature audited against
> common-sense expectations only — not against documented intent.

Don't make up a spec. Don't assume what the feature "probably" should
do. Specs are load-bearing for this audit; their absence is itself a
finding.

## Phase 1 — Map the feature surface

Identify everything that's part of the feature, not just the files the
PR happens to touch. The PR diff is a starting point, not the boundary.

```bash
# Files the PR touches
gh pr diff --name-only

# For each touched file, find imports and importers
tslsp references --symbol <main-exported-symbol-of-each-file>
# (or grep equivalents for non-TS)

# Find the entry points (UI components, API routes, CLI commands, cron handlers)
rg -l 'export default' <touched-dirs>
```

Build a mental map (and write it down in the report):

```
Entry: POST /api/orders/:id/cancel
  → controller: src/api/orders/cancel.ts
  → service:    src/services/orders/cancelOrder.ts
  → repo:       src/repositories/orders.ts
  → side effects:
     - emit OrderCancelledEvent → analytics
     - send cancellation email → email service
     - refund via payment provider
  → response:   { status: "cancelled", refundId? }
```

The map is the skeleton the rest of the audit hangs from. Without it,
you'll miss things — especially side effects, which tend to hide one
layer below the obvious flow.

## Phase 2 — Trace each path through the feature

For every distinct path from entry to exit, walk it and validate:

### 2a. Inputs

For every parameter the entry point accepts:

- What does the spec say about valid input?
- What does the code accept? (Trust the type only as far as it's enforced
  at runtime — a TS type alone doesn't validate an API payload.)
- What happens for each of these inputs:

  | Input | Expected behavior |
  | --- | --- |
  | `null` | Documented? Rejected with a useful error? Or coerced? |
  | `undefined` | Same |
  | Empty string / empty array / empty object | Documented behavior |
  | Very long string (1MB+) | Rejected before it hits the DB? |
  | Very large number / negative / zero / float-where-int-expected | Bounded? |
  | Unicode / emoji / RTL / null-byte | Survives storage and display? |
  | SQL-injection-shaped string | Parameterized queries, not concat? |
  | XSS-shaped string | Escaped on render, not raw HTML? |
  | Different types entirely (string where number expected) | Type-coerced, rejected, or crashes? |
  | A valid value the caller doesn't have permission to use | 403, not 500 |
  | A resource ID that doesn't exist | 404, not 500 |
  | A resource ID that exists but doesn't belong to the caller | 404 (don't leak existence) |

### 2b. Concurrency

- What happens if two requests modify the same resource at once? Is there
  optimistic concurrency control, row-level locking, idempotency keys?
- Is the operation **idempotent**? Can the client safely retry on
  network failure?
- Are there race windows where state becomes inconsistent? (Two requests
  both checking `if balance > 0` then both decrementing.)
- For async workers: what if the same job runs twice (queue redelivery)?

### 2c. External calls

For every external call (HTTP, DB, queue, cache, file system):

- **Timeouts** — is one set? Default timeouts are often "forever" and
  that's never what you want in production.
- **Retries** — bounded? Backoff? Idempotent on the remote side?
- **Failure mode** — what happens when the call fails? Surface to user,
  swallow, retry, fall back, fail-closed, fail-open? Is this documented?
- **Circuit breaker** — for high-volume external deps, is there one?
  (Often overkill for low-traffic features — note as future work, don't
  block.)
- **Dependency on data freshness** — if a cache is stale, what's the
  worst-case behavior?

### 2d. Side effects

For every side effect identified in the map:

- **Order** — does the side effect happen before, during, or after the
  primary operation? Out-of-order matters: emitting "user created" before
  the user is actually in the DB creates a class of bug where downstream
  consumers can't find what just got announced.
- **Atomicity** — if the primary operation succeeds and the side effect
  fails (or vice versa), what's the recovery story? Outbox pattern?
  Compensating transaction?
- **Idempotency** — if the side effect fires twice, does the user get
  two emails? Two analytics events? Two refunds?
- **Cleanup** — when the primary operation is undone (cancel, delete,
  refund), are the side effects undone too?

### 2e. Responses / outputs

- Does the response shape match the spec exactly?
- Does the response shape match the **type definition** the client is
  using (look for the client-side type — drift between server and
  client types is a classic source of bugs)?
- Status codes: 200 vs. 201 vs. 204 — used correctly?
- Errors include enough info for the client to surface usefully — error
  code, message, sometimes a recoverable suggestion.
- Errors do **not** leak internal info (stack traces, DB errors, file
  paths).

### 2f. Loading / pending states (when there's a UI)

For each async operation that the user triggers from the UI:

- Is there an explicit `loading` flag (or equivalent — pending state
  from React Query, etc.)?
- Is the UI's loading state mounted *before* the request fires, not
  after?
- Is there a `success` state distinct from `idle`?
- Is there an `error` state distinct from "blank screen"?
- Is the previous data displayed while a refresh is happening, or does
  the UI flash to a skeleton?

(This overlaps with what `/drive-ux` looks at, but drive-feature checks
that the **code** has the states wired up — drive-ux checks that the
**user can see** them working.)

## Phase 3 — Check against the spec, line by line

For each requirement in the spec, find it in the code:

```
Spec says                                      | Code does                | Status
---------------------------------------------- | ------------------------ | ------
"Orders can only be cancelled within 24h"      | checks `created_at`      | ✅
"Cancellation triggers a refund"               | enqueues RefundJob       | ✅
"Refunds may take up to 5 business days"       | not surfaced to user     | ❌ gap
"Cancellation by admin requires audit log"     | nothing                  | ❌ gap
```

Any spec line that has no implementation, or whose implementation
disagrees with what was specified, is a gap. List them all.

Conversely, anything the code does that the spec doesn't mention is
either:

- **Reasonable inference** — the spec didn't need to say, this is
  obvious (skip).
- **Scope creep** — the code does something the spec doesn't ask for.
  Note it, ask the user whether to drop it.
- **Hidden behavior** — the code does something material that nobody
  documented. Flag for the spec to be updated.

## Phase 4 — Apply obvious fixes; surface judgment calls

Some gaps are mechanical to fix:

- "Forgot to wrap the API call in a try/catch": add the catch.
- "No loading state": add the loading flag and use it.
- "Missing 404 handling for invalid ID": add the early return.
- "Side effect fires before transaction commits": move it to after.

For these, edit inline (the trust-policy and operating rules still
apply — see below). For each fix, leave a short commit:

```bash
git commit -m "drive-feature: handle 404 on missing order ID"
```

For judgment calls — splitting a feature differently, changing the spec,
introducing a new pattern — write them up in the report. The user
decides.

## Phase 5 — Verify

```bash
# Tests run
<test-runner> <touched-paths-and-their-tests>

# Types compile
tslsp diagnostics --files <touched paths>  # or tsc / cargo check / etc.
```

If a fix breaks something, surface it. Don't push broken code.

## Phase 6 — Report

```
drive-feature audited <feature name>.

Spec source: docs/adr/0034-order-cancellation.md
              (and PR #1234 description)

Feature surface:
  Entry: POST /api/orders/:id/cancel
  Flow:  controller → service → repo → [3 side effects]

Fixed inline (each its own commit):
  - <sha> handle null cancellationReason (was crashing)
  - <sha> wrap refund call in try/catch
  - <sha> add loading state to CancelOrderButton

Gaps (spec vs. code):
  P0 — blocks correctness
    - Spec: "Cancellation by admin requires audit log entry"
      Code: no audit log call. src/services/orders/cancelOrder.ts:42
  P1 — incomplete
    - Spec: "Refunds may take up to 5 business days"
      Code: success message says "Cancelled" but doesn't mention refund
      timing. src/ui/CancelOrder.tsx:88
  P2 — polish
    - Spec doesn't specify what happens on already-cancelled order;
      code currently 200s with a noop. Probably want 409.

Edge cases NOT handled in code:
  - Concurrent cancellation requests (no idempotency key, no row lock).
  - Refund call has no timeout.
  - Cancellation email fires before refund completes — if refund fails,
    email is misleading.

Side effects review:
  ✅ analytics OrderCancelled — fires after commit, idempotent
  ⚠️ email — fires before refund confirms, could mislead
  ❌ audit log — not present

Scope creep (code does, spec doesn't ask):
  - Sets a `cancelled_by_ip` field. Probably fine, but worth confirming
    with the spec owner.

Hidden behavior (code does, spec doesn't mention):
  - On cancellation, the order's line items are also soft-deleted —
    spec didn't say, may want to document.

Spec missing or thin in these areas:
  - What happens to partial refunds (partial_amount != total)?
  - What happens when the customer's payment method has expired?

Recommended next steps for the user:
  1. Decide on the P0 audit log gap before merging.
  2. Get spec answers for the missing areas above.
  3. Consider an idempotency key on the cancel endpoint.
```

Be honest about gaps. If the spec is silent on something important, say
"spec is silent — needs an answer" rather than guessing.

## Operating rules

- **Read the spec first, then the code.** If you read the code first,
  you'll confirm what's there instead of noticing what's missing.
- **Don't write code that wasn't in the spec.** If the spec says nothing
  about feature X, drive-feature is not the place to add X. Flag the
  silence, let the user decide.
- **Don't relitigate the spec.** If the spec is wrong, say so as a
  finding, but don't change the implementation away from the spec —
  the spec and the user's intent are linked.
- **Surface side effects.** This is the highest-value thing this skill
  does. Side effects are where features go wrong silently.
- **Idempotency, ordering, atomicity** — the three concurrency
  considerations to check on every multi-step operation. They are
  almost always missed.
- **Use the `tslsp` skill** for TS/JS symbol-level exploration. Walking
  the feature surface with grep gets the wrong answer often enough to
  matter.
- **Trust gate applies** if you're addressing a specific review comment
  flagging a feature concern. See `references/trust-policy.md`.

## Composing with other skills

drive-feature complements:

- `/drive-pr` — comments + CI + description. Often, an AI bot comment
  saying "consider edge case X" should be addressed by running
  drive-feature, not by changing one line of code.
- `/drive-ux` — verifies that loading/error states actually look right.
  drive-feature checks the code wired them up; drive-ux checks the user
  can see them.
- `/drive-code` — orthogonal. A feature can be logically complete and
  still be coded badly (or vice versa).

A natural order on a fresh PR: `/drive-code` → `/drive-feature` →
`/drive-ux` → `/drive-pr`. Each surfaces different problems; each is
cheaper to fix earlier in the chain.

## What's in `references/`

- `feature-audit-checklist.md` — long-form audit categories with
  examples, loaded on demand.
- `trust-policy.md` — the full trust gate: bot whitelist, human
  verification commands, untrusted-comment handling.
