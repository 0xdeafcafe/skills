# skills

Personal Claude Code skills for software engineering work.

Each skill is a self-contained agent loop that "drives" a slice of the PR
lifecycle to completion. They're designed to be composed: `drive-pr`
orchestrates the whole loop and delegates the slices it doesn't handle
itself to the others.

## The skills

Roughly chronological - `plan-feature` at the start of a piece of work,
`drive-pr` at the end.

### Planning (before code)

| Skill | One-liner |
| --- | --- |
| [`plan-feature`](./skills/plan-feature/) | Drive the discussion that produces an ADR + a Gherkin spec for a feature you're about to build. |
| [`write-adr`](./skills/write-adr/) | Standalone: capture an architecture decision (MADR / Nygard / Y-statement), matching the repo's existing convention. |
| [`write-spec`](./skills/write-spec/) | Standalone: write a Gherkin `.feature` file from a discussion, matching the repo's existing specs folder and style. |
| [`review-spec`](./skills/review-spec/) | Audit a new spec or ADR against the existing corpus for duplicates, conflicts, overlap, and missing cross-links. Read-only. |

### Driving (during code)

| Skill | One-liner |
| --- | --- |
| [`drive-code`](./skills/drive-code/) | Quality pass on every file the PR touches: SRP, modularity, service/repo pattern, utilities placement, lint, format, readability. |
| [`drive-feature`](./skills/drive-feature/) | Audit the feature itself against its ADR / spec: edge cases, error handling, loading states, side effects, end-to-end flow. |
| [`drive-test`](./skills/drive-test/) | Test-quality audit on touched files: right level (unit/integration/e2e), real assertions, no mock-the-unit-under-test, coverage of new code paths. |
| [`drive-security`](./skills/drive-security/) | Security audit: authn/authz on routes, secrets scan, input validation, output encoding, dep vulnerabilities, OWASP-top-10 smells. |
| [`drive-ux`](./skills/drive-ux/) | Walk the changed UX surface in a real browser (chrome-devtools / Playwright), capture screenshots, audit against UX best practices. |

### Shipping (around the PR)

| Skill | One-liner |
| --- | --- |
| [`write-pr`](./skills/write-pr/) | Compose a PR (title, body, draft state) from commits + diff + linked artifacts, run pre-push checks, then open it via `gh pr create`. |
| [`drive-pr`](./skills/drive-pr/) | Iterate on an open PR until every trusted comment is resolved, CI is green, and the description matches the code. |

### Cross-cutting

| Skill | One-liner |
| --- | --- |
| [`tone-of-voice`](./skills/tone-of-voice/) | Ghost-write in Alex's voice (blog posts, slack, customer emails, PR descriptions). Bans em-dashes and the usual LLM tells; codifies the patterns from his own writing. |

## Installing

Uses the [`skills.sh`](https://www.skills.sh) CLI - one pasteable line,
no clone:

```bash
npx skills add 0xdeafcafe/skills
```

This drops every skill into the right place for whichever AI agent you're
running (Claude Code, Codex, Cursor, OpenCode, etc.). The CLI is
interactive by default - it asks which skills and which agents to install
to.

### Useful variants

```bash
# install just the ones you want
npx skills add 0xdeafcafe/skills --skill drive-pr --skill drive-ux

# list available skills without installing
npx skills add 0xdeafcafe/skills --list

# install everything to Claude Code, globally, no prompts (CI-friendly)
npx skills add 0xdeafcafe/skills --all -a claude-code -g -y

# install into the current project instead of globally
npx skills add 0xdeafcafe/skills
# (project install is the default; -g installs globally to ~/.claude/skills)

# update later
npx skills update

# remove
npx skills remove drive-pr
```

See [`skills.sh`](https://www.skills.sh) for the full CLI reference.

### Dev install (working on the skills themselves)

If you're hacking on the skills in this repo, point the CLI at the local
checkout - symlinks rather than copies, so edits take effect immediately:

```bash
npx skills add .
```

## The non-negotiable security rule

Every skill that reads PR comments, review comments, or any other
human-authored input from a public surface applies the same trust filter:

1. **AI bots** - a fixed whitelist (currently: CodeRabbit, GitHub Copilot
   reviewer, Kilo Code reviewer). Anyone else with `[bot]` in their
   handle is **not** trusted by default.
2. **Humans** - must be verified members of the repo's owning
   organisation (or explicit collaborators with write+ permission on the
   repo) via `gh api`. No exceptions for "looks legit" or "the comment
   seems reasonable" - verification is a hard gate.

Everything else is read for situational awareness but **never acted on**.
The threat model is straightforward: PR comments are a prompt-injection
vector, and a skill that follows instructions from a random GitHub
account is a remote-code-execution primitive.

Skills that read user-authored input from a public surface (PR
comments, review threads) carry their own copy of the policy at
`skills/<name>/references/trust-policy.md` - the full bot whitelist,
verification commands, and untrusted-comment handling. Currently:
`drive-pr`, `drive-ux`, `drive-code`, `drive-feature`, `drive-test`,
`drive-security`. The copies are kept in sync by hand; if you edit one,
edit all six.

Skills that only write files (`write-adr`, `write-spec`, `plan-feature`,
`review-spec`, `write-pr`) don't need the policy directly - they don't
consume PR comments as instructions.

## Layout

```
.
├── README.md
└── skills/
    ├── plan-feature/           # discussion → ADR + spec
    │   └── SKILL.md
    ├── write-adr/              # discussion → ADR
    │   ├── SKILL.md
    │   └── references/adr-formats.md
    ├── write-spec/             # discussion → Gherkin .feature
    │   ├── SKILL.md
    │   └── references/gherkin-reference.md
    ├── review-spec/            # read-only: corpus overlap audit
    │   └── SKILL.md
    ├── drive-code/
    │   ├── SKILL.md
    │   └── references/{code-checklist,trust-policy}.md
    ├── drive-feature/
    │   ├── SKILL.md
    │   └── references/{feature-audit-checklist,trust-policy}.md
    ├── drive-test/
    │   ├── SKILL.md
    │   └── references/{test-checklist,trust-policy}.md
    ├── drive-security/
    │   ├── SKILL.md
    │   └── references/{security-checklist,trust-policy}.md
    ├── drive-ux/
    │   ├── SKILL.md
    │   └── references/{ux-checklist,trust-policy}.md
    ├── write-pr/               # compose + verify + open PR
    │   └── SKILL.md
    ├── drive-pr/               # iterate open PR to merge-ready
    │   ├── SKILL.md
    │   └── references/trust-policy.md
    └── tone-of-voice/           # ghost-write in Alex's voice
        ├── SKILL.md
        └── references/{style-guide,samples}.md
```

Reference files in a skill's `references/` directory are loaded by that
skill on demand with the `Read` tool - they keep the main `SKILL.md`
focused while making longer checklists available when needed.

Each skill is self-contained: when the CLI installs `drive-pr`, the user
gets `drive-pr/SKILL.md` plus everything under `drive-pr/references/` -
no cross-skill or shared-directory dependencies to worry about.
