// Uploads every fixture in evals/fixtures/ to a LangWatch dataset.
//
// Why this exists: the tier-2 runner needs to know which fixtures to
// iterate; the LangWatch dashboard wants the fixtures as rows so it can
// group experiment runs, drill into per-fixture pass/fail, and compare
// runs across commits. Keeping the dataset in sync with disk is a CLI
// wrapper away.
//
// Usage:
//   node runners/upload-dataset.ts             # upsert into the dataset
//   node runners/upload-dataset.ts --dry-run   # print JSON, no upload
//
// Requires `langwatch login --device` (or LANGWATCH_API_KEY in env).
// The CLI doesn't expose dataset CRUD via the TS SDK, so we shell out.

import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;
const DATASET_NAME = "skills-eval-fixtures";
const COLUMNS: readonly string[] = [
  "fixture_name:string",
  "diff_patch:string",
  "expected_findings:string",
  "expected_packets:string",
  "expected_budget:string",
  "planted_smells:string",
  "notes:string",
  "fixture_version:string",
];

type FixtureRecord = {
  readonly fixture_name: string;
  readonly diff_patch: string;
  readonly expected_findings: string;
  readonly expected_packets: string;
  readonly expected_budget: string;
  readonly planted_smells: string;
  readonly notes: string;
  readonly fixture_version: string;
};

const readMaybe = async (path: string): Promise<string> => {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
};

const lastCommitSha = (dir: string): string => {
  const r = spawnSync("git", ["log", "-1", "--format=%H", "--", dir], { encoding: "utf8" });
  return r.stdout.trim() || "uncommitted";
};

const inferPlantedSmells = (expectedFindings: string): readonly string[] => {
  if (!expectedFindings) return [];
  try {
    const parsed = JSON.parse(expectedFindings) as {
      readonly findings?: readonly { readonly category?: string }[];
    };
    const categories = (parsed.findings ?? [])
      .map((f) => f.category)
      .filter((c): c is string => Boolean(c));
    return Array.from(new Set(categories)).sort();
  } catch {
    return [];
  }
};

const buildRecord = async (name: string): Promise<FixtureRecord> => {
  const dir = join(FIXTURES_DIR, name);
  const expected_findings = await readMaybe(join(dir, "expected.findings.json"));

  return {
    fixture_name: name,
    diff_patch: await readMaybe(join(dir, "diff.patch")),
    expected_findings,
    expected_packets: await readMaybe(join(dir, "expected.packets.json")),
    expected_budget: await readMaybe(join(dir, "expected.budget.json")),
    planted_smells: JSON.stringify(inferPlantedSmells(expected_findings)),
    notes: await readMaybe(join(dir, "notes.md")),
    fixture_version: lastCommitSha(dir),
  };
};

type CliResult = { readonly ok: boolean; readonly stdout: string; readonly stderr: string };

const lw = (args: readonly string[]): CliResult => {
  const r = spawnSync("langwatch", [...args], { encoding: "utf8" });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
};

const datasetExists = (slug: string): boolean => {
  // `dataset get` returns 0 on success, non-zero on not-found / error.
  // We're not parsing the output — just using exit code as a probe.
  const r = lw(["dataset", "get", slug, "--format", "json"]);
  return r.ok;
};

const createDataset = (): void => {
  console.log(`◦ creating dataset "${DATASET_NAME}"`);
  const r = lw(["dataset", "create", DATASET_NAME, "--columns", COLUMNS.join(","), "--format", "json"]);
  if (!r.ok) throw new Error(`dataset create failed:\n${r.stderr || r.stdout}`);
};

const addRecords = (slug: string, records: readonly FixtureRecord[]): void => {
  console.log(`◦ adding ${records.length} records to ${slug}`);
  const r = lw(["dataset", "records", "add", slug, "--json", JSON.stringify(records)]);
  if (!r.ok) throw new Error(`records add failed:\n${r.stderr || r.stdout}`);
};

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes("--dry-run");

  const fixtures = (await readdir(FIXTURES_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  if (fixtures.length === 0) throw new Error(`no fixtures in ${FIXTURES_DIR}`);

  const records = await Promise.all(fixtures.map(buildRecord));

  console.log(`◦ built ${records.length} record(s): ${records.map((r) => r.fixture_name).join(", ")}`);

  if (dryRun) {
    console.log(JSON.stringify(records, null, 2));
    console.log(`✓ --dry-run: ${records.length} record(s) ready (not uploaded)`);
    return;
  }

  if (!process.env.LANGWATCH_API_KEY) {
    throw new Error("LANGWATCH_API_KEY unset — run `langwatch login --device` first");
  }

  if (!datasetExists(DATASET_NAME)) {
    createDataset();
  } else {
    console.log(
      `◦ dataset "${DATASET_NAME}" exists; records will be appended ` +
        `(run \`langwatch dataset delete ${DATASET_NAME}\` first to start fresh)`,
    );
  }

  addRecords(DATASET_NAME, records);
  console.log(`✓ uploaded ${records.length} record(s)`);
};

await main().catch((err: unknown) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
