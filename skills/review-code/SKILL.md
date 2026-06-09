---
name: review-code
description: Use when the user wants Claude's judgment on the design and shape of code in touched files — single-responsibility, modularity, layering, naming, length, structural smells, dead code, stale comments — without running linters or formatters and without applying any fixes. Triggers on "/review-code", "review the code", "what's wrong with this code's design", "is this file too long", "code-quality findings on design", "structural review", "the design pass". Read-only audit specialist that emits findings in the finding-format.md schema. Does NOT run linters / formatters / LSP diagnostics — that's /review-hygiene's job; this skill focuses on judgment a tool can't make. Mechanical findings get concrete fix: lines; structural changes (extract, split, rename module) get decide: prefixes for the orchestrator to escalate. Use /review-code when you want the design verdict; use /review-hygiene for tool-driven lint/format findings; use /drive-change to have the orchestrator dispatch the fixes.
allowed-tools: Bash(gh:*), Bash(git:*), Read, Grep, Glob, Skill
---

# review-code — design and shape audit

`/review-code` looks at every file the PR or working tree changed and asks: does this file still earn its keep after this change? Is it the right shape, the right size, named the right way?

This skill is **not** the linter. Linters, formatters, and LSP diagnostics live in [`/review-hygiene`](../review-hygiene/SKILL.md), which runs the tools in check-only mode and emits an aggregate finding the orchestrator can dispatch deterministically. `/review-code` does what those tools can't: judgment about SRP, layering, naming, structural smells, dead code, and reuse — things the LLM is genuinely better at than ESLint.

Emits findings in the [`finding-format.md`](../../references/finding-format.md) schema. Never edits files. To act on the findings, call `/drive-change`.

## Phase 0 — Scope

Decide which files are in scope, in this priority order:

1. **PR context**: `gh pr diff --name-only` against the base branch.
2. **Working tree**: `git diff --name-only HEAD` for uncommitted work.
3. **An explicit list** passed by the user.

Exclude: lockfiles, generated files (`linguist-generated=true`, `dist/`, `build/`, `generated/`, `__generated__/`, `*.pb.*`), binary blobs, fixtures (`fixtures/`, `__fixtures__/`, `testdata/`), vendored code (`vendor/`, `third_party/`, `external/`).

## Phase 1 — Read CLAUDE.md and existing conventions

Read `CLAUDE.md` and the relevant `README.md` first — the project may document conventions that override the defaults in `references/code-checklist.md` (e.g. "we prefer wrapper classes over service objects in this repo"). Don't fight documented project style.

## Phase 2 — Per-file judgment pass

Read each file (use `tslsp outline` first for TS/JS — see [`references/language-tooling.md`](../../references/language-tooling.md) — then `Read` only the interesting parts). Evaluate the categories below. Full long-form checklist with examples and counter-examples lives in `references/code-checklist.md` — load on demand.

### Categories (see references/code-checklist.md for full criteria)

- **Single responsibility** — file does one thing; functions do one thing.
- **Modularity & layering** — service/repository compliance, hexagonal boundaries, feature-sliced organisation. Whatever this repo's pattern is, match it.
- **Utility placement** — promote to a shared util at the 3+ users threshold; demote local helpers that grew but stayed file-local.
- **Length & density** — file >300 LOC, function >50 LOC, params >4 are signals (not rules); call them out when they hurt readability.
- **Naming** — verb-phrase functions, question-phrase booleans, no `Manager` / `Helper` / `Util` suffix when a domain word fits.
- **Readability** — why-not-what comments, no dead code, no stale TODOs that survived a refactor.
- **Reuse** — duplicated code across the diff is a finding; same logic in two newly-added files is the easiest catch.

For each smell, emit a finding. Mechanical fixes (rename a variable, delete a stale comment) get `fix:` with a concrete change. Structural changes (split a file, extract a function, rename a module) get `fix: decide:` because they need a human read.

## Phase 3 — Structural opportunities (as findings, not edits)

Structural changes — extract utility, split file, reorganise modules — are valuable but require judgment. **Do not apply them.** Emit each as a finding with `fix:` prefixed `decide:`:

