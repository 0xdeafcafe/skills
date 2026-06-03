---
name: write-pr
description: Use when the user says "open a PR", "/write-pr", "draft a PR", "create the PR", "write a PR description", or wants Claude to compose a pull request from the current branch and open it on GitHub. Drafts the title and body from commits + diffstat + linked ADR/spec/ticket, runs the repo's pre-push checks (tests, lint, type-check, build), shows the user the proposed PR for confirmation, then pushes and creates via `gh pr create`. Bookend to /drive-pr - write-pr opens, drive-pr iterates.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(npm:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(npx:*), Bash(just:*), Bash(make:*), Bash(go:*), Bash(cargo:*), Bash(eslint:*), Bash(biome:*), Bash(prettier:*), Bash(ruff:*), Bash(black:*), Bash(rg:*), Read, Grep, Glob, Skill
---

# write-pr - compose, verify, and open a PR

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

### 1c. Linked artifacts

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

## Phase 2 - Verify the branch is review-ready

Run the project's pre-push checks. If a `Justfile` / `Makefile` /
`package.json` script exists for "pre-push" or "check", use that - it's
the project's own definition of "ready". Otherwise run the toolchain
directly:

```bash
# Type check (TS)
tslsp diagnostics --files <touched paths>   # or `npx tsc --noEmit`

# Lint
<linter> <touched paths>

# Format check (don't write, just verify)
<formatter> --check <touched paths>

# Tests for affected packages
<test-runner> <touched paths or affected packages>

# Build (if cheap - skip if it takes >2 minutes)
npm run build 2>/dev/null || true
```

Three outcomes:

- **All pass** -> continue.
- **Lint / format / type failures** -> stop. Suggest `/drive-code` to
  fix automatically before opening the PR. Don't paper over.
- **Test failures** -> stop. Surface them. Either the change is broken
  or the tests are; both are worth knowing before reviewers see the
  PR.

The user can override with "open anyway, I know about that failure" -
which becomes a draft PR or one with a `Known issues:` section.

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
- Pre-push checks fail and the user wants to open anyway -> draft.
- Otherwise -> ready for review.

When in doubt, ask the user.

## Phase 5 - Confirm with the user

**Always confirm before pushing and opening.** Even in auto mode. PR creation is visible to others; the user gets to approve title, body, draft state, and base branch before anything goes live.

Show: title, base, head, draft state, pre-push check results, full body. Ask y/N. If no, iterate the draft until they're satisfied.

## Phase 6 - Push and open

When confirmed, `git push -u origin <head-branch>` then `gh pr create --base <base> --head <head> --title "<title>" --body "$(cat <<'EOF' ... EOF)"` (add `--draft` if drafting). Show the URL afterwards via `gh pr view --json url --jq .url`.

If the push fails because the branch has diverged, **stop**. Don't `--force` push. Tell the user the remote has moved and they need to decide (rebase, force-push, or open a different branch).

## Phase 7 - Final report

```
PR opened: <url>
Title: <title> | State: <ready | draft>
Auto-assigned (CODEOWNERS): <list>
Next: /drive-pr for CI / review feedback. /drive-ux if UI-visible.
```

## Operating rules

- **Never push or create the PR without user confirmation.** Even in auto mode.
- **Never `git push --force`.** The user resolves divergence; the skill doesn't.
- **Never `--no-verify`.** Fix the hook failure; don't skip it.
- **Never approve or merge the PR.** write-pr opens; drive-pr iterates; merging is human.
- **Don't auto-request reviewers.** CODEOWNERS does it. Match the repo's title / body conventions, not generic templates.

## Composing with other skills

- **Before:** `/drive-code` (lint/format), `/drive-test` (coverage), `/drive-feature` (spec audit).
- **After:** `/drive-ux` (screenshots for UI changes), `/drive-pr` (CI + review feedback loop to merge-ready).
