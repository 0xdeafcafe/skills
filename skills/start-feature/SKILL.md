---
name: start-feature
description: Use when the user says "/start-feature", "start a feature", "I want to add X", "I need to fix bug Y", "I'm going to refactor Z", "let's build something", or otherwise signals they have a known piece of code work to do (feature add, bug fix, refactor, UI tweak). Routes to the right next skill: new feature -> /plan-change; existing feature with ADR -> read it, then /plan-change in update mode; existing feature without ADR -> /backfill-feature, then /plan-change; trivial change -> skip scaffolding and go straight to implementation. Companion to /start-discussion for exploratory work where the intent isn't yet clear.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(rg:*), Bash(fd:*), Read, Grep, Glob, Skill
---

# start-feature - entry point for known code work

A piece of work walks in the door. You know what you want to do but
you might not know what scaffolding belongs around it. `/start-feature`
sorts that out and routes you into the right next skill.

It covers any **known** code work: features, bug fixes, refactors,
UI tweaks. For exploratory "I have a problem, let's chat" work where
the intent isn't clear yet, use `/start-discussion` instead.

## What this skill does

1. Asks at most two short questions to pin down the work.
2. Inspects the codebase for any existing ADR / spec for the area.
3. Decides which next skill should run: `/plan-change`,
   `/backfill-feature` + `/plan-change`, or "skip the scaffolding -
   too small."
4. Hands off via the Skill tool with the context already populated.

## Phase 0 - Pin the work

Ask the user:

1. **What's the work?** One sentence is fine. ("Add CSV export on the
   orders page", "fix the bug where invoices print the wrong total
   when discounts apply", "refactor the auth middleware to use the new
   session store".)

2. **Is this new code, or are you modifying something that already
   exists?**
   - New = no code today; this introduces a new feature area, new
     service boundary, new route, etc.
   - Existing = there's already code; you're changing its behaviour,
     fixing it, or restructuring it.

If the user opened with enough detail that you can answer both
yourself, summarise back in one sentence and ask "is that right?"
rather than asking from scratch.

## Phase 1 - Find the ADR landscape

Look for the repo's ADR and specs directories - same discovery as
`/plan-change` Phase 0:

```bash
for d in docs/adr docs/architecture/decisions docs/decisions adr decisions; do
  [ -d "$d" ] && echo "$d"
done

for d in specs features tests/features; do
  [ -d "$d" ] && echo "$d"
done
```

If the work touches existing code, try to spot whether the relevant
area is already covered:

```bash
rg -l '<feature-keywords>' docs/adr/ specs/ 2>/dev/null
```

Best-effort. The user will know better than the grep does.

**If grep returns nothing**, do *not* conclude "no existing area" - the
user's feature keywords may not appear in the existing code yet (e.g.
adding "cancellation" to a service that doesn't yet contain the word).
Instead ask: "Which directory or module is this work touching?"
Re-run the search against ADRs / specs that mention *that path* rather
than the feature noun.

Show what you found and ask "is one of these the ADR for what you're
touching, or is there nothing yet?"

## Phase 2 - Route

| Work is... | ADR exists? | Next skill |
| --- | --- | --- |
| New | n/a | `/plan-change` (writes ADR + spec) |
| Existing | Yes | Read the ADR, then `/plan-change` to layer the change on top |
| Existing | No | `/backfill-feature` to characterize current state, then `/plan-change` |
| Trivial (typo, one-line fix, copy change) | n/a | Skip scaffolding; implement directly |

"Trivial" is a judgement call. Five-word description with no design
choice = trivial. Two-sentence description with follow-up questions =
not.

State the route back before invoking:

```
Routing:
  Work:       <one-line summary>
  Track:      <new / existing-with-adr / existing-no-adr / trivial>
  Next skill: <name>   | "no skill - implement directly"

Calling <skill> now.
```

## Phase 3 - Hand off

Invoke the next skill via the Skill tool. Pre-populate it with what
you already know so the user doesn't repeat themselves.

If trivial: tell the user no scaffolding is needed and offer to start
implementation directly. Skip ADR / spec / characterization tests.

## Operating rules

- **Don't write any files.** This skill routes; it doesn't author.
  Downstream skills (`/plan-change`, `/backfill-feature`) do the
  writing.
- **Don't pad the routing.** If the user already said "this is a new
  feature, here's the design", route straight to `/plan-change` with
  the context. Don't re-ask.
- **Trust the user's "trivial" claim, but sanity-check it.** If they
  say "just a copy change" but the diff spans 12 files, ask once.
- **One question per turn where possible.** Don't dump a list.

## Composing with other skills

- **Routes into:** `/plan-change`, `/backfill-feature` (then
  `/plan-change`).
- **Companion entry:** `/start-discussion` for exploratory work.
- **After implementation:** `/drive-change` for the full audit pass.
