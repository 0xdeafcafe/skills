---
name: write-pr
description: Use when the user says "open a PR", "/write-pr", "draft a PR", "create the PR", "write a PR description", or wants Claude to compose a pull request from the current branch and open it on GitHub. Drafts the title and body from commits + diffstat + linked ADR/spec/ticket, runs the repo's pre-push checks (tests, lint, type-check, build), shows the user the proposed PR for confirmation, then pushes and creates via `gh pr create`. Bookend to /drive-pr — write-pr opens, drive-pr iterates.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(npm:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(npx:*), Bash(just:*), Bash(make:*), Bash(go:*), Bash(cargo:*), Bash(eslint:*), Bash(biome:*), Bash(prettier:*), Bash(ruff:*), Bash(black:*), Bash(rg:*), Read, Grep, Glob, Skill
---

# write-pr — compose, verify, and open a PR

write-pr is the moment between "I think this is done" and "the PR is
open". It does three things, in order:

1. **Compose** the PR — title, body, draft-or-ready, target branch —
   from the commits on the current branch, the diff against the base,
   any related ADR / spec / ticket, and the repo's PR template.
2. **Verify** the branch is in a state worth showing reviewers — tests
   pass, lint passes, types compile, build succeeds (where cheap),
   commit messages aren't gibberish.
3. **Open** the PR via `gh pr create`, but only after the user confirms
   what's about to happen. Pushing a branch and creating a PR is
   visible to other people — never run this step without explicit user
   approval (even in auto mode).

## Phase 0 — Sanity checks

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
  one, stop and tell the user — they probably want `/drive-pr` instead.
- **No uncommitted changes** (or, if any, ask whether to commit them
  first, stash, or proceed regardless).

If the branch is **behind base** (`git rev-list --count origin/<main> ^HEAD > 0`),
flag it: the PR will be evaluated against an older base. Offer to
rebase / merge in `main`, but don't do it without permission — that's
history-modifying.

## Phase 1 — Find context for the description

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
body — most PR templates have a "ticket" field.

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
Skipping a section that exists in the template ("Test plan", "Risk
assessment", etc.) gets flagged in review. Match the template structure
exactly.

### 1e. Reviewer signal (informational only)

CODEOWNERS tells you who *will* be auto-assigned, not who *should* be:

```bash
cat .github/CODEOWNERS 2>/dev/null || cat CODEOWNERS 2>/dev/null
```

Don't manually request reviewers unless the user asks — let CODEOWNERS
do its job. If the PR touches code with no CODEOWNERS rule, mention it
in the report; the user may want to tag someone.

## Phase 2 — Verify the branch is review-ready

Run the project's pre-push checks. If a `Justfile` / `Makefile` /
`package.json` script exists for "pre-push" or "check", use that — it's
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

# Build (if cheap — skip if it takes >2 minutes)
npm run build 2>/dev/null || true
```

Three outcomes:

- **All pass** → continue.
- **Lint / format / type failures** → stop. Suggest `/drive-code` to
  fix automatically before opening the PR. Don't paper over.
- **Test failures** → stop. Surface them. Either the change is broken
  or the tests are; both are worth knowing before reviewers see the
  PR.

The user can override with "open anyway, I know about that failure" —
which becomes a draft PR or one with a `Known issues:` section.

## Phase 3 — Draft the title and body

### Title

Conventions (in priority order — match the repo's style):

```bash
# Look at recent merged PR titles to extract convention
gh pr list --state merged --limit 20 --json title --jq '.[].title'
```

Common conventions:

| Style | Example |
| --- | --- |
| Conventional Commits | `feat(orders): allow cancellation within 24h` |
| Imperative summary | `Allow cancellation of recent orders` |
| Ticket-prefixed | `[LIN-1234] Order cancellation` |
| Plain title-case | `Order cancellation` |

Match what the repo uses. Don't introduce a new convention.

Keep titles **under 70 characters**. The full title is what GitHub
shows in the PR list. Long titles get truncated and skim badly.

### Body

If a template exists, fill every section. Standard structure when
there's no template:

```markdown
## Summary

<2-4 sentences explaining what changed and why. The "why" is more
important than the "what" — reviewers can see the what from the diff.>

## Changes

- <bullet per logical change>
- <bullet per logical change>

## Test plan

- [ ] <how a reviewer can verify, step by step>
- [ ] <unit / integration tests that cover this>
- [ ] <manual flow walked, with screenshots if UI>

## Linked

- ADR: docs/adr/0042-...
- Spec: specs/order-cancellation.feature
- Ticket: LIN-1234
```

Drafting rules:

- **Why before what.** "We need to let customers cancel recent orders
  to reduce support load on cancellation requests" → reviewer
  understands the motivation in 5 seconds. "This PR adds cancellation"
  → reviewer has to infer.
- **Don't recap the diff.** The diff is right there. Don't bullet every
  changed file unless the bullets *explain* something.
- **Use checkboxes in the test plan.** Reviewers tick them as they
  verify; the PR doubles as a checklist.
- **Be honest about scope.** If something is intentionally not
  included, say so — "this PR doesn't cover bulk cancellation; that's
  in LIN-1235."
- **Don't apologize / hedge / pad.** "This is a small change but..." —
  reviewers don't need apologies. Just describe what landed.
- **Don't sign.** The author is in the PR metadata. No "AFR / Claude"
  signatures in the body.

## Phase 4 — Draft or ready

Decide based on signals:

- Branch name contains `wip` / `draft` → open as draft.
- The branch is missing tests for new code and the user knows it →
  open as draft.
- Pre-push checks fail and the user wants to open anyway → draft.
- Otherwise → ready for review.

When in doubt, ask the user.

## Phase 5 — Confirm with the user

**Always confirm before pushing and opening.** Even in auto mode. PR
creation is visible to others; the user gets to approve the title,
body, draft state, and base branch before anything goes live.

Show:

```
Ready to open PR:

  Title:  <proposed title>
  Base:   <base branch>  (← <head branch>)
  State:  Ready for review | Draft
  
  Pre-push checks:
    ✅ types
    ✅ lint
    ✅ tests (142 passed)
    ⚠️ format — 3 files reformatted; included in this commit

Body:
  <full proposed body>

Proceed?  [y/N]
```

If the user says no, ask what to change. Iterate the draft. Don't push
until they're satisfied.

## Phase 6 — Push and open

When confirmed:

```bash
# Push the branch
git push -u origin <head-branch>

# Create the PR
gh pr create \
  --base <base-branch> \
  --head <head-branch> \
  --title "<title>" \
  --body "$(cat <<'EOF'
<body>
EOF
)" \
  $([ "$DRAFT" = "true" ] && echo "--draft")