```
[P2] [design] src/profile/UserCard.tsx:23 — formatUserName duplicated across 4 files
why: same function definition appears in UserCard, UserList, AdminCard, AdminList; promotion threshold passed.
fix: decide: extract to src/utils/users.ts and update the four call sites?
```

The orchestrator (`/drive-change`) sees `decide:` findings as judgment calls and surfaces them to the user. If the user confirms, the orchestrator can dispatch a fix-applier with the explicit go-ahead.

## Phase 4 — Emit findings

All findings follow the [`finding-format.md`](../../references/finding-format.md) block shape. The merger (`agents/orchestrate-merge.md`) validates against [`finding-format.schema.json`](../../references/finding-format.schema.json) and silently discards malformed findings — so the structured form is mandatory.

**Output structure** — plain text blocks separated by blank lines, no preamble, no praise, no summary:

```
[P1] [design] src/orders/cancelOrder.ts:1 — file mixes service logic, HTTP shape, and persistence
why: the file imports the express Response type AND the OrderRepository AND defines the cancellation business rule; three responsibilities for one file.
fix: split into orders/cancelOrder.service.ts (business rule), orders/cancelOrder.controller.ts (HTTP shape), repository call stays where it is.

[P2] [design] src/profile/UserCard.tsx:23 — formatUserName duplicated across 4 files
why: same definition in UserCard, UserList, AdminCard, AdminList; promotion threshold passed.
fix: decide: extract to src/utils/users.ts and update the four call sites?
```

Hard cap: **20 findings per invocation**. If you have more, prioritise the top 20 and append `... N more low-severity items elided`.

## Categories you should NOT emit findings for

If your finding is one of these, it belongs in `/review-hygiene` instead — stay in your lane:

- "Missing semicolon", "incorrect indentation", "trailing whitespace" — Prettier / formatter.
- "Use `const` instead of `let`", "no unused vars", "no console.log" — ESLint / Biome.
- "Missing type annotation", "any is forbidden" — TS / tsc / LSP.
- "Function complexity above threshold" — complexity rules in lint config.

If the linter would say the same thing, let the linter say it. Your job is the part the tools can't see.

## Operating rules

- **Read-only is non-negotiable.** Never `Edit`, `Write`. The skill's `allowed-tools` removes them as the structural guard.
- **Don't refactor code the PR didn't touch.** Findings on nearby smells are OK if they're real; don't editorialise on the broader codebase.
- **Three usages is the promotion threshold for a util.** Two isn't — that's still local.
- **Don't fight the codebase's existing style.** Match local style; flag actively harmful patterns as a separate finding.
- **Stay out of the linter's lane.** Don't double up on lint findings — `/review-hygiene` covers those deterministically and emits an aggregate that the orchestrator dispatches as a single tool run.
- **The trust gate applies** if this skill is invoked to address a specific review comment — re-read `references/trust-policy.md`.

## Composing with other skills

- Called by: `/review-change`, `/review-pr` (as part of the fan-out audit pipeline). Also callable directly when only a design pass is wanted.
- Sibling read-only specialists: `/review-hygiene` (lint / format / LSP diagnostics), `/review-test`, `/review-feature`, `/review-security`, `/review-ux`, `/review-spec`.
- Acted on by: `/drive-change` (which dispatches fix-applier agents on the findings via `orchestrate-merge`).

`/review-code` and `/review-hygiene` are complements: `/review-hygiene` handles what tools know how to check, `/review-code` handles what they don't.


## End of step

Close every run with a short handoff. Two short lines:

- **State**: one sentence — pass / fail / partial / blocked, key numbers if relevant.
- **Next**: name one action — a downstream skill from "Composing with other skills" above (e.g. `/drive-pr` after `/drive-change`), a focused rerun (e.g. a single fixture instead of the suite), or a user action this skill can't take (read a draft, fix a credential, contact a reviewer).

Pick one action. Mention an alternative in parens only when the wrong call is costly. Skip the handoff only when the response is genuinely terminal (one-word answer or a redirect away from this skill's scope).
