---
name: write-adr
description: Use when the user says "write an ADR", "/write-adr", "let's document this decision", "add an architecture decision record", or asks to capture a design/architecture decision in writing. Discovers the repo's existing ADR convention (location, numbering, format), discusses the decision interactively to draw out the context, alternatives, and consequences, then writes the ADR file matching the local style. Standalone counterpart to /plan-feature, which writes an ADR + a Gherkin spec together.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(rg:*), Bash(fd:*), Read, Edit, Write, Grep, Glob
---

# write-adr - capture an architecture decision

An ADR (Architecture Decision Record) is a short markdown file that
explains:

- The **context** that made the decision necessary.
- The **decision** itself.
- The **alternatives** considered and why they lost.
- The **consequences** - what's better, what's worse, what's now harder.

Good ADRs answer "why did we do X instead of Y?" months later, when the
person who knew has left or forgotten.

This skill discovers the repo's existing ADR convention, discusses the
decision with the user, then writes the ADR matching the local format.

## Phase 0 - Find existing ADRs

Hunt for the ADR directory and format. Don't assume; the repo tells you
what to do.

```bash
# Common ADR locations, in priority order.
for d in docs/adr docs/architecture/decisions docs/decisions adr decisions; do
  if [ -d "$d" ]; then echo "$d"; fi
done

# Fallback: search broadly.
fd --type f --extension md '^[0-9]+[-_]' . 2>/dev/null | head -20
rg -l --type md '^# *ADR' . 2>/dev/null | head -10
```

If you find existing ADRs, **read 2-3 of them** to extract the convention:

- Location and numbering scheme (e.g. `NNNN-title.md` zero-padded, or
  `ADR-NNN-` prefix, or unnumbered).
- Format and frontmatter (see `references/adr-formats.md` for common
  patterns).
- Typical length - match it.
- `Status` transitions tracked (Proposed → Accepted → Superseded)?
- Category/component tags?

If **no existing ADRs** are found, default to **MADR v3.0** (the most
common modern convention - see `references/adr-formats.md`) and create the
directory at `docs/adr/`. State this default to the user; they can
redirect.

## Phase 1 - Discuss the decision

ADRs that are filled out without conversation are usually thin. They miss
the alternatives the team considered, or the constraints driving the
choice. Pull the substance out before writing.

Open with a short, structured prompt to the user, *unless* they've already
given you the context in their request. Cover:

1. **What's being decided + the forcing function?** A one-sentence
   statement ("should we X or Y?") plus what drove it (new requirement,
   scaling pain, vendor migration). Without a forcing function, an ADR is
   often premature.
2. **What alternatives were considered?** At least two real options with
   their trade-offs (cost, complexity, lock-in, ops burden). If only one
   was on the table, that's a constraint, not a decision.
3. **What are the consequences - good AND bad?** What's better 6 months
   out, and what's now harder or closed off.

Pick the items missing from what the user has already said and ask them.
Iterate.

**Don't decide the decision for the user.** The skill helps capture and
sharpen the choice; it doesn't impose one. If the user asks "which is
better?", offer your read with the trade-offs explicit, then let them
choose.

## Phase 2 - Draft

Once you have enough material, draft the ADR. Keep it tight:

- One screen if at all possible. ADRs people don't read are ADRs people
  don't follow.
- Lead with the decision in the first paragraph. The "Context" section
  matters, but a reader skimming should see the decision in the first
  10 seconds.
- Quote actual constraints with numbers if you have them ("p99 latency
  must stay under 200ms" beats "must be fast").
- For each rejected alternative, one sentence on why it lost. Not
  bullet lists of pros and cons unless the user explicitly wants that.
- Avoid weasel words ("we should consider", "it might be good to") in
  the Decision section. ADRs are written *after* the decision; the
  decision is a fact.

Pick the right number:

```bash
# Find the highest existing ADR number, +1.
ls <adr-dir>/ | grep -E '^[0-9]+' | sort -n | tail -1
```

File name: match existing convention. If MADR-style:
`NNNN-short-kebab-case-title.md`.

## Phase 3 - Review with the user

Show the user the draft. Ask:

- "Does the Context section capture the *real* reason this is happening?"
- "Are the alternatives listed the ones you actually considered?"
- "Is the Consequences section honest about what's now harder?"

Iterate based on feedback. ADRs are usually 2-3 drafts before they
settle.

## Phase 4 - Write the file

When the user signs off, write the ADR:

```bash
# Make sure the directory exists.
mkdir -p <adr-dir>

# Write the file.
```

Use the `Write` tool. Don't bundle into a "lots of edits" commit; ADRs
deserve their own commit so the history shows when the decision was
recorded.

```bash
git add <adr-dir>/<file>
git commit -m "ADR-NNNN: <title>"
```

If the repo has a different commit convention (check `git log --oneline -20`),
match it.

## Phase 5 - Cross-link

If the ADR supersedes a previous one, **update the superseded ADR**:

- Change its `Status:` from `Accepted` to `Superseded by ADR-NNNN`.
- Add a link in the new ADR's frontmatter or body.

If the ADR is driven by a Linear/Jira ticket, ADR-N from before, an RFC,
or external doc, link to it in the Context section.

If the repo has an INDEX or README of ADRs (common in
`docs/adr/README.md`), update it with the new entry.

## Operating rules

- **Don't write an ADR without a forcing function.** If still exploring, an RFC or discussion fits better.
- **Don't pretend alternatives exist when they don't.** "We did X because we had to" beats padding with fake options.
- **Don't dress up tech debt as a decision.** Be honest if you're locking in X because migration is no longer feasible.
- **Don't make the consequences section all upside.** Every decision closes doors; name them.
- **Match the local style.** Read 2-3 existing ADRs before drafting; match length and tone.
- **Numbers matter.** Re-check the next available number right before writing.

## Composing with other skills

- **`/plan-feature`** - writes ADR + Gherkin spec together; use it for new features. Use `/write-adr` for pure architectural decisions (database, library, topology).
- **`/write-spec`** - Gherkin side, standalone.
- **`/review-spec`** - run after writing to check overlap with existing decisions.
