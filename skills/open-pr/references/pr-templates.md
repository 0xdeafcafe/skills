# PR templates and title conventions

## Title conventions

Match the repo's recent merged-PR title style. Common conventions:

| Style | Example |
| --- | --- |
| Conventional Commits | `feat(orders): allow cancellation within 24h` |
| Imperative summary | `Allow cancellation of recent orders` |
| Ticket-prefixed | `[LIN-1234] Order cancellation` |
| Plain title-case | `Order cancellation` |

Keep titles **under 70 characters**. The full title is what GitHub shows in the PR list. Long titles get truncated and skim badly.

## Standard PR body (no template)

If a template exists, fill every section. Otherwise:

```markdown
## Summary

<2-4 sentences explaining what changed and why. The "why" is more
important than the "what" - reviewers can see the what from the diff.>

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

## Confirmation mockup

```
Ready to open PR:

  Title:  <proposed title>
  Base:   <base branch>  (<- <head branch>)
  State:  Ready for review | Draft

  Pre-push checks:
    types: pass
    lint: pass
    tests: 142 passed
    format: 3 files reformatted; included in this commit

Body:
  <full proposed body>

Proceed?  [y/N]
```
