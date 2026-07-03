---
name: pr-lgtm
description: Use when the user says "/pr-lgtm", "leave an lgtm", "drop an lgtm on this PR", "shipit comment", "approve-shaped comment (no actual approval)", or otherwise wants Claude to post a short, funny LGTM-style comment on an open pull request. Reads the diff for enough context to make the joke land, drafts a one or two line comment (dry, observational, no LLM tells), applies `/tone-of-voice` so it sounds like Alex, confirms with the user, then posts via `gh pr comment`. Never approves the PR, never leaves a review, never resolves threads — this is a top-level comment only. Operates on the current branch's PR or an explicitly passed PR number / URL. Not for reviewing; use `/review-pr` for that.
allowed-tools: Bash(gh:*), Bash(git:*), Read, Skill
---

# pr-lgtm - a funny LGTM, in Alex's voice

Posts a short, dry LGTM-style comment on a PR. Not an approval. Not a
review. Not a thread resolution. Just a top-level comment that lands.

The joke has to hook onto something specific in the diff, otherwise
it's a generic "nice work" and reads as noise. Read the diff first,
then draft, then apply `/tone-of-voice`, then confirm, then post.

## Phase 0 - Resolve the PR

Accept the PR from any of:

- explicit `#N`, `<url>`, or `<owner/repo>#N` argument
- current branch via `gh pr view --json number,url,headRefName,baseRefName,state,title,author`
- prompt the user if neither works

```bash
gh pr view <ref-or-nothing> --json number,url,headRefName,baseRefName,state,title,author,isDraft
```

Hard gates:

- `state` must be `OPEN`. If merged or closed, stop and tell the
  user - dropping an LGTM on a merged PR is at best confusing, at
  worst passive-aggressive.
- If `author.login` is the current user (`gh api user --jq .login`),
  stop and ask. Leaving an LGTM on your own PR is a self-own and
  usually a mistake.
- If `isDraft` is true, ask before proceeding. Some people want
  encouragement on drafts, others want to be left alone.

## Phase 1 - Pull enough context for the joke to land

The comment has to reference something concrete. Get the shape of the
diff:

```bash
gh pr view <ref> --json title,body --jq '{title, body}'
gh pr diff <ref> | head -400
git log --pretty='%h %s' origin/<base>..origin/<head> 2>/dev/null || \
  gh api repos/<owner>/<repo>/pulls/<pr>/commits --jq '.[] | "\(.sha[0:7]) \(.commit.message | split("\n")[0])"'
gh pr view <ref> --json files --jq '.files[] | "\(.additions)/\(.deletions) \(.path)"'
```

You are looking for one hookable detail. Any of:

- A file or subsystem the change touches ("the CSV export", "the
  cron runner", "the auth middleware").
- A commit message that's already funny or self-deprecating.
- A number worth quoting (12 files, +2000/-3, one line diff).
- A pattern in the diff (deleted more than added, all tests, a
  rename that took five commits).
- Something in the PR title or body worth ribbing lightly.

If the diff is genuinely opaque (huge, generated, minified),
acknowledge that in the comment instead of pretending to have read
it.

## Phase 2 - Draft the comment

Rules for the draft:

- **One or two lines.** LGTMs that run to a paragraph aren't LGTMs.
- **Hook onto the specific detail from Phase 1.** Generic praise
  reads as filler.
- **Dry and observational.** No "LOL", no forced enthusiasm, no
  emoji garnish. If an emoji fits as punctuation, one is fine.
- **The joke never announces itself.** If the draft nudges the
  reader saying "look how funny", cut it.
- **The word LGTM appears somewhere.** Or `ship it`, or `looks
  great`, or a variant. The comment is doing the LGTM job; make it
  identifiable at a glance.
- **Don't summarise the diff.** Reviewers can read the diff. The
  comment is signal, not recap.
- **Don't sign.** The comment is attributed by GitHub already.

Good shapes:

- Confident understatement + parenthetical aside.
- Concrete number + dry observation.
- Callout to one line or file, then LGTM.

## Phase 3 - Apply /tone-of-voice

Invoke `/tone-of-voice` via the `Skill` tool with the draft. This is
non-optional - the comment goes out under the user's name and needs
to sound like them, not like an LLM.

The high-signal bans apply hardest here because the comment is
short: any single LLM tell dominates. Watch for `delve`, `leverage`,
`unlock`, `seamless`, `robust`, `groundbreaking`, `superpower`, "it's
not just X, it's Y", and em-dashes above all.

British English if the surrounding repo uses it. Contractions fine.

## Phase 4 - Confirm with the user

**Always confirm before posting.** Even in auto mode. A PR comment is
visible to everyone with access to the PR; the user gets the last
look.

Show:

```
PR:      <url>
Title:   <pr title>
Author:  <pr author>

Comment:
  <the drafted comment, exactly as it will be posted>

Post? y/N
```

If the user says no or asks for a rewrite, iterate. Don't post
half-approved drafts.

## Phase 5 - Post the comment

Post as a top-level PR comment. Not a review. Not an inline comment.

```bash
gh pr comment <ref> --body "$(cat <<'EOF'
<the comment>
EOF
)"
```

Do NOT:

- Run `gh pr review --approve` or any review-state operation.
- Post the comment as an inline review comment anchored to a line.
- Resolve any review threads.
- Edit the PR title, body, or metadata.

Show the resulting comment URL after posting:

```bash
gh api repos/<owner>/<repo>/issues/<pr>/comments --jq '.[-1].html_url'
```

## Operating rules

- **Never approve the PR.** LGTM the sentiment, not the review state.
  Approval is a human's call and often has policy implications
  (CODEOWNERS, required-reviews). This skill leaves comments only.
- **Never post without confirmation.** Even in auto mode.
- **Never post on a merged or closed PR.** Wrong signal at the wrong
  time.
- **Never post on your own PR** without the user explicitly saying
  "yes, I'm shitposting on my own PR". It's usually a mistake.
- **One comment per invocation.** If the user wants a second take,
  they invoke the skill again.
- **The joke lands or gets cut.** A bad LGTM is worse than no LGTM.
  If nothing hookable emerges from Phase 1, tell the user - don't
  ship filler.

## Composing with other skills

- Calls: `/tone-of-voice` (Phase 3) - non-optional. If it isn't
  installed, apply the bans inline: no em-dashes, no banned
  vocabulary, no throat-clearing, British spelling if the repo uses
  it. But prefer the real skill.
- Not a substitute for: `/review-pr` (structured audit), `/drive-pr`
  (iterate to merge-ready). This skill posts one comment and
  stops.
