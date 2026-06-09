// Uploads every (fixture × reviewer) pair in evals/fixtures/ as a separate
// row in a LangWatch dataset. Why per-pair, not per-fixture: tier-2 invokes
// each /review-* skill in isolation against a fixture, so the natural eval
// row is one combination — `experiment.run(rows, callback)` iterates them
// directly without us having to expand on the runner side.
//
// One fixture with N reviewer slices in expected.findings.json → N rows.
//
// Usage:
//   node runners/upload-dataset.ts             # upsert into the dataset
//   node runners/upload-dataset.ts --dry-run   # build records, print, don't upload
//
// Requires LANGWATCH_API_KEY in env (the .env loader handles it).

import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { LangWatch } from "langwatch";

const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;
const DATASET_NAME = "skills-eval-fixtures";

const COLUMN_TYPES: readonly { readonly name: string; readonly type: string }[] = [
  { name: "fixture_name", type: "string" },
  { name: "reviewer_skill", type: "string" },
  { name: "diff_patch", type: "string" },
  { name: "expected_findings", type: "string" },
  { name: "planted_smells", type: "string" },
  { name: "notes", type: "string" },
  { name: "fixture_version", type: "string" },
];

type FixtureRow = {
  readonly fixture_name: string;
  readonly reviewer_skill: string;
  readonly diff_patch: string;
  readonly expected_findings: string;
  readonly planted_smells: string;
  readonly notes: string;
  readonly fixture_version: string;
};

type ReviewerExpected = {
  readonly findings?: readonly { readonly category?: string }[];
  readonly count_min?: number;
  readonly count_max?: number;
};

type ExpectedByReviewer = {
  readonly by_reviewer: Readonly<Record<string, ReviewerExpected>>;
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

const categoriesFor = (slice: ReviewerExpected): readonly string[] => {
  const categories = (slice.findings ?? [])
    .map((f) => f.category)
    .filter((c): c is string => Boolean(c));
  return Array.from(new Set(categories)).sort();
};

const buildRowsForFixture = async (name: string): Promise<readonly FixtureRow[]> => {
  const dir = join(FIXTURES_DIR, name);
  const expectedRaw = await readMaybe(join(dir, "expected.findings.json"));
  if (!expectedRaw) throw new Error(`fixture ${name} is missing expected.findings.json`);

  const expected = JSON.parse(expectedRaw) as ExpectedByReviewer;
  if (!expected.by_reviewer || typeof expected.by_reviewer !== "object") {
    throw new Error(`fixture ${name}'s expected.findings.json lacks by_reviewer`);
  }

  const diff_patch = await readMaybe(join(dir, "diff.patch"));
  const notes = await readMaybe(join(dir, "notes.md"));
  const fixture_version = lastCommitSha(dir);

  return Object.entries(expected.by_reviewer).map(([reviewer_skill, slice]) => ({
    fixture_name: name,
    reviewer_skill,
    diff_patch,
    expected_findings: JSON.stringify(slice),
    planted_smells: JSON.stringify(categoriesFor(slice)),
    notes,
    fixture_version,
  }));
};

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes("--dry-run");

  const fixtures = (await readdir(FIXTURES_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  if (fixtures.length === 0) throw new Error(`no fixtures in ${FIXTURES_DIR}`);

  const rows = (await Promise.all(fixtures.map(buildRowsForFixture))).flat();
  for (const [fixture, count] of rows.reduce<Map<string, number>>(
    (acc, r) => acc.set(r.fixture_name, (acc.get(r.fixture_name) ?? 0) + 1),
    new Map(),
  )) {
    console.log(`◦ ${fixture}: ${count} reviewer row(s)`);
  }
  console.log(`◦ ${rows.length} total row(s)`);

  if (dryRun) {
    console.log(JSON.stringify(rows, null, 2));
    console.log(`✓ --dry-run: ${rows.length} row(s) ready (not uploaded)`);
    return;
  }

  if (!process.env.LANGWATCH_API_KEY) {
    throw new Error("LANGWATCH_API_KEY unset — load .env or export it");
  }

  const lw = new LangWatch();

  // datasets.get throws when the slug doesn't exist; treat that as "create".
  try {
    await lw.datasets.get(DATASET_NAME);
    console.log(
      `◦ dataset "${DATASET_NAME}" exists; records will be appended ` +
        `(delete it first via the dashboard to start fresh)`,
    );
  } catch {
    console.log(`◦ creating dataset "${DATASET_NAME}"`);
    await lw.datasets.create({ name: DATASET_NAME, columnTypes: [...COLUMN_TYPES] });
  }

  await lw.datasets.createRecords(DATASET_NAME, [...rows]);
  console.log(`✓ uploaded ${rows.length} row(s)`);
};

await main().catch((err: unknown) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
