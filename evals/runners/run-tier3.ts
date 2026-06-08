// Tier-3 — end-to-end /drive-change orchestration smoke.
//
// Single fixture (defaults to tiny-token-leak), one run, invoked
// non-interactively. Parses the Phase 7 unified report, checks mode +
// expected specialists + per-finding (severity / reviewer / file / summary)
// against expected.drive_change.json. Logs to a separate LangWatch
// experiment so tier-2 noise doesn't contaminate tier-3 trends.
//
// Cost ceiling per invocation: ~$5 via --max-budget-usd. Run manually only.
//
// Usage:
//   node runners/run-tier3.ts                           # tiny-token-leak
//   node runners/run-tier3.ts --fixture <name>          # alt fixture
//   node runners/run-tier3.ts --dry-run                 # skip claude call
//   node runners/run-tier3.ts --max-budget-usd 8        # raise ceiling

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { invokeClaude } from "../lib/claude-invoke.ts";
import { parseDriveChangeReport } from "../lib/drive-change-parser.ts";
import {
  type ExpectedDriveChange,
  scoreDriveChange,
} from "../lib/drive-change-scoring.ts";

const SERVICE_NAME = "skills-evals";
const EXPERIMENT_NAME = "skills-drive-change-eval";
const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;
const PLUGIN_DIR = new URL("../../", import.meta.url).pathname;
const DEFAULT_FIXTURE = "tiny-token-leak";
const DEFAULT_BUDGET_USD = 5;

type Args = {
  readonly fixture: string;
  readonly dryRun: boolean;
  readonly maxBudgetUsd: number;
};

const parseArgs = (argv: readonly string[]): Args => {
  const args = argv.slice(2);
  const flagValue = (name: string): string | null => {
    const idx = args.indexOf(name);
    return idx === -1 ? null : args[idx + 1] ?? null;
  };
  return {
    fixture: flagValue("--fixture") ?? DEFAULT_FIXTURE,
    dryRun: args.includes("--dry-run"),
    maxBudgetUsd: Number(flagValue("--max-budget-usd") ?? DEFAULT_BUDGET_USD),
  };
};

