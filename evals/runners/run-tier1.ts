// Tier-1 contract checker — schema + sensitivity-gate validation against
// every fixture in evals/fixtures/. No LLM calls; runs in CI on every commit.
//
// Usage:
//   node runners/run-tier1.ts                 # all fixtures
//   node runners/run-tier1.ts <fixture-name>  # one

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { validateFinding, type FindingCategory } from "../lib/schema.ts";
import { gate } from "../lib/sensitivity-ref.ts";

const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;

type FindingSpec = {
  readonly $match?: string;
  readonly severity?: string;
  readonly severity_in?: readonly string[];
  readonly category?: FindingCategory;
  readonly file?: string;
  readonly line_min?: number;
  readonly fix_prefix?: string;
  readonly kind?: "individual" | "aggregate";
};

type ExpectedFindings = { readonly findings: readonly FindingSpec[] };
type ExpectedPackets = {
  readonly work_packets?: readonly {
    readonly $match?: string;
    readonly suggested_model?: "opus" | "sonnet";
  }[];
};

type Check = { readonly name: string; readonly ok: boolean; readonly detail: string };
type FixtureResult = { readonly fixture: string; readonly checks: readonly Check[] };

const readJson = async <T>(path: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
};

const checkSpec = (
  spec: FindingSpec,
  packets: ExpectedPackets | null,
): readonly Check[] => {
  const name = spec.$match ?? "(unnamed)";

  if (!spec.category) {
    return [{ name: `[${name}] has category`, ok: false, detail: "missing 'category'" }];
  }
  if (!spec.file) {
    return [{ name: `[${name}] has file`, ok: false, detail: "missing 'file'" }];
  }

  const synthesized = {
    severity: spec.severity ?? spec.severity_in?.[0] ?? "P2",
    category: spec.category,
    file: spec.file,
    line: spec.line_min ?? 1,
    summary: "synth-for-schema-check",
    why: "synth-for-schema-check",
    fix: `${spec.fix_prefix ?? ""}synth-for-schema-check`,
    ...(spec.kind ? { kind: spec.kind } : {}),
  };

  const errors = validateFinding(synthesized);
  const schemaCheck: Check = {
    name: `[${name}] schema-valid`,
    ok: errors.length === 0,
    detail:
      errors.length === 0
        ? "ok"
        : errors.map((e) => `${e.path}: ${e.message}`).join("; "),
  };

  const gateResult = gate({
    files: [spec.file],
    categories: [spec.category],
    isAggregate: spec.kind === "aggregate",
  });
  const expectedPacket = packets?.work_packets?.find((p) => p.$match === spec.$match);

  const gateCheck: Check = expectedPacket?.suggested_model
    ? {
        name: `[${name}] gate model`,
        ok: gateResult.suggested_model === expectedPacket.suggested_model,
        detail:
          gateResult.suggested_model === expectedPacket.suggested_model
            ? `${gateResult.suggested_model} (${gateResult.sensitivity_reason})`
            : `gate=${gateResult.suggested_model} vs fixture expects ${expectedPacket.suggested_model}`,
      }
    : {
        name: `[${name}] gate`,
        ok: true,
        detail: `${gateResult.suggested_model} (${gateResult.sensitivity_reason})`,
      };

  return [schemaCheck, gateCheck];
};

const runFixture = async (fixture: string): Promise<FixtureResult> => {
  const dir = join(FIXTURES_DIR, fixture);
  const expected = await readJson<ExpectedFindings>(join(dir, "expected.findings.json"));

  if (!expected) {
    return {
      fixture,
      checks: [{ name: "expected.findings.json present", ok: false, detail: "not found" }],
    };
  }

  const packets = await readJson<ExpectedPackets>(join(dir, "expected.packets.json"));

  return {
    fixture,
    checks: [
      { name: "expected.findings.json parses", ok: true, detail: `${expected.findings.length} specs` },
      ...expected.findings.flatMap((spec) => checkSpec(spec, packets)),
    ],
  };
};

const discoverFixtures = async (): Promise<readonly string[]> =>
  (await readdir(FIXTURES_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

const format = (r: FixtureResult): string => {
  const allOk = r.checks.every((c) => c.ok);
  return [
    `${allOk ? "✓" : "✗"} ${r.fixture}`,
    ...r.checks.map((c) => `  ${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`),
  ].join("\n");
};

const main = async (): Promise<void> => {
  const arg = process.argv[2];
  const fixtures = arg ? [arg] : await discoverFixtures();
  if (fixtures.length === 0) throw new Error(`no fixtures in ${FIXTURES_DIR}`);

  const results = await Promise.all(fixtures.map(runFixture));
  for (const r of results) console.log(`${format(r)}\n`);

  const failed = results.filter((r) => r.checks.some((c) => !c.ok));
  console.log(`Summary: ${results.length - failed.length}/${results.length} fixtures passed`);

  if (failed.length > 0) process.exit(1);
};

await main().catch((err: unknown) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
