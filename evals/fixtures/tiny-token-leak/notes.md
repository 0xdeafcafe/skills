# tiny-token-leak

Smallest meaningful fixture — proves the pipeline shape end-to-end without burning credits.

## What's planted

One `.ts` file with two intentional smells:

1. **`P0` security**: hardcoded Stripe live-secret-key in a config file (`src/config/payment.ts:14`). A real `sk_live_...` shape, not in a test fixture. This should trigger `/review-security` with a `decide:` fix (secret leaks need rotation + history rewrite, not auto-fix).
2. **`P2` hygiene**: prettier-style formatting drift on the same file (mismatched indentation, missing trailing comma on the export). Should trigger `/review-hygiene` with an aggregate finding + `auto: prettier --write` fix.

## Why this scope

- Tiny (1 file, ~30 LOC changed) → `mode: tiny` in the orchestrator's triage.
- Both finding classes covered → tests aggregate vs individual partition.
- Security finding with `decide:` prefix → tests the escalation routing (never auto-applied).
- Single language (TS) → tests language-tooling detection works at minimum scope.

## Expected pipeline behavior

```
triage:           mode = tiny  (1 file ≤ 5, 30 LOC ≤ 200)
slicer:           skipped (tiny mode)
fan-out:          single Opus pass with reviewer prompts inlined
merger:           still runs (validates findings against schema)
verifier:         skipped (tiny mode)
fix-applier:      not invoked under /review-change (read-only)
                  would be invoked under /drive-change for the auto: hygiene fix
                  would NOT be invoked for the decide: security fix (escalated)
```

## What we assert (see `expected.findings.json`)

- exactly 2 findings emitted
- one matches `{severity: P0, category: security, file: src/config/payment.ts, line: 14, fix: ~/^decide:/}`
- one matches `{severity: P2, category: hygiene, file: src/config/payment.ts, line: 1, kind: aggregate, tool: prettier, fix: ~/^auto:/}`
- every finding validates against `references/finding-format.schema.json`

## How to extend

A medium fixture (15 files, single domain, real test-coverage gap) and a large fixture (50+ files, multi-domain, intentional cross-slice contract drift) will follow this pattern once the runner is solid. Both live under `evals/fixtures/` as siblings.
