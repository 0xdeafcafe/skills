# evals

This directory holds the eval harness for the plugin. It exists because the skill-creator's `run_loop.py` (description optimizer) measures the wrong thing — see [`description-opt-history.md`](./description-opt-history.md) for why — and the real questions are:

1. When `/drive-change` runs on a known-smell PR, does the agent pipeline produce the **expected findings** (right severities, right categories, right `auto:` / `decide:` prefixes)?
2. Do reviewers emit findings that **validate against the schema**? Does prompt drift get caught?
3. Does the merger **partition packets correctly** (aggregate vs individual, `runs_after` ordering, sensitivity gating)?
4. As we add new specialists, do average tokens-per-audit go **up or down**? Did `/review-hygiene`'s aggregate-findings claim actually pay off?
5. Without the hash-rename trick, what's the **honest triggering rate** on realistic prose?

## Architecture

Two tiers:

### Tier 1 — Contract tests (cheap, deterministic)

No real LLM calls. Pure unit-level checks on the data contracts the architecture depends on:

- **Schema validation**: feed a sample finding block to the validator, check it accepts the valid shape and rejects malformed ones.
- **Merger partition**: feed N synthetic finding lists to a merger reference implementation, check the packet partition matches expected (one packet per file for individual; one packet per tool for aggregate; correct `runs_after`).
- **Sensitivity gate**: feed (file path, category) pairs to the gate, check the right Opus-vs-Sonnet annotation.
- **Apply-validation**: feed a fix string + a fixture file, check the `git apply --check` heuristic accepts realistic edits and rejects vague ones.

These run in milliseconds. They catch reviewer prompt drift, schema regressions, merger logic changes — the boring high-volume bugs. CI runs them on every commit.

### Tier 2 — Integration / fixture tests (slow, expensive)

Real `claude -p` calls against canary fixtures. Each fixture is a git repo state with intentional smells; the eval runs `/drive-change` (or `/review-change`) and validates the resulting findings against an expected.json.

Fixtures live in [`fixtures/`](./fixtures/), each with:

- `setup.sh` — script that creates the fixture's git state in a temp directory (writes files, commits a baseline, applies a diff with intentional smells).
- `diff.patch` — the actual diff under review.
- `expected.findings.json` — array of expected finding objects. `summary` / `why` / `fix` are regex patterns (prose is fuzzy); enums (`severity`, `category`), file paths, and prefix shape (`auto:` / `decide:`) are exact-match.
- `expected.packets.json` — what the merger should partition. Aggregate vs individual, `runs_after` chains, `suggested_model` values.
- `expected.budget.json` — soft caps on tokens per agent (orchestrator / slicer / reviewer / merger / fix-applier). CI tracks regression but doesn't fail on overrun by default.
- `notes.md` — what smells were planted, why, and what the expected pipeline behavior is.

The runner in [`runners/run_pipeline.py`](./runners/run_pipeline.py) sets up a temp repo from the fixture, invokes the SDK headlessly, captures every agent's structured output, validates each finding against `references/finding-format.schema.json`, and diffs against `expected.findings.json` with tolerant matching.

## Tier 1 vs tier 2 cost

- Tier 1: tens of ms per test, runs on every commit, no LLM calls.
- Tier 2: tens of seconds to minutes per fixture, runs on demand and in nightly CI, costs real tokens.

