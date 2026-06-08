// Tier-2 pipeline runner — invokes /drive-change against each fixture in the
// LangWatch dataset, scores the output against the fixture's expected
// findings, and logs per-metric pass/fail back to LangWatch as an experiment
// run. Routes through the AI gateway so per-call telemetry lands in the
// dashboard automatically.
//
// Usage:
//   node runners/run-pipeline.ts                    # all rows from the dataset
//   node runners/run-pipeline.ts <fixture-name>     # single row by fixture_name
//   node runners/run-pipeline.ts --dry-run          # no Claude call; harness shape only
//   node runners/run-pipeline.ts --local            # iterate local fixtures, skip dataset fetch

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { invokeClaude } from "../lib/claude-invoke.ts";
import { parseFindingBlock, splitTranscript } from "../lib/finding-parser.ts";
import { type ExpectedFindings, scoreFixture } from "../lib/scoring.ts";
import { type Finding, validateFinding } from "../lib/schema.ts";

const SERVICE_NAME = "skills-evals";
const EXPERIMENT_NAME = "skills-fixture-eval";
const DATASET_SLUG = "skills-eval-fixtures";
const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;

type Args = {
  readonly fixtureFilter: string | null;
  readonly dryRun: boolean;
  readonly local: boolean;
};

type FixtureRow = {
  readonly fixture_name: string;
  readonly diff_patch: string;
  readonly expected_findings: string;
  readonly notes: string;
  readonly fixture_version: string;
};

const parseArgs = (argv: readonly string[]): Args => {
  const args = argv.slice(2);
  return {
    fixtureFilter: args.find((a) => !a.startsWith("--")) ?? null,
    dryRun: args.includes("--dry-run"),
    local: args.includes("--local"),
  };
};

