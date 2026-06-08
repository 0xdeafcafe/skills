# Description optimization history

The skill-creator's `run_loop.py` ran a description optimizer across the six new skills. Findings summarized here so the runs aren't lost; the per-skill workspace directories (`skills/*-workspace/`) are gitignored because the eval-set JSON is regenerable and the run logs are large + transient.

## Per-skill results

| Skill | Original test score | Best variant test score | Action |
|---|---|---|---|
| `/drive-plan` | 4/8 | 4/8 | original kept |
| `/review-pr` | 4/8 | 5/8 | iteration-2 variant applied (commit `21c8e49`) |
| `/review-change` | 4/8 | 4/8 | original kept |
| `/implement-change` | 4/8 (iter 1 only — opt loop crashed on `claude -p` mid-run) | n/a | original kept |
| `/review-hygiene` | 4/8 | 4/8 | original kept |
| `/review-code` | 4/8 (iter 1 only — killed before convergence) | n/a | original kept |

## The 4/8 ceiling

Every skill hit the same 4/8 (50%) ceiling on held-out test queries. Two structural reasons:

1. **The optimizer hash-renames the skill during evaluation** (`review-hygiene-skill-474b1793`). Slash-command queries (`/review-hygiene run the linter`) literally cannot match the hash-renamed name — they're guaranteed-fail under the eval setup but work flawlessly in production. Roughly 4 of every 10 should-trigger queries are gated out by this constraint.

2. **Claude defaults to "I'll handle it inline" for substantive prose queries** even when the description perfectly describes the workflow. Anthropic's own skill-creator docs acknowledge this — Claude only consults skills for tasks it can't easily handle on its own. No description rewrite escapes the default; the gap between ~4/8 and a theoretical 7-8/8 is this floor.

## Implication

The optimizer measures the wrong thing. It produces a +1 query of 8 win at best (caught one real win on `/review-pr`), and that's worth keeping as a sanity check. But pushing past 50% would require eval-set redesign (drop the slash-command crutch, build prose-only queries that genuinely need the skill) — not prompt tweaking. The decision to skip description-opt on new skills going forward is captured in `evals/README.md`.

## Why we're not running the opt on new skills

See `evals/README.md` for the architectural shift to fixture-based behavioural evaluation. The short version: trigger accuracy is one of several signals, and not the most useful one — fixture-based pipeline evaluation (does `/drive-change` produce the expected findings on a known-smell PR?) tests what actually matters, and tier-1 contract tests catch reviewer prompt drift cheaply.
