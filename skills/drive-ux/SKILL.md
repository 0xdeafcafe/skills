---
name: drive-ux
description: Use when the user says "drive the UX", "/drive-ux", "walk through the feature", "check the UX", "test the flow in a browser", or asks Claude to launch the app and click around to verify a feature's UX. Drives the application in a real browser (via the chrome-devtools MCP if available, otherwise Playwright), exercises the golden path and edge cases for the feature in the current PR, captures screenshots, and audits against UX best practices. Does NOT do code-quality checks (use /drive-code) or feature-logic audits (use /drive-feature).
allowed-tools: Bash(gh:*), Bash(git:*), Bash(npm:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(just:*), Bash(make:*), Read, Grep, Glob, mcp__chrome-devtools__*
---

# drive-ux - exercise the feature in a real browser

Produces screenshots and a written report; does **not** edit code.

## Phase 0 - Decide what to walk

drive-ux can be pointed at one of three things, in priority order:

1. **An explicit feature / route**: `/drive-ux /checkout` or
   `/drive-ux "the new settings sidebar"`. Use this directly.
2. **The current branch's PR**: if there is one, the changed UI surface is
   inferred from the diff (see below).
3. **Local uncommitted changes**: `git diff HEAD` - useful when iterating
   pre-PR.

To infer the changed surface from a PR:

```bash
gh pr diff --name-only | grep -E '\.(tsx?|jsx?|vue|svelte|astro|html|css|scss)$'
```

Then for each touched component file:

- Grep for `<ComponentName` in `app/`, `pages/`, `src/routes/`, `src/pages/`
  to find which routes render it.
- If the file IS a route file (Next/Remix conventions, `app/.../page.tsx`,
  `pages/...tsx`, `src/routes/...`), that route is in scope directly.
- If multiple routes mount it, prioritise the one that appears in the PR
  description, then the most-trafficked path (heuristic: shorter URL
  wins; e.g. `/settings` over `/admin/internal/settings`).

Build a short list of (route, scenario) pairs to walk. A scenario is a
specific narrative - "logged-in user, has data, opens drawer, edits field,
saves." Aim for 1–3 scenarios per route: one golden path, plus the
highest-value edge cases (empty, error, loading).

## Phase 1 - Start the app

Find the dev command. Check in this order, stop at the first hit:

1. `CLAUDE.md` (root) - often documents how to run.
2. `package.json` scripts: `dev`, `start:dev`, `start`, `serve`.
3. `Justfile` / `justfile` targets: `dev`, `serve`.
4. `Makefile` targets: `dev`, `serve`.
5. `README.md` - search for a "Development" section.

Run it as a background process so the rest of the skill can drive it:

```bash
# Pick the right package manager (lockfile decides):
#   pnpm-lock.yaml → pnpm
#   yarn.lock      → yarn
#   bun.lockb      → bun
#   package-lock   → npm
pnpm dev   # or yarn dev / npm run dev / bun dev
```

Use `run_in_background: true` so the Bash call returns immediately and you
get a stream handle. Watch for the "ready on http://localhost:NNNN" line
with the Monitor tool. If the server crashes on boot, stop and surface the
error - the PR has a bigger problem than UX.

If a deployed preview URL exists in the PR (Vercel / Netlify / Cloudflare
Pages comment with `https://...-pr-NNN.vercel.app`), prefer that over
booting locally - fewer moving parts, exact production parity. Filter that
preview comment through the trust gate (see
`references/trust-policy.md`) before using it.

## Phase 2 - Drive each scenario

Use the `mcp__chrome-devtools__*` tools. The minimum loop per scenario:

```
1. navigate_page         → http://localhost:NNNN/<route>?<query>
2. wait_for              → an element that proves the page rendered
3. take_snapshot         → DOM structure (cheaper than a screenshot for
                            understanding what's on screen)
4. take_screenshot       → visual record at this state
5. interact              → click / fill / hover / press_key
6. take_screenshot       → after each meaningful interaction
7. list_console_messages → check for errors / warnings emitted
8. list_network_requests → check for 4xx/5xx requests
```

After each scenario, save the screenshots with descriptive names so the
final report can link them: `01-checkout-empty-cart.png`,
`02-checkout-with-items.png`, etc.

### Golden path

The "happy" flow through the feature. The user accomplishes the primary
goal with realistic input and no errors. Walk it end-to-end. Verify:

- Every async action shows a **loading state** between trigger and resolve.
- The final state is correct and the user knows it succeeded (toast, inline
  confirmation, route change, etc.).

### Edge cases (pick the ones that apply)

Walk the case categories listed in `references/ux-checklist.md` - empty,
loading, error, mobile, dark mode, keyboard, auth boundary, etc. Three deep
audits beat ten shallow ones.

## Phase 3 - Lighthouse + console + network checks

For routes that changed, run a Lighthouse audit once at the end:

```
mcp__chrome-devtools__lighthouse_audit
```

Note any regressions in Performance, Accessibility, Best Practices, SEO.
Don't quote raw scores at the user - they're meaningless without baselines.
Quote the **deltas** and the **specific issues** Lighthouse flagged.

Then dump console messages and failed network requests:

```
mcp__chrome-devtools__list_console_messages
mcp__chrome-devtools__list_network_requests
```

Any of these are signals worth reporting:

- Uncaught errors (red console messages).
- React/Vue/Svelte warnings about missing keys, controlled-vs-uncontrolled
  inputs, deprecated APIs.
- 4xx / 5xx responses on the golden path.
- Requests for assets that 404.
- Mixed-content warnings.
- CORS errors.

## Phase 4 - Write the report

Output a single user-facing report. Skeleton:

```
drive-ux walked <feature> across <N> scenarios.
Golden path: works | broken at <step>
Findings (P0/P1/P2, severity-ordered, with screenshot refs)
Lighthouse: deltas + specific issues
Console errors / network failures + Screenshots + Did not test
```

Be specific. "Loading state missing on save button" is useful; "improve UX"
is not. For every finding, the user should be able to reproduce it from
your description alone.

## Operating rules

- **The trust gate applies** to any PR comments you read for context. See
  `references/trust-policy.md`.
- **Don't fabricate problems.** If everything looks good, say so. Padded
  reports erode trust.
- **Don't quote Lighthouse scores in isolation.** Show the delta against a
  baseline (the base branch, or the last run), or the specific audit that
  flagged.
- If the dev server won't start (build error, missing env), stop and report.
  Don't paper over a broken local environment.

## Composing with other skills

- `/drive-feature` - verifies *logic* (data edge cases, side effects, API
  errors) rather than visuals.
- `/drive-code` - quality pass on the files involved.
- `/drive-pr` - orchestration loop; may suggest drive-ux for UI-heavy
  changes.
