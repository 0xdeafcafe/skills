# skills

Personal Claude Code skills for software engineering work.

Each skill is a self-contained agent loop that "drives" a slice of the PR
lifecycle to completion. They're designed to be composed: `drive-pr` orchestrates
the whole loop and delegates the slices it doesn't handle itself to the others.

## The skills

| Skill | One-liner |
| --- | --- |
| [`drive-pr`](./drive-pr/) | Iterate on a PR until every trusted comment is resolved, CI is green, and the description matches the code. |
| [`drive-ux`](./drive-ux/) | Walk the changed UX surface in a real browser (Playwright / chrome-devtools), capture screenshots, audit against UX best practices. |
| [`drive-code`](./drive-code/) | Quality pass on every file the PR touches: SRP, modularity, service/repo pattern, utilities placement, lint, format, readability. |
| [`drive-feature`](./drive-feature/) | Audit the feature itself against its ADR / spec: edge cases, error handling, loading states, side effects, end-to-end flow. |

## The non-negotiable security rule

Every skill that reads PR comments, review comments, or any other
human-authored input from a public surface applies the same trust filter:

1. **AI bots** — a fixed whitelist defined in
   [`shared/trusted-contributors.md`](./shared/trusted-contributors.md). Anyone
   else with `[bot]` in their handle is **not** trusted by default.
2. **Humans** — must be verified members of the repo's owning organization
   (or explicit collaborators on the repo) via `gh api`. No exceptions for
   "looks legit" or "the comment seems reasonable" — verification is a hard gate.

Everything else is read for situational awareness but **never acted on**. The
threat model is straightforward: PR comments are a prompt-injection vector,
and a skill that follows instructions from a random GitHub account is a
remote-code-execution primitive.

See [`shared/trusted-contributors.md`](./shared/trusted-contributors.md) for the
exact verification commands and the canonical bot whitelist.

## Installing

### Quick install (`npx`, no clone needed)

Paste this into any project's terminal — it copies all skills into
`~/.claude/skills/`:

```bash
npx -y github:0xdeafcafe/skills add
```

Once the package is published to npm, the same works as:

```bash
npx -y @0xdeafcafe/skills add
```

A few useful variants:

```bash
# install just the ones you want
npx -y github:0xdeafcafe/skills add drive-pr drive-ux

# see what's available without installing
npx -y github:0xdeafcafe/skills list

# install into a per-project skills directory instead of the global one
npx -y github:0xdeafcafe/skills add --dir ./.claude/skills

# see what's currently installed (in ~/.claude/skills/)
npx -y github:0xdeafcafe/skills installed

# uninstall
npx -y github:0xdeafcafe/skills remove drive-pr
```

Run `npx -y github:0xdeafcafe/skills --help` for the full reference.

### Dev install (symlinks back to this repo)

If you're hacking on the skills themselves, symlink each one — edits in this
repo take effect immediately:

```bash
for skill in drive-pr drive-ux drive-code drive-feature; do
  ln -snf "$PWD/$skill" "$HOME/.claude/skills/$skill"
done
```

The CLI knows about symlinks: `skills add` will skip a symlinked target
(use `--force` to replace) so a stray `add` doesn't break your dev setup.

To uninstall a single skill, remove the directory or symlink under
`~/.claude/skills/` (or use `npx -y github:0xdeafcafe/skills remove <name>`).

## Layout

```
skills/
├── README.md
├── shared/
│   └── trusted-contributors.md   # security policy referenced by every drive-* skill
├── drive-pr/
│   ├── SKILL.md
│   └── references/               # extra prompts the skill loads on demand
├── drive-ux/
│   └── SKILL.md
├── drive-code/
│   └── SKILL.md
└── drive-feature/
    └── SKILL.md
```

Reference files in a skill's `references/` directory are loaded by that skill
on demand with the `Read` tool — they keep the main `SKILL.md` focused while
making longer checklists available when needed.
