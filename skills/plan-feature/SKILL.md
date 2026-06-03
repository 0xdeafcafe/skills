---
name: plan-feature
description: Use when the user says "plan a feature", "/plan-feature", "let's discuss this feature", "let's design X", "kick off feature Y", or wants Claude to drive a discussion that produces both an ADR (architecture decision record) and a Gherkin spec (.feature file) for a feature about to be built. Discovers the repo's ADR and specs conventions, holds an interactive discussion to extract scope + architecture + scenarios + edge cases, then writes both files cross-linked together. Composes /write-adr and /write-spec into the natural "I'm starting something" entry point.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(rg:*), Bash(fd:*), Read, Edit, Write, Grep, Glob, Skill
---

# plan-feature - drive the discussion that produces the ADR + spec

A new feature usually has two documents worth writing before code:

- An **ADR** for the architectural choices the feature requires (new
  table, new service boundary, new dependency, new transport, new
  pattern).
- A **Gherkin spec** for the *behaviour* - what the user does, what the
  system does back, what counts as success, what the edge cases are.

`plan-feature` is the "I'm starting something" entry point. It drives an
interactive discussion to fill out both documents at the same time, then
writes them cross-linked. It composes the same logic as `/write-adr` and
`/write-spec` - you can use either of those standalone if you only need
one half.

## When to use which skill

| Situation | Right skill |
| --- | --- |
| Pure architectural decision (DB choice, library swap, topology) - no new user-facing behaviour | `/write-adr` |
| New user-visible feature, but no architectural decision (a new filter on an existing screen) | `/write-spec` |
| New feature **with** architectural implications (new service, new data model, new external dependency) | `/plan-feature` (this one) |
| Iterating on a feature already shipped - adding a scenario to an existing spec | `/write-spec`, against the existing file |

If the user invokes `/plan-feature` but only one document is actually
called for, write only that one and explain - don't pad an ADR with a
trivial decision just because the skill name says "plan".

## Phase 0 - Discover conventions

Find both the ADR location/format and the specs location/format in
parallel:

```bash
# ADRs - see write-adr's SKILL.md for full discovery logic.
for d in docs/adr docs/architecture/decisions docs/architecture/adr \
         docs/decisions docs/architecture adr; do
  [ -d "$d" ] && echo "ADR dir: $d"
done

# Specs - see write-spec's SKILL.md for full discovery logic.
for d in specs features test/features tests/features test/specs tests/specs \
         spec spec/features e2e/features acceptance; do
  [ -d "$d" ] && echo "Specs dir: $d"
done

# .feature files (in case they're scattered).
fd --type f --extension feature . | head -10
```

Read 2-3 existing ADRs and 2-3 existing `.feature` files to extract
style. Defaults when nothing exists:

- **ADR**: `docs/adr/NNNN-title.md`, MADR v3 format.
- **Spec**: `specs/feature-name.feature`, full `As a … I want … So that …`
  narrative.

## Phase 1 - Open the discussion

Ask the user to describe the feature in their own words, then sharpen
through 3-5 follow-up turns. Cover both documents' needs in parallel:

### For the ADR side (architecture)

1. **What new architectural decisions does this feature force?**
   - New service, new table, new external dependency?
   - New pattern (event sourcing, async job queue, websocket)?
   - A choice between two options for one of the above?
2. **What constraints drive the choice?** (Performance budget, team
   skill, ops cost, vendor lock-in, regulatory.)
3. **What alternatives were considered?** Even briefly. "We considered
   X but rejected it because Y" is the heart of the ADR.
4. **What are the consequences?** What's now easier? What's now harder?
   Be honest about the downsides.

### For the spec side (behaviour)

5. **Who's the user?** Customer, admin, internal, service?
6. **What do they do, step by step?** Concrete actions and inputs.
7. **What's the success criterion - what do they see / what does the
   system do?**
8. **What are the edge cases?** Empty, missing, already-done, concurrent,
   permission boundary, rate limit, network failure.
9. **What's the negative case?** When the user *can't* do this - what
   happens?

### Shared questions

10. **What's the forcing function?** A deadline, an outage, a vendor
    migration, a new customer requirement. Without one, you're often
    too early - flag this to the user.
11. **What's NOT in scope?** Often more useful than what is.
12. **Who needs to be consulted?** Security, legal, platform team, the
    on-call rotation?

You don't need to ask all twelve in one turn. Read the user's initial
description, identify the biggest gaps, ask 2-3 questions. Iterate.

## Phase 2 - Decide what to write

After 2-4 turns of discussion, you should know:

