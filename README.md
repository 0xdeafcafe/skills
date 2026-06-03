# skills

Twelve Claude Code skills for the parts of shipping software I'd
rather not do myself. The ADR, the Gherkin spec, the review pass, the
PR description, the back-and-forth on the review comments. You get
the picture.

They compose. `plan-feature` writes the ADR and the spec before any
code gets touched. The `drive-*` family audits the work while it's
happening (code quality, the feature against its spec, tests,
security, the UX in a real browser). `write-pr` opens the PR.
`drive-pr` iterates until CI is green and the description matches
what actually shipped. `tone-of-voice` keeps anything I publish from
sounding like an LLM wrote it, which, to be clear, an LLM did.

## The skills

Roughly chronological. `plan-feature` at the start of a piece of
work, `drive-pr` at the end.

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
Interactive by default; it asks which skills and which agents you
want.

```bash
# a few, not all
npx skills add 0xdeafcafe/skills --skill drive-pr --skill drive-ux

# list without installing
npx skills add 0xdeafcafe/skills --list

# everything, globally, into Claude Code, no prompts
npx skills add 0xdeafcafe/skills --all -a claude-code -g -y

# later
npx skills update
npx skills remove drive-pr
```

Full reference at the [skills.sh docs](https://www.skills.sh/docs/cli).

### Dev install

If you're hacking on these locally, point the CLI at the checkout.
Symlinks rather than copies, so edits land instantly:

```bash
npx skills add .
```

## The trust gate

PR comments come from anyone with a GitHub account. If a skill
follows their instructions, anyone with a GitHub account has shell
on my laptop. Every skill that reads them runs the same filter:

1. **AI bots** - three trusted by name (CodeRabbit, GitHub Copilot
   reviewer, Kilo Code reviewer). Other `[bot]` handles are
   untrusted by default.
2. **Humans** - verified members of the repo's owning organisation,
   or collaborators with `write` or higher, checked live via
   `gh api`. "Looks legit" isn't a verification.

Untrusted comments get read for context. They never move code,
write a reply, or resolve a thread.

Six of the twelve skills carry the policy at
`skills/<name>/references/trust-policy.md` (the six `drive-*`). The
other five only write files, so there's nothing to filter. Edit one,
edit all six.

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
    │   ├── SKILL.md
    │   └── references/finding-examples.md
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
    │   ├── SKILL.md
    │   └── references/pr-templates.md
    ├── drive-pr/               # iterate open PR to merge-ready
    │   ├── SKILL.md
    │   └── references/{trust-policy,graphql-queries}.md
    └── tone-of-voice/          # ghost-write in my voice
        ├── SKILL.md
        └── references/{style-guide,samples}.md
```

Reference files in a skill's `references/` are loaded on demand,
which keeps the main `SKILL.md` lean. Long checklists exist without
bloating the context that gets pulled in every time a skill fires.

Each skill is self-contained. When the CLI installs `drive-pr`, you
get `drive-pr/SKILL.md` plus everything under `drive-pr/references/`.
No cross-skill paths to break on a standalone install.
