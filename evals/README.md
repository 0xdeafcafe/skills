# Evaluating the skills and agents

The v2 draft needs behavioural evaluation: does an agent preserve intent,
prepare enough before building, maintain standards, continue without derailment,
and close the loop on observations? Passing a Markdown or JSON check cannot
establish these behaviours.

## Runnable v2 suite

The [v2 guide](v2/README.md) describes the live LangWatch Scenario suite using
its official Claude Code adapter, opt-in response capture, and offline replay
against genuine Opus, Sonnet and Haiku outputs.

```bash
cd evals
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:fixtures         # no model calls; real recorded responses
pnpm test:v2               # Git inspector regressions
pnpm scenarios:v2:list
pnpm scenarios:v2          # live Claude calls
pnpm fixtures:capture      # live calls; stage captures for review
```

Review captured response changes before accepting them. Successful runs,
incomplete work, denied actions and known harness mistakes are retained with
provenance; replay results do not substitute for new live behavioral evaluation.
See [the executed results](v2/integration-pass.md).

## Packaging checks

From the repository root:

```bash
claude plugin validate .claude-plugin/plugin.json
claude plugin validate .claude-plugin/marketplace.json
git diff --check
```

Also validate each skill's YAML frontmatter and local reference paths. The
skill-creator `quick_validate.py` checks a single skill when that authoring tool
is available. Check installed component discovery separately from syntax.

Use [the behavioural cases](v2/cases.md) for independent forward-testing. Give
the evaluator the request, role/skill, and raw fixture only. Keep the assessment
criteria out of its prompt. Use isolated temporary workspaces, no external
mutations, and record the model, effort, input revision, observed actions, and
limits. Evaluate resulting artifacts and decisions rather than exact wording.

The [first-pass results](v2/first-pass.md) describe what was actually exercised;
they are not a claim that every skill has been validated in every host.

## Operation regression checks

The bundled Git-state inspector has an offline suite using disposable real Git
repositories, including linked worktrees and resolved-but-unfinished merges:

```bash
cd evals
pnpm test:v2
```

The separate LangWatch checkout contains the executable regressions for its
commit guard and local merge checkpoint helper:

```bash
node --test dev/scripts/__tests__/commit-slice.integration.test.mjs dev/scripts/__tests__/snapshot-merge.integration.test.mjs
```

Run that command from the LangWatch repository. These deterministic tests check
Git effects; they do not establish that an agent selects the correct workflow.

## Legacy v1 harness

The existing `lib/`, `runners/`, `fixtures/`, and `scenarios/` evaluate the v1
pipeline. Its prompts and contracts are archived under `legacy/`. The default
unit tests still exercise those parsers and scoring helpers; they do not validate
v2 agent behaviour. Model routing by path, fixed finding syntax, forced planning
artifacts, and mandatory pipeline stages are no longer v2 requirements.

```bash
cd evals
pnpm install --frozen-lockfile
pnpm test                 # legacy helper regression tests, no live calls
pnpm typecheck
pnpm legacy:tier1          # historical contract fixture validation
```

`legacy:tier2`, `legacy:tier3`, and `legacy:scenarios` make live model calls and
retain v1 expectations. Use a v1 checkout to assess the old workflow. Running
them against v2 skills can fail because the intended behaviour changed; do not
adjust v2 to satisfy obsolete assertions or report those scores as v2 quality.
Uploads and trace publishing remain separate explicitly authorised actions.