const setupRepo = async (
  fixtureName: string,
): Promise<AsyncDisposable & { readonly path: string }> => {
  const setupScript = join(FIXTURES_DIR, fixtureName, "setup.sh");
  const path = await mkdtemp(join(tmpdir(), `skills-tier3-${fixtureName}-`));
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

const loadExpected = async (fixture: string): Promise<ExpectedDriveChange> => {
  const raw = await readFile(
    join(FIXTURES_DIR, fixture, "expected.drive_change.json"),
    "utf8",
  );
  return JSON.parse(raw) as ExpectedDriveChange;
};

type RunOutcome = {
  readonly invoked_ok: boolean;
  readonly mode_match: boolean;
  readonly specialists_match: boolean;
  readonly count_in_range: boolean;
  readonly findings_count: number;
  readonly expected_findings_matched: number;
  readonly extra_findings_count: number;
  readonly missing_specs_count: number;
  readonly unparsed_lines_count: number;
  readonly overall_pass: boolean;
  readonly cost_usd: number | null;
  readonly tokens: { readonly input: number; readonly output: number } | null;
};

const runDriveChange = (
  cwd: string,
  expected: ExpectedDriveChange,
  maxBudgetUsd: number,
): RunOutcome => {
  const invoke = invokeClaude({
    cwd,
    prompt: "/drive-change",
    maxBudgetUsd,
    pluginDir: PLUGIN_DIR,
  });

  if (invoke.timedOut || invoke.exitCode !== 0 || !invoke.response) {
    return {
      invoked_ok: false,
      mode_match: false,
      specialists_match: false,
      count_in_range: false,
      findings_count: 0,
      expected_findings_matched: 0,
      extra_findings_count: 0,
      missing_specs_count: expected.findings.length,
      unparsed_lines_count: 0,
      overall_pass: false,
      cost_usd: invoke.costUsd,
      tokens: invoke.tokens,
    };
  }

  const report = parseDriveChangeReport(invoke.response);
  const score = scoreDriveChange(report, expected);

  return {
    invoked_ok: true,
    mode_match: score.mode_match,
    specialists_match: score.specialists_match,
    count_in_range: score.count_in_range,
    findings_count: report.findings.length,
    expected_findings_matched: score.expected_findings_matched,
    extra_findings_count: score.extra_findings_count,
    missing_specs_count: score.missing_specs_count,
    unparsed_lines_count: score.unparsed_lines_count,
    overall_pass: score.overall_pass,
    cost_usd: invoke.costUsd,
    tokens: invoke.tokens,
  };
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  if (!Number.isFinite(args.maxBudgetUsd) || args.maxBudgetUsd <= 0) {
    throw new Error(`--max-budget-usd must be positive; got ${args.maxBudgetUsd}`);
  }

  console.log(`◦ tier-3 smoke: ${args.fixture} (budget ≤ $${args.maxBudgetUsd})`);

  const expected = await loadExpected(args.fixture);
  await using repo = await setupRepo(args.fixture);

  if (args.dryRun) {
    console.log("  ◦ --dry-run; skipping /drive-change invocation");
    console.log("✓ dry-run complete");
    return;
  }

  if (!process.env.LANGWATCH_API_KEY) {
    console.log("◦ LANGWATCH_API_KEY unset — running without experiment / telemetry");
    const outcome = runDriveChange(repo.path, expected, args.maxBudgetUsd);
    reportOutcome(outcome);
    process.exit(outcome.overall_pass ? 0 : 1);
  }

  const { setupObservability } = await import("langwatch/observability/node");
  const { LangWatch } = await import("langwatch");
  setupObservability({ serviceName: SERVICE_NAME });
  const lw = new LangWatch();
  const experiment = await lw.experiments.init(EXPERIMENT_NAME);

  let outcome: RunOutcome | null = null;
  await experiment.run([{ fixture: args.fixture }], async ({ index }) => {
    const result = runDriveChange(repo.path, expected, args.maxBudgetUsd);
    outcome = result;
    experiment.log("invoked_ok", { index, passed: result.invoked_ok });
    experiment.log("mode_match", { index, passed: result.mode_match });
    experiment.log("specialists_match", { index, passed: result.specialists_match });
    experiment.log("count_in_range", { index, passed: result.count_in_range });
    experiment.log("overall_pass", { index, passed: result.overall_pass });
    experiment.log("findings_count", { index, score: result.findings_count });
    experiment.log("expected_findings_matched", { index, score: result.expected_findings_matched });
    experiment.log("extra_findings_count", { index, score: result.extra_findings_count });
    experiment.log("missing_specs_count", { index, score: result.missing_specs_count });
    experiment.log("unparsed_lines_count", { index, score: result.unparsed_lines_count });
    if (result.cost_usd !== null) experiment.log("cost_usd", { index, score: result.cost_usd });
  });

  if (outcome === null) throw new Error("experiment.run did not invoke its callback");
  reportOutcome(outcome);
  console.log("\n✓ tier-3 run logged — see the LangWatch dashboard");
  process.exit((outcome as RunOutcome).overall_pass ? 0 : 1);
};

const reportOutcome = (o: RunOutcome): void => {
  const tick = (b: boolean) => (b ? "✓" : "✗");
  console.log("");
  console.log(`  ${tick(o.invoked_ok)} invoked_ok`);
  console.log(`  ${tick(o.mode_match)} mode_match`);
  console.log(`  ${tick(o.specialists_match)} specialists_match`);
  console.log(`  ${tick(o.count_in_range)} count_in_range  (findings=${o.findings_count})`);
  console.log(`  ${tick(o.expected_findings_matched === 1)} all expected findings matched (${(o.expected_findings_matched * 100).toFixed(0)}%)`);
  console.log(`  ◦ extra findings: ${o.extra_findings_count}`);
  console.log(`  ◦ missing specs:  ${o.missing_specs_count}`);
  console.log(`  ◦ unparsed lines: ${o.unparsed_lines_count}`);
  if (o.cost_usd !== null) console.log(`  ◦ cost:           $${o.cost_usd.toFixed(4)}`);
  console.log(`  ${tick(o.overall_pass)} overall_pass`);
};

await main().catch((err: unknown) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
