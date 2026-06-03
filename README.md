# skills

Twelve Claude Code skills for the parts of shipping software I'd rather
not do myself. Planning the change, writing the spec, addressing review
comments, keeping the PR description honest, you get the picture.

This isn't yet another "awesome-claude-skills" list. Each one does a
specific job, has specific operating rules, and is opinionated about
what "done" looks like. They compose: `plan-feature` writes the ADR and
spec before code starts; the `drive-*` family audits the work while
it's happening; `write-pr` opens the PR; `drive-pr` iterates on it
until everything's green; `tone-of-voice` keeps anything I publish from
sounding like an LLM wrote it (which, to be clear, an LLM did).

## The skills

Roughly chronological. `plan-feature` at the start of a piece of work,
`drive-pr` at the end.

### Planning (before code)

| Skill | One-liner |
| --- | --- |
| [`plan-feature`](./skills/plan-feature/) | Drives the discussion that produces an ADR and a Gherkin spec for whatever you're about to build. |
| [`write-adr`](./skills/write-adr/) | Standalone: capture an architecture decision. MADR / Nygard / Y-statement, matched to whatever the repo already does. |
| [`write-spec`](./skills/write-spec/) | Standalone: write a Gherkin `.feature` file. Matches the repo's existing specs folder and naming. |
| [`review-spec`](./skills/review-spec/) | Audits a new spec or ADR against the existing corpus for duplicates, conflicts, overlap, and missing cross-links. Read-only. |

### Driving (during code)

| Skill | One-liner |
| --- | --- |
| [`drive-code`](./skills/drive-code/) | Quality pass on every file the PR touched. SRP, modularity, service/repo pattern, utilities placement, lint, format, readability. |
| [`drive-feature`](./skills/drive-feature/) | Audits the feature itself against its ADR or spec. Edge cases, error handling, loading states, side effects, the bits that bite in production. |
| [`drive-test`](./skills/drive-test/) | Test quality on touched files. Right level (unit / integration / e2e), real assertions, no mocking the unit under test, coverage of new paths. |
| [`drive-security`](./skills/drive-security/) | Authz on touched routes, secrets scan, input validation, output encoding, dep vulnerabilities, the OWASP-top-10 smells. |
| [`drive-ux`](./skills/drive-ux/) | Walks the changed UX surface in a real browser via chrome-devtools or Playwright. Screenshots, a11y audit, the works. |

### Shipping (around the PR)

| Skill | One-liner |
| --- | --- |
| [`write-pr`](./skills/write-pr/) | Composes a PR (title, body, draft state) from commits, diff, and linked ADR / spec / ticket. Runs pre-push checks, then opens via `gh pr create`. |
| [`drive-pr`](./skills/drive-pr/) | Iterates on the open PR until every trusted comment is resolved, CI is green, and the description matches what actually shipped. |

### Cross-cutting

| Skill | One-liner |
| --- | --- |
| [`tone-of-voice`](./skills/tone-of-voice/) | Ghost-writes in my voice for anything that goes out under my name. Bans em-dashes and the usual LLM tells (yes, this README too). |

## Installing

```bash
npx skills add 0xdeafcafe/skills
```

That's it. Works with Claude Code, Cursor, Codex, OpenCode, and the
rest of the agent zoo via the [skills.sh](https://www.skills.sh) CLI.

The CLI is interactive by default. It asks which skills and which
agents to install to. If you want everything with no prompts, throw
`--all -y` at it and call it a Tuesday.

```bash
# install just the ones you want
npx skills add 0xdeafcafe/skills --skill drive-pr --skill drive-ux

# see what's available without installing
npx skills add 0xdeafcafe/skills --list

# everything, globally, into Claude Code, non-interactive
npx skills add 0xdeafcafe/skills --all -a claude-code -g -y

# install to a per-project skills directory instead of globally
# (project is the default; -g installs globally to ~/.claude/skills)
npx skills add 0xdeafcafe/skills

# later
npx skills update
npx skills remove drive-pr
```

Full reference: [skills.sh docs](https://www.skills.sh/docs/cli).

### Dev install

If you're hacking on these in this repo, point the CLI at the local
checkout. Symlinks rather than copies, so edits land instantly:

```bash
npx skills add .
```

## The non-negotiable security rule

PR comments are a prompt-injection vector with shell-level blast
radius, so every skill that reads them runs the same trust filter:

1. **AI bots** - a fixed whitelist (CodeRabbit, GitHub Copilot
   reviewer, Kilo Code reviewer). Anything else with `[bot]` in the
   handle is not trusted by default.
2. **Humans** - verified members of the repo's owning organisation,
   or explicit collaborators with write+ permission, checked live via
   `gh api`. No exceptions for "looks legit" or "the comment seems
   reasonable". Verification is a hard gate.

Everything else is read for situational awareness, never acted on. A
skill that follows instructions from a random GitHub account is a
remote-code-execution primitive; the trust gate is what stops that.

Skills that read public input carry their own copy of the policy at
`skills/<name>/references/trust-policy.md` - currently `drive-pr`,
`drive-ux`, `drive-code`, `drive-feature`, `drive-test`,
`drive-security`. Kept in sync by hand. If you edit one, edit all six.

The five skills that only write files (`write-adr`, `write-spec`,
`plan-feature`, `review-spec`, `write-pr`) don't carry the policy.
They don't consume PR comments as instructions.

## Layout

```
.
├── README.md
└── skills/
    ├── plan-feature/           # discussion -> ADR + spec
    │   └── SKILL.md
    ├── write-adr/              # discussion -> ADR
    │   ├── SKILL.md
    │   └── references/adr-formats.md
    ├── write-spec/             # discussion -> Gherkin .feature
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
    └── tone-of-voice/          # ghost-write in my voice
        ├── SKILL.md
        └── references/{style-guide,samples}.md
```

Reference files in a skill's `references/` are loaded by that skill on
demand, which keeps the main `SKILL.md` focused and stops the longer
checklists from bloating the initial context every time a skill
triggers.

Each skill is self-contained. When the CLI installs `drive-pr`, you
get `drive-pr/SKILL.md` plus everything under `drive-pr/references/`.
No cross-skill paths to break on a standalone install.