- Is there at least one **architectural** decision worth capturing?
  (Multiple options were considered, the choice has lasting
  consequences, the team needs to remember why.)
- Is there at least one **behavioural** flow worth specifying?
  (User-visible, non-trivial, multiple scenarios, edge cases that matter.)

State the plan back to the user:

```
Plan:
  - Writing ADR-NNNN: "<title>"  (location: docs/adr/)
  - Writing spec: <feature-name>.feature  (location: specs/)
  - The ADR will reference the spec for the behavioural contract;
    the spec will reference the ADR for the architectural rationale.
```

If only one document is justified, write only that one and explain
why the other isn't needed.

If neither is justified - the conversation revealed it's a tiny change
or already specified elsewhere - say so. Don't write something just
because the skill was invoked.

## Phase 3 - Draft both

Write the ADR using the convention you found in Phase 0 (or default to
MADR v3 with frontmatter if the repo has no existing ADRs). The
`/write-adr` skill, if installed, carries the full template reference.

Write the `.feature` file using the convention from Phase 0. The
`/write-spec` skill, if installed, carries the full Gherkin syntax
reference.

### Cross-linking

- **ADR's Context section**: link to the spec.
  ```markdown
  ## Context and Problem Statement
  
  …See [specs/order-cancellation.feature](../../specs/order-cancellation.feature)
  for the behavioural contract this decision supports.
  ```

- **Spec's leading comment**: link to the ADR.
  ```gherkin
  # See docs/adr/0042-order-cancellation.md for the architectural decision
  # this spec specifies.
  
  Feature: Order cancellation
  …
  ```

Match the relative-path conventions the repo already uses (some use
absolute repo-root paths, some use relative).

## Phase 4 - Review with the user

Show both drafts. Ask:

- "Does the ADR capture the *real* reason for the architectural choice?"
- "Are the alternatives in the ADR the ones you actually considered, or
  did I invent any?"
- "Does the spec's golden path match how a user would actually flow
  through this?"
- "Are the edge cases in the spec the ones you'd want to catch in
  regression?"
- "Is there anything in either document that contradicts the other?"

Iterate. Two or three drafts is normal.

## Phase 5 - Write the files

When the user signs off:

```bash
mkdir -p <adr-dir> <specs-dir>
```

Write both files with the `Write` tool. Then commit each separately so
the history shows what was decided when:

```bash
git add <adr-dir>/<adr-file>
git commit -m "ADR-NNNN: <title>"

git add <specs-dir>/<spec-file>.feature
git commit -m "spec: <feature title>"
```

Match the repo's commit message convention (`git log --oneline -20`).

## Phase 6 - Suggest next steps

After both files land, point the user at the natural next moves:

```
Plan documents written:
  - docs/adr/0042-order-cancellation.md
  - specs/order-cancellation.feature

Next steps you might want:
  - /review-spec specs/order-cancellation.feature
    Checks for overlap with existing specs and ADRs before you start
    building.
  - Start implementation - the ADR defines the *shape*, the spec
    defines the *behaviour*.
  - Once code exists, /drive-feature checks it against the spec.
```

## Operating rules

- **Have the discussion. Don't skip to writing.** A 5-turn discussion
  produces documents the team will actually use; a one-shot draft from
  the user's first sentence produces fan fiction.
- **Don't decide the decision for the user.** Present the trade-offs;
  let them choose. If asked for an opinion, give one with reasons, but
  the call is theirs.
- **Don't pad alternatives.** If only one option was viable, say so in
  the ADR rather than inventing strawman alternatives.
- **Don't pad scenarios.** A spec with 3 well-chosen scenarios beats a
  spec with 20 trivial ones.
- **One document is OK.** If only the ADR is justified, write only the
  ADR. If only the spec is justified, write only the spec. Don't force
  both.
- **Zero documents is sometimes OK too.** If the conversation reveals
  the work is too small or already documented elsewhere, say so and
  exit. The skill doesn't owe you an output.
- **Match local style.** Read 2-3 existing examples of each document
  type before drafting.
- **Cross-link both ways.** ADR → spec, spec → ADR. Without
  cross-links, the two documents drift.
- **No PR comment reading.** This skill is a discussion + write loop;
  it doesn't read PR comments. If the user wants to draw on PR
  conversation, they paste the relevant content into the chat.

## Composing with other skills

- **`/write-adr`** - for ADR-only situations.
- **`/write-spec`** - for spec-only situations.
- **`/review-spec`** - after `plan-feature` lands both documents,
  this checks for overlap / conflict against the rest of the corpus.
- **`/drive-feature`** - once code exists, this is the auditor that
  checks code against the spec the user wrote here.
