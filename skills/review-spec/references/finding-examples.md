# Finding examples and report formats

Worked examples and quote formats for each finding type produced by
`review-spec`.

## Signal extraction (full table)

| Signal | How to find it |
| --- | --- |
| **Feature area / domain keywords** | The `Feature:` title, the `Rule:` titles, common nouns in scenarios. E.g., "cancellation", "refund", "order". |
| **Actor / role** | `As a <role>`, `When a <role>`, the subjects of `When` steps. E.g., "customer", "admin", "service". |
| **External systems / dependencies** | Step keywords mentioning specific systems: "payment provider", "email service", "webhook", "queue". |
| **State changes** | Verbs in `Then` steps: "is cancelled", "is refunded", "is logged". |
| **Scenarios with the same shape** | Same actor + same verb + same object - look for duplicates. |
| **(For ADRs) Decision area** | Title and Context section. The decision area is what the ADR claims authority over. |
| **(For ADRs) Referenced systems** | Databases, services, libraries named in Decision and Consequences. |

## Duplicates

A scenario in the target whose `Given/When/Then` shape matches a
scenario in an existing file. Exact textual match is rare; semantic
match is what matters. Examples:

| Target file | Existing file | Status |
| --- | --- | --- |
| `Customer cancels order within 24h` | `User can cancel a recent order` | Likely duplicate - same actor, same action, same constraint |
| `Customer cancels order within 24h` | `Customer cancels subscription` | Different - same actor, different object |

Report at file + line granularity:

> **Duplicate scenario**: `specs/order-cancellation.feature:23` -
> "Customer cancels order within 24h" appears to overlap with
> `specs/cancellations.feature:15` - "User cancels a recent order".
> Both have a `Given an order placed within the last 24 hours` and a
> `Then the order is marked cancelled`. Consider merging or deleting
> one.

## Overlaps (feature-area drift)

Two files that cover the same feature area at different levels of
abstraction or with subtly different terminology.

Examples:

- `specs/checkout.feature` and `specs/payment.feature` both describe
  the moment money changes hands.
- `specs/auth.feature` and `specs/login.feature` use different verbs
  for what's likely the same flow.
- An ADR talks about "the order cancellation policy" while a spec
  talks about "refund timing" - they're tightly coupled but neither
  references the other.

Report:

> **Overlap**: `specs/checkout.feature` and `specs/payment.feature` both
> have scenarios about charging a card. Consider whether one is the
> authoritative source. If both should exist, cross-reference them and
> clarify the boundary (e.g., checkout = pre-charge UX, payment =
> charge mechanics).

## Conflicts (with ADRs or other specs)

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

## Missing cross-links

The target talks about things owned by an existing ADR / spec but
doesn't link to it.

Use the corpus to find ADRs that own the feature area / decision area
the target touches. For each, check whether the target references them.

Report:

> **Missing cross-link**: the spec touches refund mechanics but
> doesn't reference `docs/adr/0019-refund-pipeline.md`, which is the
> authoritative ADR for that flow. Add a top-of-file comment
> linking to it.

## Orphan decisions

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

## Full Phase 4 report template

```
review-spec audited <target> against:
  Specs corpus: <N> .feature files
  ADR corpus: <M> ADRs

Findings (severity-ordered):

  P0 - Conflicts (must resolve before merging)
    - <quote>
    - <quote>

  P1 - Duplicates (merge or delete one)
    - <quote>
    - <quote>

  P2 - Overlaps (consider clarifying boundary)
    - <quote>
    - <quote>

  P3 - Missing cross-links
    - <file>: should reference <other-file>
    - <file>: should reference <other-file>

  P4 - Orphan decisions
    - <line>: implicit decision needs an ADR or a documented source

Clean checks passed:
  - No duplicate scenario titles in target vs. corpus
  - All referenced ADR numbers exist
  - Tags used match existing tag conventions (@smoke, @p0, etc.)

Did not check:
  - <thing the skill couldn't verify, and why>
```
