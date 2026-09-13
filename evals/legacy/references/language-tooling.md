# Language tooling

Cross-skill reference for how reviewers (and other agents that read code) should use LSP-backed symbol queries instead of raw file reads when an LSP is available.

## Why this exists

Reading a 600-line file to answer "is this function called anywhere else" costs ~600 tokens of input plus the model's attention budget on the rest of the file. `tslsp references` costs ~30 tokens of input and returns a precise answer. The tradeoff is overwhelmingly worth taking — but only if the LSP actually exists for the language in scope. When it doesn't, fall back to `Read` + `Grep` rather than pretend.

This doc names which tool answers which question, with fallbacks for each.

## LSP detection

At the start of any reviewer or symbol-query agent, probe for available LSPs:

| Language | Preferred MCP | Notes |
|---|---|---|
| TypeScript / JavaScript | `mcp__tslsp__*` | Confirmed available in environments that ship the [tslsp](https://github.com/0xdeafcafe/tslsp) skill |
| Go | `mcp__gopls__*` | When MCP is registered |
| Python | `mcp__pyright__*` | When MCP is registered |
| Rust | `mcp__rust_analyzer__*` | When MCP is registered |

Detection rule: per-file language hint matches an available LSP family → use it; otherwise fall back. Record `lsp_available_for: [typescript, ...]` in working state so downstream phases don't re-probe.

## Decision table

The load-bearing section. Each row names a question reviewers actually ask of the code, with the right tool for each language family.

| Question | TS/JS | Go | Python | Fallback |
|---|---|---|---|---|
| Is this function used elsewhere? | `tslsp references` | `gopls references` | `pyright references` | `grep -rn '<name>('` |
| What's the type of X? | `tslsp hover` → `type_definition` | `gopls hover` | `pyright hover` | `Read` of the declaration |
| What's in this file (no body needed)? | `tslsp outline` | `gopls document_symbol` | `pyright document_symbol` | `Read` |
| What does the LSP already complain about? | `tslsp diagnostics` | `gopls diagnostics` | `pyright diagnostics` | Run the project linter |
| What calls into / out of this code? | `tslsp call_hierarchy` | n/a | `pyright call_hierarchy` if supported | `grep -rn '<name>('` |
| Where is X defined? | `tslsp definition` | `gopls definition` | `pyright definition` | `grep -rn '\\b<name>\\b'` |
| Find symbol by name across the repo | `tslsp find_symbol` | `gopls workspace_symbol` | `pyright workspace_symbol` | `grep` |
| What changed about a symbol's signature? | `tslsp hover` on the old + new commit | `gopls hover` similarly | `pyright hover` | `git log -p -- <file>` then read |

## Diagnostics are free findings

Every reviewer should run `diagnostics` on each changed file at the start of its pass. The LSP has already flagged unused vars, unreachable code, type errors that the project's compile step would catch. Convert each diagnostic to a finding:

- Default `severity: P2`, `category: hygiene`.
- Elevate to `P1` if the diagnostic is on a *changed* line (not just somewhere in a file that contains the change).
- Elevate to `P0` if it's a real type error that breaks compilation.

These cost almost nothing to emit and they're high-signal — they catch issues no LLM-only review would.

## Per-reviewer guidance

How heavily each reviewer leans on LSP queries:

- **review-code** (hygiene) — heaviest user. `outline` every file, `diagnostics` every file, `references` to verify "is this dead code", `call_hierarchy` to test "does this still belong in this module".
- **review-test** — `references` on the symbol under test to find existing tests for it. `outline` of test files to see what's tested without reading bodies.
- **review-feature** — `call_hierarchy` to trace data flow against spec scenarios. Skip entirely if no LSP-supported languages in the diff.
- **review-security** — `references` on sinks ("where does this user input flow"). `call_hierarchy` for trust-boundary analysis (renderer → preload → main, etc.).
- **review-spec** — barely uses code LSP. Operates on `.feature` files and ADRs, which LSPs don't index meaningfully.
- **review-ux** — does not use code LSP at all. Browser-driven.

## Fallback behaviour

If the LSP is unavailable for the language in scope, the reviewer falls back to `Read` + `Grep`. It must not block on tooling. Coverage is slower and slightly noisier but real.

If an LSP query times out or errors mid-review:

1. Log the failure as a `[P3] [hygiene]` finding: `tooling unavailable for <file>: <error>`. The user has to know coverage degraded.
2. Continue with `Read` / `Grep` on that file.
3. Never silently skip the file.

## Cross-reference

- [`change-envelope.md`](./change-envelope.md) describes the `Pre-fetched outlines` field. The orchestrator may run `outline` once per file and broadcast results so reviewers don't re-run. If `Pre-fetched outlines` is present in the envelope, consume that — don't re-call `outline`.
- [`finding-format.md`](./finding-format.md) defines the structured shape every diagnostic-derived finding must conform to.
