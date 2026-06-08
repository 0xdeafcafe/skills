# ADR format reference

The three common conventions. Match what's already in the repo; if
nothing is, default to MADR.

## MADR (Markdown Architecture Decision Records) - default

The most common modern format. Used by ~70% of teams that use ADRs at
all. Spec: <https://adr.github.io/madr/>.

### MADR v3 template (with frontmatter)

```markdown
---
status: accepted
date: 2026-06-08
decision-makers: [team]
consulted: []
informed: []
---

# Short title of the decision

## Context and Problem Statement

What's the situation? What's the question we need to answer? Two or three
sentences. If there's a forcing function (a deadline, a vendor change,
an outage), name it.

## Decision Drivers

* What constraints matter? (Performance, cost, team skill, vendor risk.)
* One bullet per driver. Order by importance.

## Considered Options

* Option A
* Option B
* Option C

## Decision Outcome

Chosen option: "Option B", because <one sentence on why it beat the
others - not a recap of every pro, just the deciding factor>.

### Consequences

* **Good**, because <thing that's now easier>.
* **Good**, because <thing that's now possible>.
* **Bad**, because <thing that's now harder>.
* **Bad**, because <new failure mode>.

### Confirmation

How will we know this decision was right? Specific signals: a metric, a
review date, a checkpoint. If you can't define this, the decision may be
too vague.

## Pros and Cons of the Options

### Option A

<one paragraph: what it is, when it'd be the right choice>

* Good, because <pro>
* Bad, because <con>

### Option B

<as above>

### Option C

<as above>

## More Information

Links to RFCs, tickets, prior ADRs, vendor docs.
```

### MADR v3 minimal (no frontmatter, short)

For lightweight decisions where the heavyweight template would be noise:

```markdown
# Short title

## Context and Problem Statement

<2 sentences>

## Considered Options

* A
* B

## Decision Outcome

Chosen: "A", because <one sentence>.

### Consequences

* Good: <one>
* Bad: <one>
```

A good rule: if the decision deserves more than one paragraph of
context, use the full template; otherwise the minimal.

## Michael Nygard's original format

The original ADR template from Michael Nygard's
[2011 essay](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
Still common in older / Java-flavored shops.

```markdown
# Title

## Status

Proposed | Accepted | Deprecated | Superseded by <adr-id>

## Context

What's the issue we're seeing that's motivating this decision or change?

## Decision

What is the change that we're actually proposing or doing?

## Consequences

What becomes easier or more difficult to do because of this change?
```

That's it - just four sections. The brevity is the point.

## Y-statement format

For very small decisions where even Nygard feels heavy. One sentence:

> In the context of `<use case>`, facing `<concern>`, we decided for
> `<option>` and against `<alternative>`, to achieve `<quality>`,
> accepting `<downside>`.

Example:

> In the context of user session storage, facing the need for
> horizontal scalability, we decided for Redis and against
> in-process memory, to achieve session continuity across replicas,
> accepting an additional infrastructure dependency.

Used when an ADR is required by process but the decision is too small to
justify multiple sections. Common in repos that want a *log* of decisions
without forcing every one to be a multi-page document.

## Status lifecycle

Regardless of format, ADRs typically pass through these states:

| Status | Meaning |
| --- | --- |
| Proposed | Draft, under discussion |
| Accepted | The decision is in force |
| Deprecated | The decision was reversed; no replacement |
| Superseded by `<adr-id>` | Replaced by a newer decision (id matches the repo's naming convention, e.g. `ADR 20260608` or `ADR-0042`) |

When superseding, update **both** ADRs:

1. The new ADR references the old one in its Context.
2. The old ADR's Status changes to `Superseded by <adr-id>` (matching the repo's naming convention) with a link.

Don't delete superseded ADRs. The audit log is the whole point.

## Naming conventions

| Convention | Example | Notes |
| --- | --- | --- |
| Date-prefixed compact (**default for new repos**) | `20260608-use-postgres.md` | No collisions across parallel PRs; sorts chronologically; same-day clashes broken by slug |
| Date-prefixed ISO | `2026-06-08-use-postgres.md` | Same benefits, slightly more readable, slightly more visual noise |
| Zero-padded 4-digit sequential | `0042-use-postgres.md` | Historically most common; **collides** when two PRs in parallel both grab the next number |
| Zero-padded 3-digit sequential | `042-use-postgres.md` | Same idea, smaller cap, same collision issue |
| Non-padded sequential | `42-use-postgres.md` | Sorts wrong in `ls`; avoid for new repos |
| `ADR-` prefix sequential | `ADR-0042-use-postgres.md` | Common in older repos |

Match the existing convention; don't silently introduce a new one. If
the repo uses sequential and the team is hitting merge collisions,
that's the moment to discuss switching - but get an explicit call from
the user rather than mixing schemes.

## Common mistakes

- **No alternatives.** A decision without alternatives isn't a decision -
  it's a constraint. If only one option was viable, say so explicitly
  and document why (the alternatives were tried in another team, killed
  by procurement, ruled out by regulator, etc.).
- **All upside in Consequences.** Every decision has downsides. If the
  Consequences section is all positive, you're not being honest, and
  the next person to read it won't trust the others either.
- **Wall of text for a small decision.** Lengthy ADRs for trivial
  choices waste reviewer attention and devalue the format.
- **Tiny ADR for a huge decision.** Conversely, a one-sentence Y-statement
  for "we are migrating off AWS" doesn't capture enough to be useful.
- **Decisions that aren't.** An ADR documenting that "we discussed X but
  haven't decided yet" is not an ADR. That's an RFC, a meeting note, or
  a Linear ticket.
- **Anonymous decisions.** If nobody is on the hook for the decision,
  list the team but not phantom individuals. "decision-makers: [platform
  team]" is fine. "decision-makers: [the person who happened to write
  this]" is not.
