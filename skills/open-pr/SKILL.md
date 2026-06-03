---
name: open-pr
description: Use when the user says "open a PR", "/open-pr", "make the PR", "ship this", "draft a PR", "create the PR", or wants Claude to turn the current branch's work into an open pull request. Runs final sanity checks (lint, format, type-check, tslsp diagnostics if installed), drafts a title and body that actually describe what's in the diff and commits + any linked ADR / spec / ticket, confirms with the user, then pushes and opens via `gh pr create`. Closes by asking whether to drive the PR now (`/drive-pr`) or wait for review. Bookend to `/drive-pr` - open-pr opens, drive-pr iterates.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(npm:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(npx:*), Bash(just:*), Bash(make:*), Bash(go:*), Bash(cargo:*), Bash(eslint:*), Bash(biome:*), Bash(prettier:*), Bash(ruff:*), Bash(black:*), Bash(tslsp:*), Bash(rg:*), Read, Grep, Glob, Skill
---

# open-pr - compose, verify, and open a PR

## Phase 0 - Sanity checks

Before doing anything:

```bash
# Where are we, where's the base, what's the state?
git status --short
git rev-parse --abbrev-ref HEAD
git rev-list --count HEAD ^origin/<main>  # commits ahead of main
git rev-list --count origin/<main> ^HEAD  # commits behind main
gh pr view --json number,state 2>/dev/null  # does a PR already exist?
```

Hard gates:

- **Branch is not the main branch.** Refuse to open a PR from `main` /
  `master` / `trunk`. The user is in the wrong branch.
- **There are commits ahead of base.** A branch with no commits ahead
  has nothing to PR.
- **A PR doesn't already exist for this branch.** If `gh pr view` finds
  one, stop and tell the user - they probably want `/drive-pr` instead.
- **No uncommitted changes** (or, if any, ask whether to commit them
  first, stash, or proceed regardless).

If the branch is **behind base** (`git rev-list --count origin/<main> ^HEAD > 0`),
flag it: the PR will be evaluated against an older base. Offer to
rebase / merge in `main`, but don't do it without permission - that's
history-modifying.

## Phase 1 - Find context for the description

The PR description should explain **what** the PR does, **why**, and
**how to test it**. Pull that material from:

### 1a. Commit messages

```bash
git log origin/<main>..HEAD --pretty='%h %s' --reverse
git log origin/<main>..HEAD --pretty='%B' --reverse  # full messages
```

If commits are well-written, the body is half-drafted already. If
they're "wip", "fix", "more wip", you'll need to ask the user.

### 1b. Diffstat

```bash
git diff --stat origin/<main>...HEAD
```

The shape of the diff tells you the shape of the PR. 12 files
changed across 4 directories means a different summary style than
1 file with 800 lines changed.

### 1c. Linked artefacts

Look for references to documents the PR depends on or extends:

```bash
# ADRs touched
git diff --name-only origin/<main>...HEAD | grep -E 'docs/adr|docs/architecture'

# Specs touched
git diff --name-only origin/<main>...HEAD | grep -E '\.feature$|specs/'

# Tickets in commit messages or branch name
git log origin/<main>..HEAD --pretty='%B' | rg -o '\b(LIN-|PROJ-|#)\d+\b' | sort -u
git rev-parse --abbrev-ref HEAD | rg -o '\b(LIN-|PROJ-|#)\d+\b'
```

If a Linear/Jira ticket ID is in the branch name (common conventions:
`alice/LIN-1234-cancel-order`, `feat/PROJ-42-x`), pull it into the
body - most PR templates have a "ticket" field.

### 1d. PR template

```bash
# Look for the canonical template files.
for f in .github/pull_request_template.md .github/PULL_REQUEST_TEMPLATE.md \
         docs/pull_request_template.md pull_request_template.md; do
  [ -f "$f" ] && echo "$f"
done

# Multi-template directory (one of these can be selected via ?template=)
ls .github/PULL_REQUEST_TEMPLATE/ 2>/dev/null
```

If a template exists, the PR body MUST fill every section it defines.
Match the template structure exactly.

### 1e. Reviewer signal

Check CODEOWNERS to see who *will* be auto-assigned (`cat .github/CODEOWNERS 2>/dev/null`). Don't manually request reviewers. If touched code has no rule, mention it in the report.

## Phase 2 - Final sanity checks

Four checks, in order. The first three are unconditional; the fourth
runs only when tslsp is available.

```bash
# 1. Lint (the project's linter on touched files)
<linter> <touched paths>

# 2. Format (verify only - don't write)
<formatter> --check <touched paths>

# 3. Type check
npx tsc --noEmit                 # TS without tslsp
# or
go build ./...                   # Go
cargo check                      # Rust
pyright                          # Python

# 4. tslsp diagnostics - if and only if tslsp is on PATH
command -v tslsp >/dev/null 2>&1 && tslsp diagnostics --files <touched paths>
```

Use the project's `check` / `pre-push` script if one exists in
`Justfile` / `Makefile` / `package.json` - the project's own
definition of "ready" beats the generic toolchain detection.

Three outcomes:

- **All pass** -> continue.
- **Lint / format / type / tslsp failures** -> stop. Suggest
  `/drive-code` to fix lint and format automatically. Don't paper over.
- **Test failures from a `check` script** -> stop. Surface them.
  Either the change is broken or the tests are; both are worth knowing
  before reviewers see the PR.

The user can override with "open anyway, I know about that failure" -
the PR opens as draft or with a `Known issues:` section.

## Phase 3 - Draft the title and body

### Title

Match the repo's recent merged-PR title style (see `gh pr list --state merged --limit 20 --json title --jq '.[].title'`). Don't introduce a new convention. See `references/pr-templates.md` for common conventions and length rules.

### Body

If a template exists, fill every section. Otherwise use a Summary / Changes / Test plan / Linked structure - see `references/pr-templates.md` for the full body template.

Drafting rules:

- **Why before what.** Motivation first; reviewers see the "what" in the diff.
- **Don't recap the diff.** Bullets should *explain*, not enumerate changed files.
- **Use checkboxes in the test plan.** Reviewers tick them as they verify.
- **Be honest about scope.** Call out what's intentionally not included.
- **Don't apologise / hedge / pad.** No "this is a small change but...".
- **Don't sign.** Author is in PR metadata; no "AFR / Claude" signatures.

## Phase 4 - Draft or ready

Decide based on signals:

- Branch name contains `wip` / `draft` -> open as draft.
- The branch is missing tests for new code and the user knows it ->
  open as draft.
- Phase 2 checks failed and the user wants to open anyway -> draft.
- Otherwise -> ready for review.

When in doubt, ask the user.

## Phase 5 - Confirm with the user

**Always confirm before pushing and opening.** Even in auto mode. PR creation is visible to others; the user gets to approve title, body, draft state, and base branch before anything goes live.

Show: title, base, head, draft state, Phase 2 check results, full body. Ask y/N. If no, iterate the draft until they're satisfied.

## Phase 6 - Push and open

When confirmed, `git push -u origin <head-branch>` then `gh pr create --base <base> --head <head> --title "<title>" --body "$(cat <<'EOF' ... EOF)"` (add `--draft` if drafting). Show the URL afterwards via `gh pr view --json url --jq .url`.

If the push fails because the branch has diverged, **stop**. Don't `--force` push. Tell the user the remote has moved and they need to decide (rebase, force-push, or open a different branch).

## Phase 7 - Final report and handoff

Print a tight report, then explicitly ask the user what to do next:

```
PR opened: <url>
Title:    <title>
State:    <ready | draft>
Assigned: <CODEOWNERS list or "none - touched code has no rule">

Drive it now, or wait for review?

  - `/drive-pr` iterates on CI failures and AI-bot feedback as they
    land. Best when you want continuous attention until the PR is
    merge-ready.
  - Wait: leave it for human reviewers and circle back when feedback
    arrives. Best when humans are expected to weigh in before any
    iteration is useful (e.g. a contentious design choice, an early
    draft of a larger piece).
```

Then stop. The user picks.

## Operating rules

- **Never push or create the PR without user confirmation.** Even in auto mode.
- **Never `git push --force`.** The user resolves divergence; the skill doesn't.
- **Never `--no-verify`.** Fix the hook failure; don't skip it.
- **Never approve or merge the PR.** open-pr opens; drive-pr iterates; merging is human.
- **Don't auto-request reviewers.** CODEOWNERS does it. Match the repo's title / body conventions, not generic templates.

## Composing with other skills

- **Before:** `/drive-code` (lint/format), `/drive-test` (coverage), `/drive-feature` (spec audit).
- **After (Phase 7 handoff):** `/drive-pr` (CI + review feedback loop to merge-ready), `/drive-ux` (screenshots for UI changes).