```

After creation:

```bash
# Show the URL so the user can open it
gh pr view --json url --jq .url
```

If the push fails because the branch already exists with diverged
history, **stop**. Don't `--force` push. Tell the user the remote has
moved and they need to decide (rebase, force-push, or open a different
branch).

## Phase 7 — Final report

```
PR opened: <url>

  Title: <title>
  State: <ready | draft>
  Auto-requested reviewers (via CODEOWNERS): @user1, @team-platform
  
Next steps:
  - Wait for CI; if anything goes red, /drive-pr will iterate.
  - Once reviewers comment, /drive-pr to address feedback.
  - If touched UX surface, /drive-ux to walk through the change in a
    real browser and add screenshots to the PR.
```

## Operating rules

- **Never push or create the PR without user confirmation.** Even in
  auto mode. PR creation is shared-state — see the harness rule about
  "actions visible to others." This is the canonical example.
- **Never `git push --force`.** Even when the branch has diverged. The
  user resolves divergence; the skill doesn't.
- **Never `--no-verify` to skip pre-commit hooks.** If a hook fails,
  fix the underlying issue. If the user wants to override, they invoke
  the relevant flag themselves.
- **Never approve or merge the PR.** write-pr opens; drive-pr iterates;
  merging is a human decision.
- **Don't pad the description.** Length is not a quality signal. Three
  sentences and a test plan is fine for a small PR.
- **Don't auto-request reviewers.** CODEOWNERS does it. Manual requests
  are the user's call.
- **Match the repo's conventions.** Title style, commit style, body
  template — all from the existing repo, not from a generic template.
- **Don't post the PR body in chat as a wall of markdown** unless the
  user asks. Show the structure and key bullets; full markdown can be
  reviewed once the PR is open.

## Composing with other skills

- **`/drive-code`** — run before `/write-pr` if lint/format/structure
  is messy. write-pr should not be the place where lint failures get
  fixed; drive-code is.
- **`/drive-test`** — run before `/write-pr` if test coverage / quality
  is shaky. Don't open a PR knowing the tests are weak.
- **`/drive-feature`** — run before `/write-pr` for non-trivial
  features. Audits the implementation against the spec; gaps surfaced
  here belong in the PR description or as TODOs in the code, not as
  surprises in review.
- **`/drive-ux`** — run after `/write-pr` if the change is
  UI-visible. Generates screenshots that can be pasted into the PR.
- **`/drive-pr`** — the after-PR loop. Once write-pr opens it, drive-pr
  drives it to merge-ready.