The combination is intentional: tier 1 catches structural breakage cheaply (schema-validatable shapes drifting, merger logic regressions); tier 2 catches behavioral regressions (a reviewer's prompt change quietly making it miss a class of finding).

## Where langwatch fits

A research subagent looked at langwatch.ai's eval offering. **Verdict: useful at one layer, overkill everywhere else.** Specifically:

- Tier 1 contract tests: skip langwatch (deterministic unit tests, no point adding a network hop).
- Tier 2 pipeline fixtures: wire langwatch here. `@langwatch.trace()` around the SDK invocation captures token counts + latency per agent automatically; `langwatch.experiment.init("drive-change-canary")` gives a historical-regression view that's annoying to roll yourself. Use their dashboard for the pipeline-level telemetry, own the harness itself.
- Trigger logging: skip langwatch. Use a `PreToolUse` / `SubagentStart` hook in `.claude/settings.json` to append `{ts, skill, prompt_hash, was_slash}` to `evals/.trigger-log.jsonl`. That's the honest-triggering dataset, populated passively from real use.

**Important safety note**: `langwatch.ai/docs/*` was serving prompt-injection payloads (fake `system-reminder` blocks with hash-renamed `review-code-skill-*` clones) at the time of the audit. If we end up wiring their SDK in, do it via pinned-version package install, not by following docs from a fetched page. The Python/TS SDK shapes captured in our research are: `langwatch.experiment.init("name")`, `evaluation.loop(dataset.iterrows())`, `evaluation.log(metric, index=idx, score=...)`, `@langwatch.trace()`.

## Layout

```
evals/
├── README.md                          # this file
├── description-opt-history.md         # historical record of run_loop opts
├── package.json                       # pnpm workspace
├── tsconfig.json
├── lib/                               # shared eval helpers (TypeScript)
│   ├── schema.ts                      # ajv-backed finding-format validator
│   ├── finding-parser.ts              # parses reviewer transcripts into Finding objects
│   ├── merger-ref.ts                  # reference merger implementation for tier-1 tests
│   ├── sensitivity-ref.ts             # sensitivity-gating reference
│   └── __tests__/                     # vitest unit tests
├── fixtures/                          # canary git states
│   └── <fixture-name>/
│       ├── setup.sh
│       ├── diff.patch
│       ├── expected.findings.json
│       ├── expected.packets.json
│       ├── expected.budget.json
│       └── notes.md
├── runners/
│   ├── run-tier1.ts                   # tier-1 contract test runner
│   └── run-pipeline.ts                # tier-2 fixture runner (Agent SDK)
└── .trigger-log.jsonl                 # gitignored; populated by hook
```

## Running

```bash
cd evals
pnpm install
pnpm test              # vitest — tier-1 contract tests
pnpm typecheck         # tsc --noEmit
pnpm tier1             # programmatic tier-1 runner (CI-friendly output)
pnpm tier2             # tier-2 pipeline runner — needs API access
```

## Current state

- ✅ Directory bootstrapped.
- ✅ One canary fixture drafted: [`fixtures/tiny-token-leak/`](./fixtures/tiny-token-leak/) — minimal TS PR with a hardcoded API token leak.
- ✅ Schema validator helper.
- ⏳ Tier-1 runner skeleton.
- ⏳ Tier-2 runner — needs SDK integration; deferred until first fixture is solid.
- ⏳ Second + third fixtures (medium single-domain, large multi-domain with cross-slice drift) — once the harness shape is proven on `tiny-token-leak`.

## How to add a new fixture

1. `mkdir evals/fixtures/<descriptive-name>/`.
2. Write `setup.sh` that creates the pre-diff state and applies `diff.patch` to produce the under-review state. Should be idempotent — runs in a fresh temp dir each time.
3. Write `diff.patch` from a real `git diff` output. Smaller is better; keep intentional smells obvious.
4. Author `expected.findings.json` by hand. Use regex patterns for prose, exact strings for enums and file paths. Test it against the schema in `lib/schema.py`.
5. Document what's planted and why in `notes.md`. This is the most-read file when a regression trips and someone needs context.

## What we're NOT building

- A general-purpose LLM eval framework. langwatch already exists for that; we're consuming, not competing.
- A model-comparison harness. We don't care which model performs best — we care whether the pipeline produces the right shape at acceptable cost. Model selection is upstream.
- Per-skill description optimization. See `description-opt-history.md`; the structural ceiling makes it not worth the credit spend on new skills.
