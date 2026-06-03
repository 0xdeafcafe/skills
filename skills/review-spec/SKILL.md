---
name: review-spec
description: Use when the user says "review this spec", "/review-spec", "check for overlap", "is this spec consistent with our ADRs", or asks to validate a new Gherkin spec or ADR against the existing corpus before it lands. Searches all .feature files and ADRs in the repo, flags duplicate scenarios, conflicting decisions, overlapping feature areas, missing ADR cross-links, and contradictions with the base architecture. Read-only — produces a report, never modifies files.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(rg:*), Bash(fd:*), Read, Grep, Glob
---

# review-spec — find overlap and conflicts before they ship

A spec or ADR is most useful when it's the **only** document making its
claims. Two specs that cover the same feature area drift; two ADRs that
contradict each other create silent ambiguity; a spec that ignores a
relevant ADR ships behavior that breaks an earlier decision.

`review-spec` reads a target spec or ADR (the one being reviewed) and
audits the existing corpus around it. It surfaces:

- **Duplicates** — scenarios already covered in another `.feature` file.
- **Overlaps** — the new doc and an existing doc cover related ground in
  ways that will drift over time.
- **Conflicts** — the new doc contradicts an existing ADR or another spec.
- **Missing cross-links** — relevant ADRs not referenced; relevant specs
  not referenced.
- **Orphan decisions** — the new doc relies on assumptions that should
  themselves be ADRs.

The skill is **read-only**. It writes nothing; it produces a report with
file paths, line numbers, and quoted excerpts so the user can decide
what to merge, split, or update.

## Phase 0 — Identify the target

Resolve what's being reviewed. The skill accepts:

- A path to a `.feature` file: `/review-spec specs/order-cancellation.feature`
- A path to an ADR: `/review-spec docs/adr/0042-order-cancellation.md`
- Nothing — review the most recently modified spec/ADR (`git log -1 --name-only`).
- A PR context — review specs/ADRs added/modified in the current PR
  (`gh pr diff --name-only`).

For each target, read it in full first. You're going to compare every
scenario, every keyword, every decision against the rest of the corpus —
you need to know what's in scope.

## Phase 1 — Build the corpus

Find every existing spec and ADR in the repo. These are what the target
is compared against.

```bash
# All .feature files
fd --type f --extension feature . | grep -v node_modules

# All ADRs — broad search
fd --type f --extension md . docs/adr docs/architecture/decisions \
  docs/decisions docs/architecture adr 2>/dev/null \
  | grep -E '/[0-9]+|/ADR-' | head -100

# Fallback for non-standard locations
rg -l --type md '^# ADR-?\d+|^## *Status|^---\nstatus:' docs/ . 2>/dev/null | head -100
```

If the corpus is large (>100 docs), you do NOT need to read every one
in full. Use targeted search (Phase 2) and only Read files that match a
keyword from the target.

## Phase 2 — Extract signals from the target

Pull out the things that anchor the comparison:

| Signal | How to find it |
| --- | --- |
| **Feature area / domain keywords** | The `Feature:` title, the `Rule:` titles, common nouns in scenarios. E.g., "cancellation", "refund", "order". |
| **Actor / role** | `As a <role>`, `When a <role>`, the subjects of `When` steps. E.g., "customer", "admin", "service". |
| **External systems / dependencies** | Step keywords mentioning specific systems: "payment provider", "email service", "webhook", "queue". |
| **State changes** | Verbs in `Then` steps: "is cancelled", "is refunded", "is logged". |
| **Scenarios with the same shape** | Same actor + same verb + same object → look for duplicates. |
| **(For ADRs) Decision area** | Title and Context section. The decision area is what the ADR claims authority over. |
| **(For ADRs) Referenced systems** | Databases, services, libraries named in Decision and Consequences. |

Build a list of 8-15 search keywords from these signals. These drive the
corpus search.

## Phase 3 — Search the corpus

For each keyword, find files that contain it:

```bash
rg -l --type md --type feature -i "<keyword>" \
  specs/ features/ docs/adr/ docs/architecture/ 2>/dev/null
```

Aggregate the hits. Files that hit multiple keywords are the most likely
overlaps — prioritize reading those.

Read each candidate file (use `tslsp outline` if available, or `Read`
selectively). Look for:

### Duplicates

A scenario in the target whose `Given/When/Then` shape matches a
scenario in an existing file. Exact textual match is rare; semantic
match is what matters. Examples:

| Target file | Existing file | Status |
| --- | --- | --- |
| `Customer cancels order within 24h` | `User can cancel a recent order` | Likely duplicate — same actor, same action, same constraint |
| `Customer cancels order within 24h` | `Customer cancels subscription` | Different — same actor, different object |

Report at file + line granularity:

> **Duplicate scenario**: `specs/order-cancellation.feature:23` —
> "Customer cancels order within 24h" appears to overlap with
> `specs/cancellations.feature:15` — "User cancels a recent order".
> Both have a `Given an order placed within the last 24 hours` and a
> `Then the order is marked cancelled`. Consider merging or deleting
> one.

### Overlaps (feature-area drift)

Two files that cover the same feature area at different levels of
abstraction or with subtly different terminology.

Examples:

- `specs/checkout.feature` and `specs/payment.feature` both describe
  the moment money changes hands.
- `specs/auth.feature` and `specs/login.feature` use different verbs
  for what's likely the same flow.
- An ADR talks about "the order cancellation policy" while a spec
  talks about "refund timing" — they're tightly coupled but neither
  references the other.

