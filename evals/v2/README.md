# v2 behavioral evaluation

The live suite uses LangWatch Scenario and its official
[Claude Code adapter](https://langwatch.ai/scenario/agent-integration/claude-code/).
Scenario owns CLI execution, session continuation and transcript conversion. Our
adapter subclass records the returned evidence; it does not implement another
Claude runner. The local plugin starts as `skills:coordinator`.

There are eleven live cases: authorized ordinary integration; unresolved merge
collection; resolved-but-unfinished merge collection; incidental observations;
mandatory acceptance; shaping intent before building; deferred LangWatch setup;
two writing voices across five channels; delegated reading of twelve files;
and an imported source that contains unauthorized instructions.
A separate offline Scenario smoke test catches configuration and reporting
regressions. Assertions inspect repository state, index stages, runtime results,
artifacts and structured tool actions. No extra model judge is used.

## Run

From `evals/`, after `pnpm install --frozen-lockfile`:

```bash
pnpm typecheck
pnpm format:check
pnpm test:fixtures         # replay saved responses; no model calls
pnpm test:v2               # disposable Git inspector tests
pnpm scenarios:v2:list     # list cases without running Claude
pnpm scenarios:v2          # real Claude calls, existing CLI authentication
```

The live suite inherits the host's configured model. Use `SKILLS_EVAL_MODEL` to
request a model explicitly. The reading case enables native delegation and asks
for bounded Haiku or Sonnet workers; other cases use the coordinator directly.
The recorded model names are the CLI's resolved values, not assumed aliases.

Defaults are USD 1.50 per CLI invocation, 30 agent turns and a three-minute
adapter timeout. Overrides are `SKILLS_EVAL_MAX_BUDGET_USD`,
`SKILLS_EVAL_MAX_TURNS`, `SKILLS_EVAL_TURN_TIMEOUT_MS` and
`SKILLS_EVAL_TEST_TIMEOUT_MS` (four minutes by default). For the longer reading
case, the successful pass used:

```bash
SKILLS_EVAL_MAX_BUDGET_USD=3 SKILLS_EVAL_TURN_TIMEOUT_MS=300000 SKILLS_EVAL_TEST_TIMEOUT_MS=340000 pnpm scenarios:v2 reading.scenario.test.ts
```

Scenario receives an empty reporting key and a local endpoint, and the Claude
subprocess has inherited LangWatch variables removed. The offline smoke test
asserts that reporting makes no fetch calls. These commands do not install
LangWatch or enable trace capture. Live Claude inference still uses the CLI's
normal service connection and native local session storage.

## Save and replay real responses

```bash
pnpm fixtures:capture                              # live calls; save captures for review
SKILLS_EVAL_MODEL=sonnet pnpm fixtures:capture voice.scenario.test.ts
pnpm test:fixtures                                 # offline verification
```

Capture is opt-in through `SKILLS_EVAL_RECORD=1`. It atomically writes a fixture
under `evals/.captures/` for each case that reached an identified real model.
This ignored staging directory is separate from the reviewed corpus. Adapter
failure retains available messages and failure status; it cannot manufacture a
successful terminal event. Missing model identity is reported as a skipped
capture. Rerunning a case replaces only its staged capture.

Inspect the request, actual response, source revision, checks and any private
content before promoting a capture. For an existing case, compare the files:

```bash
git diff --no-index v2/fixtures/recorded/shape-first.fixture.json .captures/shape-first.fixture.json
# After review:
cp .captures/shape-first.fixture.json v2/fixtures/recorded/shape-first.fixture.json
pnpm test:fixtures
```

Preserve a useful alternative or failure under a distinct fixture ID with notes.
`outcome.expected` describes what the offline completion classifier should say
about that saved response. It is not a declaration that a failed live scenario
is acceptable. Live cases still require their requested outcomes to succeed.

Each fixture includes the request, official ModelMessage responses, structured
tool calls and results, terminal status, model/CLI/Scenario versions, prompt and
instruction digests, and observed checks. New recordings retain each turn's
CLI-reported USD value separately; those values are not summed under an assumed
resume-accounting rule or presented as an invoice. Instruction digests cover the copied
plugin used by that run. Historical recovered worker samples explicitly state
that only their assignment prompt was available for hashing. Worktree, plugin
and home paths are replaced by documented placeholders; thinking is excluded
and tool results retain the official adapter's 8,000-character cap. This is a
reviewable response corpus, not a lossless native session archive.

The bundled draft corpus contains actual Opus, Sonnet and Haiku responses,
including successful work, recoverable tool errors, permission denials,
incomplete parent work and bounded child output. Earlier harness mistakes are
retained with explanations. Some historical unintended home-read results were
redacted in full; attempted actions remain visible. These data come from
synthetic tasks, not the user's personal LangWatch traces.

`recorded-model`, `derived-mutation` and `synthetic` provenance are distinct.
Unit tests use real responses to check action extraction, quoted-versus-executed
commands, recovered errors, terminal completeness, observation dispositions,
model routing and voice checks. Deliberately altered responses are derived test
cases, never presented as new model outputs. The completion helper requires
successful terminal evidence and all required checks; a worker response does
not establish parent completion. The suite fails when no real corpus exists.

## Code structure

`run-scenario.ts` owns one execution and recording path for every live case.
Cases supply their setup, conversation and outcome checks. `fixture.ts` owns the
disposable project and test cleanup, `claude-settings.ts` owns CLI configuration,
and the coordinator adapter records official stream results. `record-response.ts`
builds and normalizes captures. Fixture types are inferred from the declarative
schema, which uses the AI SDK's own ModelMessage validator; `io.ts` handles
validation and atomic storage. `pnpm format` and `pnpm format:check` cover all
TypeScript in the evaluation tree, including the historical helpers.

## Isolation and limits

Each case creates a temporary Git project and a sibling copy of only the active
plugin files. Git fixture setup ignores user/system configuration, hooks and
signing. Model file edits are allowed only under the project. CLI hooks and MCP
connections are disabled. Claude's Bash sandbox denies home reads, home/plugin
writes and network access, and cannot fall back to unsandboxed commands.

This uses the CLI's permissions and OS sandbox, not a dedicated container.
Standard system reads and some temporary paths remain accessible. Use only the
supplied synthetic tasks; arbitrary hostile prompts require stronger isolation.
Earlier wrong-directory attempts exposed the need for the explicit project
boundary and copied plugin. The two newly created external draft files were
verified against captured writes and removed; denied attempts and redacted
responses remain as regression evidence.

Passing these cases does not establish every skill's quality, literary
similarity to Alex, measured usage savings, or behavior in other hosts. Voice
checks cover grounding, channel structure and known rejected patterns; review
actual prose as well. Reading checks cover source/owner coverage, model routing,
conflict disclosure and source preservation. They are not a general semantic
judge. See [the execution record](integration-pass.md) for results and limits.
