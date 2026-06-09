// Tier-2 — per-reviewer fixture evals.
//
// For every (fixture, reviewer) row in the LangWatch dataset, invoke
// `claude -p /<reviewer>` three times against the fixture's git state and
// score each run against the row's expected findings. Logs per-run + aggregate
// metrics to a LangWatch experiment so the dashboard can show pass-rate +
// mean ± stddev per fixture × reviewer cell.
//
// Usage:
//   node runners/run-pipeline.ts                          # all rows
//   node runners/run-pipeline.ts --fixture <name>         # filter by fixture
//   node runners/run-pipeline.ts --reviewer <name>        # filter by reviewer
//   node runners/run-pipeline.ts --dry-run                # skip claude calls
//   node runners/run-pipeline.ts --runs 1                 # override 3 runs
//   node runners/run-pipeline.ts --local                  # local fixtures only

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { LangWatch } from "langwatch";
import { setupObservability } from "langwatch/observability/node";

import { invokeClaude } from "../lib/claude-invoke.ts";
import { parseFindingBlock, splitTranscript } from "../lib/finding-parser.ts";
import { type ExpectedFindings, scoreFixture } from "../lib/scoring.ts";
import { type Finding, validateFinding } from "../lib/schema.ts";

const SERVICE_NAME = "skills-evals";
const EXPERIMENT_NAME = "skills-reviewer-eval";
const DATASET_SLUG = "skills-eval-fixtures";
const DEFAULT_RUNS_PER_CELL = 3;
const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;
// The repo root is the plugin under test — load it via --plugin-dir so the
// eval pins the *current* skill code rather than whatever stale snapshot is
// installed globally.
const PLUGIN_DIR = new URL("../../", import.meta.url).pathname;

type Args = {
  readonly fixtureFilter: string | null;
  readonly reviewerFilter: string | null;
  readonly dryRun: boolean;
  readonly local: boolean;
  readonly runs: number;
  /**
   * Optional path the runner writes a machine-readable summary to after
   * the run completes. The tier-2 workflow reads this to render the PR
   * comment preview.
   */
  readonly summaryPath: string | null;
};

type Row = {
  readonly fixture_name: string;
  readonly reviewer_skill: string;
  readonly expected_findings: string; // JSON-encoded ExpectedFindings
  readonly notes: string;
  readonly fixture_version: string;
};

const parseArgs = (argv: readonly string[]): Args => {
  const args = argv.slice(2);
  const flagValue = (name: string): string | null => {
    const idx = args.indexOf(name);
    return idx === -1 ? null : args[idx + 1] ?? null;
  };
  return {
    fixtureFilter: flagValue("--fixture"),
    reviewerFilter: flagValue("--reviewer"),
    dryRun: args.includes("--dry-run"),
    local: args.includes("--local"),
    runs: Number(flagValue("--runs") ?? DEFAULT_RUNS_PER_CELL),
    summaryPath: flagValue("--summary-path"),
  };
};

/**
 * The SDK's runUrl property is private; the only way to obtain the
 * dashboard URL today is to intercept the "Follow results at: <url>" line
 * the SDK prints during init. Wrap stdout for the duration of the call.
 */