Report:

> **Overlap**: `specs/checkout.feature` and `specs/payment.feature` both
> have scenarios about charging a card. Consider whether one is the
> authoritative source. If both should exist, cross-reference them and
> clarify the boundary (e.g., checkout = pre-charge UX, payment =
> charge mechanics).

### Conflicts (with ADRs or other specs)

A scenario or decision that contradicts another.

Examples:

- The new spec says cancellations are allowed within 24h. An existing
  ADR says cancellations require admin approval after 4h.
- The new ADR chooses Redis. An existing ADR (still Accepted) chose
  Memcached for the same use case.
- Two specs assert mutually exclusive outcomes for the same scenario.

These are the highest-severity findings. Surface with explicit quotes:

> **Conflict**: `specs/order-cancellation.feature:30` says:
> > Then the order is cancelled within 5 seconds
>
> But `docs/adr/0028-order-state-machine.md` says:
> > Cancellations are queued and processed asynchronously; SLA is
> > under 5 minutes.
>
> These can't both be true. Either the spec needs to relax to "within
> 5 minutes", or the ADR needs to be updated (and a new ADR may be
> needed to record the change).

### Missing cross-links

The target talks about things owned by an existing ADR / spec but
doesn't link to it.

Use the corpus to find ADRs that own the feature area / decision area
the target touches. For each, check whether the target references them.

Report:

> **Missing cross-link**: the spec touches refund mechanics but
> doesn't reference `docs/adr/0019-refund-pipeline.md`, which is the
> authoritative ADR for that flow. Add a top-of-file comment
> linking to it.

### Orphan decisions

The target makes an implicit architectural claim that isn't backed by
an ADR. E.g., the spec says "the customer can cancel via email", but
there's no ADR documenting the choice to support email-based
cancellation.

Report:

> **Orphan decision**: the spec specifies email-based cancellation
> (`specs/cancel.feature:42`), but no ADR documents this as an
> architectural choice. Consider writing an ADR if this is a
> persistent design choice; otherwise, document where the choice is
> recorded (e.g., a Linear ticket linked at the top of the spec).

## Phase 4 — Build the report

Group findings by severity. Concrete, file-and-line specific, quotable.

```
review-spec audited <target> against:
  Specs corpus: <N> .feature files
  ADR corpus: <M> ADRs

Findings (severity-ordered):

  P0 — Conflicts (must resolve before merging)
    - <quote>
    - <quote>

  P1 — Duplicates (merge or delete one)
    - <quote>
    - <quote>

  P2 — Overlaps (consider clarifying boundary)
    - <quote>
    - <quote>

  P3 — Missing cross-links
    - <file>: should reference <other-file>
    - <file>: should reference <other-file>

  P4 — Orphan decisions
    - <line>: implicit decision needs an ADR or a documented source

Clean checks passed:
  - No duplicate scenario titles in target vs. corpus
  - All referenced ADR numbers exist
  - Tags used match existing tag conventions (@smoke, @p0, etc.)

Did not check:
  - <thing the skill couldn't verify, and why>
```

If there are zero findings, say so plainly:

```
review-spec audited <target> — no overlap, conflict, or missing links
found across <N> specs and <M> ADRs.
```

Don't fabricate findings to look thorough.

## Phase 5 — Suggest follow-ups

For each finding, suggest what the user could do next:

- **Conflict** → `/write-adr` to update the existing ADR; or `/write-spec`
  to adjust the spec; or a comment on both flagging the contradiction.
- **Duplicate** → consolidate. Often the right move is to delete the
  duplicate and add its unique scenarios (if any) to the canonical file.
- **Overlap** → either consolidate (one file becomes the authoritative
  source) or clarify the boundary with a top-of-file comment in each.
- **Missing cross-link** → add the link manually; this skill doesn't
  edit files.
- **Orphan decision** → `/write-adr` to capture the choice, or link to
  whatever artifact does (Linear ticket, Slack thread URL).

## Operating rules

- **Read-only.** This skill never edits a `.feature` or ADR file.
  It produces a report; the user decides what to change. (For
  fixes that need to land, the user invokes `/write-adr` or
  `/write-spec` afterwards.)
- **Don't fabricate.** A finding has to be backed by quotes from real
  files at real line numbers. "Possible overlap somewhere" is not a
  finding.
- **Severity is for prioritization.** P0 = correctness; P1-2 =
  maintainability; P3-4 = hygiene. Don't inflate severities to make
  the report look impressive.
- **Don't enforce taste.** If two specs use different but reasonable
  verbs ("cancel" vs "abort"), that's a style consistency note, not a
  P0 conflict.
- **Honor `@deprecated` tags.** A scenario tagged `@deprecated` is not
  expected to be consistent with new behavior. Skip it from conflict
  checks, but note it in the report as "deprecated, scheduled for
  removal".
- **The trust gate applies** if the skill ever reads PR comments (e.g.,
  when fetching a PR's context to figure out scope). See
  [`../drive-pr/references/trust-policy.md`](../drive-pr/references/trust-policy.md).
  Usually this skill reads only files in the repo, which are trusted by
  virtue of being committed.

## Composing with other skills

- **`/plan-feature`** writes a fresh ADR + spec; running
  `/review-spec` immediately after is the natural next step to catch
  overlap before the docs land.
- **`/write-spec`** or **`/write-adr`** — for fixing what review-spec
  surfaces.
- **`/drive-feature`** — verifies that code matches the spec. Best run
  *after* `/review-spec` has confirmed the spec itself is coherent.