const fetchDataset = (): readonly FixtureRow[] => {
  const r = spawnSync("langwatch", ["dataset", "get", DATASET_SLUG, "--format", "json"], {
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(`langwatch dataset get failed: ${r.stderr || r.stdout}`);
  }
  const parsed = JSON.parse(r.stdout) as {
    readonly entries?: readonly { readonly entry: FixtureRow }[];
  };
  return (parsed.entries ?? []).map((e) => e.entry);
};

const loadLocalFixture = async (name: string): Promise<FixtureRow> => {
  const dir = join(FIXTURES_DIR, name);
  return {
    fixture_name: name,
    diff_patch: await readFile(join(dir, "diff.patch"), "utf8"),
    expected_findings: await readFile(join(dir, "expected.findings.json"), "utf8"),
    notes: await readFile(join(dir, "notes.md"), "utf8").catch(() => ""),
    fixture_version: "local",
  };
};

const discoverLocalFixtures = async (): Promise<readonly string[]> => {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(FIXTURES_DIR, { withFileTypes: true });
  return entries.filter((d) => d.isDirectory()).map((d) => d.name);
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

const parseFindingsFromOutput = (
  output: string,
): { readonly findings: readonly Finding[]; readonly all_valid: boolean; readonly drifted_count: number } => {
  const blocks = splitTranscript(output);
  const findings: Finding[] = [];
  let drifted = 0;

  for (const block of blocks) {
    try {
      const parsed = parseFindingBlock(block);
      if (parsed === null) continue; // not a finding (prose / preamble)
      const errors = validateFinding(parsed);
      if (errors.length > 0) {
        drifted += 1;
        continue;
      }
      findings.push(parsed);
    } catch {
      drifted += 1;
    }
  }

  return {
    findings,
    all_valid: drifted === 0,
    drifted_count: drifted,
  };
};

/**
 * Run one fixture. Returns the score so the caller can report aggregate
 * stats, but the canonical record is the LangWatch experiment run — the
 * function logs every metric there.
 *
 * `evalLog` writes to LangWatch when telemetry is enabled; it's the only
 * coupling to the SDK in this function.
 */
const runOne = async (
  row: FixtureRow,
  index: number,
  evalLog: (key: string, body: { index: number; passed?: boolean; score?: number; label?: string }) => void,
  opts: { readonly dryRun: boolean },
): Promise<{ readonly fixture_name: string; readonly overall_pass: boolean }> => {
  console.log(`\n▶ ${row.fixture_name}`);

  await using repo = await setupRepo(row.fixture_name);

  if (opts.dryRun) {
    console.log("  ◦ --dry-run; skipping invocation");
    return { fixture_name: row.fixture_name, overall_pass: true };
  }

  console.log("  ◦ invoking claude -p /drive-change");
  const invoke = invokeClaude({ cwd: repo.path, prompt: "/drive-change" });

  if (invoke.timedOut) {
    console.log("  ✗ timed out");
    evalLog("invocation_succeeded", { index, passed: false, label: "timeout" });
    return { fixture_name: row.fixture_name, overall_pass: false };
  }
  if (invoke.exitCode !== 0) {
    console.log(`  ✗ claude exited ${invoke.exitCode}: ${invoke.stderr.slice(0, 200)}`);
    evalLog("invocation_succeeded", { index, passed: false, label: `exit_${invoke.exitCode}` });
    return { fixture_name: row.fixture_name, overall_pass: false };
  }
  evalLog("invocation_succeeded", { index, passed: true });

  const { findings, all_valid, drifted_count } = parseFindingsFromOutput(invoke.stdout);
  console.log(`  ◦ parsed ${findings.length} finding(s) (${drifted_count} drifted)`);
  evalLog("drifted_findings_count", { index, score: drifted_count });

  const expected = JSON.parse(row.expected_findings) as ExpectedFindings;
  const score = scoreFixture(findings, expected, { all_valid });

  evalLog("count_in_range", { index, passed: score.count_in_range });
  evalLog("all_findings_schema_valid", { index, passed: score.all_findings_schema_valid });
  evalLog("expected_findings_matched", { index, score: score.expected_findings_matched });
  evalLog("extra_findings_count", { index, score: score.extra_findings_count });
  evalLog("missing_specs_count", { index, score: score.missing_specs_count });
  evalLog("overall_pass", { index, passed: score.overall_pass });

  for (const spec of score.per_spec) {
    evalLog(`spec_${spec.$match}_passed`, { index, passed: spec.all_passed });
  }

  console.log(`  ${score.overall_pass ? "✓" : "✗"} overall_pass=${score.overall_pass} matched=${score.expected_findings_matched}`);
  return { fixture_name: row.fixture_name, overall_pass: score.overall_pass };
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);

  // Resolve rows: dataset (default) or local on disk.
  const rows: readonly FixtureRow[] = args.local
    ? await Promise.all((await discoverLocalFixtures()).map(loadLocalFixture))
    : fetchDataset();

  const filtered = args.fixtureFilter
    ? rows.filter((r) => r.fixture_name === args.fixtureFilter)
    : rows;

  if (filtered.length === 0) {
    throw new Error(args.fixtureFilter
      ? `no fixture named "${args.fixtureFilter}" found in ${args.local ? "local fixtures/" : "the dataset"}`
      : "no fixtures to run");
  }
  console.log(`◦ running ${filtered.length} fixture(s)`);

  // Set up LangWatch experiment + telemetry. Skipped when API key is unset
  // — useful for harness-shape smoke tests without burning quota.
  if (!process.env.LANGWATCH_API_KEY) {
    console.log("◦ LANGWATCH_API_KEY unset — running without experiment / telemetry");
    for (let i = 0; i < filtered.length; i++) {
      const row = filtered[i];
      if (!row) continue;
      await runOne(row, i, () => {}, { dryRun: args.dryRun });
    }
    return;
  }

  const { setupObservability } = await import("langwatch/observability/node");
  const { LangWatch } = await import("langwatch");
  setupObservability({ serviceName: SERVICE_NAME });
  const lw = new LangWatch();
  const experiment = await lw.experiments.init(EXPERIMENT_NAME);

  await experiment.run([...filtered], async ({ item, index }) => {
    await runOne(item, index, (key, body) => experiment.log(key, body), {
      dryRun: args.dryRun,
    });
  });

  console.log("\n✓ experiment run complete — see the LangWatch dashboard");
};

await main().catch((err: unknown) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