const captureDashboardUrl = async <T,>(work: () => Promise<T>): Promise<{ value: T; url: string | null }> => {
  let captured: string | null = null;
  const origWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: unknown, ...rest: unknown[]) => {
    if (typeof chunk === "string") {
      const m = chunk.match(/Follow results at:\s+(https?:\/\/\S+)/);
      if (m?.[1]) captured = m[1];
    }
    return (origWrite as (c: unknown, ...r: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof process.stdout.write;
  try {
    const value = await work();
    return { value, url: captured };
  } finally {
    process.stdout.write = origWrite;
  }
};

const fetchDatasetRows = async (): Promise<readonly Row[]> => {
  const lw = new LangWatch();
  const dataset = await lw.datasets.get<Row>(DATASET_SLUG);
  return dataset.entries.map((e) => e.entry);
};

const loadLocalRows = async (): Promise<readonly Row[]> => {
  const { readdir } = await import("node:fs/promises");
  const names = (await readdir(FIXTURES_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const rows: Row[] = [];
  for (const name of names) {
    const dir = join(FIXTURES_DIR, name);
    const raw = await readFile(join(dir, "expected.findings.json"), "utf8");
    const notes = await readFile(join(dir, "notes.md"), "utf8").catch(() => "");
    const expected = JSON.parse(raw) as { by_reviewer: Record<string, unknown> };
    for (const [reviewer_skill, slice] of Object.entries(expected.by_reviewer)) {
      rows.push({
        fixture_name: name,
        reviewer_skill,
        expected_findings: JSON.stringify(slice),
        notes,
        fixture_version: "local",
      });
    }
  }
  return rows;
};

const setupRepo = async (
  fixtureName: string,
): Promise<AsyncDisposable & { readonly path: string }> => {
  const setupScript = join(FIXTURES_DIR, fixtureName, "setup.sh");
  const path = await mkdtemp(join(tmpdir(), `skills-eval-${fixtureName}-`));
  const setup = spawnSync("bash", [setupScript, path], { stdio: "inherit" });
  if (setup.status !== 0) {
    await rm(path, { recursive: true, force: true });
    throw new Error(`setup.sh exited ${setup.status}`);
  }
  return {
    path,
    async [Symbol.asyncDispose]() {
      await rm(path, { recursive: true, force: true });
    },
  };
};

const parseFindings = (
  response: string,
): { readonly findings: readonly Finding[]; readonly all_valid: boolean; readonly drifted: number } => {
  const blocks = splitTranscript(response);
  const findings: Finding[] = [];
  let drifted = 0;
  for (const block of blocks) {
    try {
      const parsed = parseFindingBlock(block);
      if (parsed === null) continue;
      if (validateFinding(parsed).length > 0) {
        drifted += 1;
        continue;
      }
      findings.push(parsed);
    } catch {
      drifted += 1;
    }
  }
  return { findings, all_valid: drifted === 0, drifted };
};

type RunOutcome = {
  readonly run_index: number;
  readonly invoked_ok: boolean;
  readonly findings_count: number;
  readonly drifted_count: number;
  readonly overall_pass: boolean;
  readonly expected_findings_matched: number;
  readonly extra_findings_count: number;
  readonly missing_specs_count: number;
  readonly cost_usd: number | null;
  readonly tokens: { readonly input: number; readonly output: number } | null;
};

const runSingle = (cwd: string, reviewer: string, runIndex: number, expected: ExpectedFindings): RunOutcome => {
  const invoke = invokeClaude({ cwd, prompt: `/${reviewer}`, pluginDir: PLUGIN_DIR });

  if (invoke.timedOut || invoke.exitCode !== 0 || !invoke.response) {
    return {
      run_index: runIndex,
      invoked_ok: false,
      findings_count: 0,
      drifted_count: 0,
      overall_pass: false,
      expected_findings_matched: 0,
      extra_findings_count: 0,
      missing_specs_count: expected.findings.length,
      cost_usd: invoke.costUsd,
      tokens: invoke.tokens,
    };
  }

  const { findings, all_valid, drifted } = parseFindings(invoke.response);
  const score = scoreFixture(findings, expected, { all_valid });

  return {
    run_index: runIndex,
    invoked_ok: true,
    findings_count: findings.length,
    drifted_count: drifted,
    overall_pass: score.overall_pass,
    expected_findings_matched: score.expected_findings_matched,
    extra_findings_count: score.extra_findings_count,
    missing_specs_count: score.missing_specs_count,
    cost_usd: invoke.costUsd,
    tokens: invoke.tokens,
  };
};

const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const stddev = (xs: readonly number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
};

type CellSummary = {
  readonly fixture_name: string;
  readonly reviewer_skill: string;
  readonly run_count: number;
  readonly pass_rate: number;
  readonly mean_findings_count: number;
  readonly stddev_findings_count: number;
  readonly mean_extra_findings: number;
  readonly mean_missing_specs: number;
  readonly mean_drifted: number;
  readonly mean_matched: number;
  readonly total_cost_usd: number;
  readonly invocation_failures: number;
};

const summarise = (
  row: Row,
  outcomes: readonly RunOutcome[],
): CellSummary => ({
  fixture_name: row.fixture_name,
  reviewer_skill: row.reviewer_skill,
  run_count: outcomes.length,
  pass_rate: outcomes.filter((o) => o.overall_pass).length / outcomes.length,
  mean_findings_count: mean(outcomes.map((o) => o.findings_count)),
  stddev_findings_count: stddev(outcomes.map((o) => o.findings_count)),
  mean_extra_findings: mean(outcomes.map((o) => o.extra_findings_count)),
  mean_missing_specs: mean(outcomes.map((o) => o.missing_specs_count)),
  mean_drifted: mean(outcomes.map((o) => o.drifted_count)),
  mean_matched: mean(outcomes.map((o) => o.expected_findings_matched)),
  total_cost_usd: outcomes.reduce((acc, o) => acc + (o.cost_usd ?? 0), 0),
  invocation_failures: outcomes.filter((o) => !o.invoked_ok).length,
});

const passRateLabel = (rate: number): string => {
  if (rate === 1) return "✓"; // 3/3 — green
  if (rate >= 2 / 3) return "~"; // 2/3 — flaky
  return "✗"; // <2/3 — broken
};

const runOneCell = async (
  row: Row,
  args: Args,
  emit: (key: string, body: { passed?: boolean; score?: number }) => void,
): Promise<CellSummary> => {
  console.log(`\n▶ ${row.fixture_name} × ${row.reviewer_skill}`);

  await using repo = await setupRepo(row.fixture_name);

  if (args.dryRun) {
    console.log("  ◦ --dry-run; skipping invocations");
    return summarise(row, [
      { run_index: 0, invoked_ok: true, findings_count: 0, drifted_count: 0, overall_pass: true,
        expected_findings_matched: 1, extra_findings_count: 0, missing_specs_count: 0,
        cost_usd: 0, tokens: null },
    ]);
  }

  const expected = JSON.parse(row.expected_findings) as ExpectedFindings;
  const outcomes: RunOutcome[] = [];

  for (let i = 0; i < args.runs; i++) {
    console.log(`  ◦ run ${i + 1}/${args.runs}`);
    const outcome = runSingle(repo.path, row.reviewer_skill, i, expected);
    outcomes.push(outcome);
    emit(`run_${i}_overall_pass`, { passed: outcome.overall_pass });
    emit(`run_${i}_findings_count`, { score: outcome.findings_count });
    emit(`run_${i}_drifted_count`, { score: outcome.drifted_count });
    if (outcome.cost_usd !== null) emit(`run_${i}_cost_usd`, { score: outcome.cost_usd });
  }

  const cell = summarise(row, outcomes);
  emit("pass_rate", { score: cell.pass_rate });
  emit("mean_findings_count", { score: cell.mean_findings_count });
  emit("stddev_findings_count", { score: cell.stddev_findings_count });
  emit("mean_extra_findings", { score: cell.mean_extra_findings });
  emit("mean_missing_specs", { score: cell.mean_missing_specs });
  emit("mean_drifted", { score: cell.mean_drifted });
  emit("mean_matched", { score: cell.mean_matched });
  emit("total_cost_usd", { score: cell.total_cost_usd });
  emit("invocation_failures", { score: cell.invocation_failures });

  console.log(`  ${passRateLabel(cell.pass_rate)} pass_rate=${cell.pass_rate.toFixed(2)} mean_findings=${cell.mean_findings_count.toFixed(1)} cost=$${cell.total_cost_usd.toFixed(4)}`);
  return cell;
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  if (!Number.isFinite(args.runs) || args.runs < 1) {
    throw new Error(`--runs must be a positive integer; got ${args.runs}`);
  }

  const rows: readonly Row[] = args.local ? await loadLocalRows() : await fetchDatasetRows();
  const filtered = rows.filter((r) =>
    (!args.fixtureFilter || r.fixture_name === args.fixtureFilter) &&
    (!args.reviewerFilter || r.reviewer_skill === args.reviewerFilter),
  );

  if (filtered.length === 0) {
    throw new Error(`no rows match filters: fixture=${args.fixtureFilter} reviewer=${args.reviewerFilter}`);
  }
  console.log(`◦ running ${filtered.length} cell(s) × ${args.runs} run(s) = ${filtered.length * args.runs} total invocation(s)`);

  const cells: CellSummary[] = [];

  // Dry-runs always skip the LangWatch experiment wrapper too — an empty
  // experiment record clutters the dashboard with rows that have no metrics.
  if (!process.env.LANGWATCH_API_KEY || args.dryRun) {
    if (args.dryRun && process.env.LANGWATCH_API_KEY) {
      console.log("◦ --dry-run set; skipping LangWatch experiment to avoid empty rows");
    } else {
      console.log("◦ LANGWATCH_API_KEY unset — running without experiment / telemetry");
    }
    for (const row of filtered) {
      cells.push(await runOneCell(row, args, () => {}));
    }
    await writeSummary(args, cells, { dashboardUrl: null, runId: null });
    return;
  }

  setupObservability({ serviceName: SERVICE_NAME });
  const lw = new LangWatch();
  const { value: experiment, url: dashboardUrl } = await captureDashboardUrl(() =>
    lw.experiments.init(EXPERIMENT_NAME),
  );

  await experiment.run([...filtered], async ({ item, index }) => {
    const cell = await runOneCell(item, args, (key, body) =>
      experiment.log(key, { index, ...body }),
    );
    cells.push(cell);
  });

  await writeSummary(args, cells, { dashboardUrl, runId: experiment.runId });
  console.log("\n✓ experiment run complete — see the LangWatch dashboard");
};

type SummaryMeta = {
  readonly dashboardUrl: string | null;
  readonly runId: string | null;
};

/**
 * Renders the per-PR tier-2 comment. The workflow pipes this straight to
 * `gh pr comment --body-file` (with a marker tag so re-runs edit the same
 * comment instead of stacking new ones). No JSON intermediate — the
 * runner has the data, the runner builds the markdown.
 */
const writeSummary = async (
  args: Args,
  cells: readonly CellSummary[],
  meta: SummaryMeta,
): Promise<void> => {
  if (!args.summaryPath) return;
  const totalCost = cells.reduce((acc, c) => acc + c.total_cost_usd, 0);
  const passing = cells.filter((c) => c.pass_rate === 1).length;
  const flaky = cells.filter((c) => c.pass_rate > 0 && c.pass_rate < 1).length;
  const broken = cells.filter((c) => c.pass_rate === 0).length;

  const rows = cells
    .map((c) => {
      const passes = Math.round(c.pass_rate * c.run_count);
      const passLabel = passRateLabel(c.pass_rate);
      return `| \`${c.fixture_name}\` | \`${c.reviewer_skill}\` | ${passes}/${c.run_count} ${passLabel} | ${c.mean_findings_count.toFixed(1)} | ${c.mean_extra_findings.toFixed(1)} | $${c.total_cost_usd.toFixed(4)} |`;
    })
    .join("\n");

  // Marker lets `gh pr comment --edit-last` (or the workflow's
  // find-comment step) target the same comment on re-runs.
  const lines = [
    "<!-- evals-tier2-result -->",
    "## Tier 2 eval results",
    "",
    meta.dashboardUrl
      ? `[Open experiment in LangWatch](${meta.dashboardUrl})`
      : "_LangWatch dashboard URL not captured for this run._",
    "",
    `**${passing} green · ${flaky} flaky · ${broken} broken** · ${cells.length} cells × ${args.runs} runs · total cost $${totalCost.toFixed(4)}${args.dryRun ? " · *dry-run*" : ""}`,
    "",
    "| fixture | reviewer | pass rate | mean findings | mean extras | cost |",
    "|---|---|:--:|--:|--:|--:|",
    rows,
    "",
    "_Legend: ✓ 3/3 · ~ 2/3 (flaky) · ✗ <2/3 (broken)._",
    "",
  ];

  await writeFile(args.summaryPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`◦ summary written to ${args.summaryPath}`);
};

await main().catch((err: unknown) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
