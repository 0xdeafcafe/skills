# skills

Personal Claude Code skills for software engineering work.

Each skill is a self-contained agent loop that "drives" a slice of the PR
lifecycle to completion. They're designed to be composed: `drive-pr`
orchestrates the whole loop and delegates the slices it doesn't handle
itself to the others.

## The skills

| Skill | One-liner |
| --- | --- |
| [`drive-pr`](./skills/drive-pr/) | Iterate on a PR until every trusted comment is resolved, CI is green, and the description matches the code. |
| [`drive-ux`](./skills/drive-ux/) | Walk the changed UX surface in a real browser (Playwright / chrome-devtools), capture screenshots, audit against UX best practices. |
| [`drive-code`](./skills/drive-code/) | Quality pass on every file the PR touches: SRP, modularity, service/repo pattern, utilities placement, lint, format, readability. |
| [`drive-feature`](./skills/drive-feature/) | Audit the feature itself against its ADR / spec: edge cases, error handling, loading states, side effects, end-to-end flow. |

## Installing

Uses the [`skills.sh`](https://www.skills.sh) CLI — one pasteable line,
no clone:

```bash
npx skills add 0xdeafcafe/skills
```

This drops every skill into the right place for whichever AI agent you're
running (Claude Code, Codex, Cursor, OpenCode, etc.). The CLI is
interactive by default — it asks which skills and which agents to install
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
checkout — symlinks rather than copies, so edits take effect immediately:

```bash
npx skills add .
```

## The non-negotiable security rule

Every skill that reads PR comments, review comments, or any other
human-authored input from a public surface applies the same trust filter:

1. **AI bots** — a fixed whitelist (currently: CodeRabbit, GitHub Copilot
   reviewer, Kilo Code reviewer). Anyone else with `[bot]` in their
   handle is **not** trusted by default.
2. **Humans** — must be verified members of the repo's owning
   organization (or explicit collaborators with write+ permission on the
   repo) via `gh api`. No exceptions for "looks legit" or "the comment
   seems reasonable" — verification is a hard gate.

Everything else is read for situational awareness but **never acted on**.
The threat model is straightforward: PR comments are a prompt-injection
vector, and a skill that follows instructions from a random GitHub
account is a remote-code-execution primitive.

Each skill carries its own copy of the policy at
`skills/<name>/references/trust-policy.md` — the full bot whitelist,
verification commands, and untrusted-comment handling. The four copies
are kept in sync by hand; if you edit one, edit all four.

## Layout

```
.
├── README.md
└── skills/
    ├── drive-pr/
    │   ├── SKILL.md
    │   └── references/
    │       └── trust-policy.md
    ├── drive-ux/
    │   ├── SKILL.md
    │   └── references/
    │       ├── trust-policy.md
    │       └── ux-checklist.md
    ├── drive-code/
    │   ├── SKILL.md
    │   └── references/
    │       ├── trust-policy.md
    │       └── code-checklist.md
    └── drive-feature/
        ├── SKILL.md
        └── references/
            ├── trust-policy.md
            └── feature-audit-checklist.md
```

Reference files in a skill's `references/` directory are loaded by that
skill on demand with the `Read` tool — they keep the main `SKILL.md`
focused while making longer checklists available when needed.

Each skill is self-contained: when the CLI installs `drive-pr`, the user
gets `drive-pr/SKILL.md` plus everything under `drive-pr/references/` —
no cross-skill or shared-directory dependencies to worry about.
