# Finding format

Cross-skill contract for how reviewers emit findings.

## Why this exists

Multiple reviewers fan out in parallel under audit orchestrators (drive-change, review-pr, and any future siblings). The merger that runs after them has to dedup across reviewers, route findings for fix vs. comment, and partition work for parallel fix workers — without re-reading raw transcripts. Each finding therefore has to be self-describing, structured enough to dedup mechanically, and concrete enough that a fix worker can act on it without further context.

Reviewers that emit prose reviews break this. The merger has to summarize each one back into structure, costing tokens and introducing interpretation drift between reviewers.

## Shape

Each finding is one block. Reviewers emit a stream of these blocks, one per issue, separated by a blank line. No surrounding markdown headings, no introductory text.

```
[severity] [category] file:line — one-sentence summary
why: ...
fix: ...
```

### severity

One of `P0`, `P1`, `P2`, `P3`.

- **P0** — must fix; blocks merge. Security: exploitable vulnerability with a concrete attack vector. Logic: defined behaviour is wrong. Test: a defect that production behaviour would obviously break around.
- **P1** — should fix before merge. Likely-broken behaviour, missing coverage on new code paths, design choices that will hurt the next change in this area.
- **P2** — should fix soon; does not block this merge. Hygiene, dead code, naming, minor duplication.
- **P3** — nice to have. Stylistic preference, alternate approach, follow-up idea.

Default to P2 when uncertain. P0 needs a named consequence — "exploitable XSS via search input" beats "potential security issue". Inflating severity floods the merger and trains the orchestrator to ignore the level.

### category

One of: `security`, `design`, `hygiene`, `test`, `feature`, `ux`, `perf`, `a11y`.

Used by the sensitivity gate: `security` findings touching auth, crypto, IPC, credentials, or session paths route to Opus workers in fix mode regardless of their P-level. If your finding touches a sensitive path and you tag it `hygiene`, the gate will miss it — pick the category that reflects the actual risk surface.

### location

`file:line` — repo-relative path, single integer line number. If the issue spans a range, name the line where the problem is most acute (usually where you would put a cursor to start fixing). Multi-line ranges aren't supported here because the merger uses `file:line` as the dedup key — two reviewers flagging the same line are the same finding even if they describe it differently.

### summary

One sentence, declarative. Names the problem ("refresh token stored in localStorage"). Not a question, not hedged. No "I noticed that…", no "it appears…". The reader already knows it's a finding; they don't need the framing.

### why

One sentence on the root cause or the concrete consequence — what makes this a bug, not a style preference. Names the specific harm ("session tokens visible to any DOM-injecting script") rather than the abstract category ("security risk"). If you cannot name a concrete consequence in one sentence, the finding is probably below P2.

### fix

One sentence on what to change. Two forms:

- **Mechanical fix** — name the edit specifically enough that a fix worker can apply it without re-deriving intent: `replace \`localStorage.setItem('refreshToken', t)\` at line 147 with a call to the existing \`cookieStore.set\` helper at \`auth/cookies.ts:42\`.`
- **Judgment call** — prefix with `decide:` and frame as a question for a human: `decide: keep this token-rotation pattern or move to refresh tokens with a sliding window?`

The `decide:` prefix is load-bearing. The merger routes findings into two piles: fixable (dispatched to fix workers) and decidable (escalated to the user). Without the prefix, judgment calls get sent to fix workers that don't have the authority to make the call.

## Output rules

- **No preamble.** Don't write "let me review this…" or "I'll go through the diff…". Start with the first finding.
- **No praise.** "This is well-structured" and "nice use of X" cost tokens and bias the merger toward higher pass rates than warranted. The orchestrator gives credit elsewhere.
- **No diff echo.** Don't paste the code you're flagging. `file:line` is the index — the merger and fix workers can read the line themselves.
- **Skip empty sections.** If you have no security findings, don't write a "## Security" heading with "none found". Just don't emit anything for that category.
- **Hard cap: 20 findings per reviewer.** If you have more, prioritise the top 20 and end with `... N more low-severity items elided`. The merger trusts your prioritisation. A reviewer that emits 80 findings drowns the merger and trains the orchestrator to discard the tail anyway.

## Examples

Good:

```
[P0] [security] auth/session.ts:147 — refresh tokens stored in localStorage
why: XSS-readable; one successful DOM injection exfiltrates every active session.
fix: replace `localStorage.setItem('refreshToken', t)` at line 147 with a call to the httpOnly cookie helper at `auth/cookies.ts:42`, then update `getRefreshToken` to read from the cookie.

[P2] [hygiene] auth/session.ts:23 — `_unused` parameter still in signature
why: leftover from a rewrite three commits ago; no callers pass a value.
fix: remove the parameter and update the three call sites that pass `null` (see `tslsp references`).

[P1] [design] auth/session.ts:88 — token expiry compared with `<=` instead of `<`
why: at the exact expiry millisecond the token validates as expired AND as fresh, depending on which check runs first.
fix: decide: the safer behaviour is `<` (expire at boundary), but it shortens the window by 1ms — confirm before changing.
```

Bad (do not emit findings in this shape):

```
## Security review

I reviewed the authentication code and found some issues. Overall the structure
is good, but there are a few security concerns worth addressing.

### Issue 1: Token storage

In auth/session.ts around line 147, the refresh token is being stored in
localStorage which could be a security concern because of XSS attacks. You might
want to consider using a more secure storage mechanism such as httpOnly cookies.
```

What the bad version does wrong: prose preamble; praise; vague location ("around line 147"); hedged language ("could be", "might want to"); no severity; no category; no concrete fix. The merger cannot dedup this, the fix worker cannot act on it, and the user has to read three paragraphs to learn what the previous example said in three lines.

---

## Schema

This format has a machine-readable companion at [`finding-format.schema.json`](./finding-format.schema.json) (JSON Schema Draft 2020-12). The merger (`agents/orchestrate-merge.md`) validates every emitted finding against the schema; malformed findings are silently discarded and surfaced to the user as "reviewer X had N drifted findings."

**Reviewer guidance.** Before emitting each finding, mentally check: does the first line match `[P0-3] [<category>] <file>:<line> — <summary>` exactly? Do `why:` and `fix:` each have non-empty content on their own line? If you cannot render a finding in the structured form, **skip it** — never emit prose. The merger silently discards malformed findings; you will not get a chance to revise.
