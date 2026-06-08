// Tier-1 runner — programmatic contract checks against a fixture.
//
// What it does:
// 1. Loads expected.findings.json for the fixture.
// 2. Validates each $match block against finding-format.schema.json once
//    the fixture-specific fields are stripped (these are spec-format
//    entries, not raw findings).
// 3. Runs the sensitivity-gate reference against every finding to show
//    what model the merger would route to.
// 4. Cross-references with expected.packets.json — does the gate produce
//    the same `suggested_model` the fixture expects?
// 5. Prints a CI-friendly summary; exit code 0 if all assertions pass,
//    nonzero with details otherwise.
//
// Usage:
//   node runners/run-tier1.ts <fixture-name>
//   node runners/run-tier1.ts             # runs every fixture
//
// This runner does NOT invoke any LLM. It's pure schema + sensitivity
// logic, so it runs in well under a second and can sit in CI on every
// commit. The tier-2 runner (run-pipeline.ts) is where real claude -p
// calls happen.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateFinding, type FindingCategory } from "../lib/schema.ts";
import { gate } from "../lib/sensitivity-ref.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../fixtures");

interface ExpectedFindingSpec {
  $match?: string;
  severity?: string;
  severity_in?: string[];
  category?: FindingCategory;
  file?: string;
  line_min?: number;
  line_max?: number;
  summary_pattern?: string;
  why_pattern?: string;
  fix_prefix?: string;
  kind?: "individual" | "aggregate";
  tool_pattern?: string;
  files_affected_min?: number;
  [key: `$${string}`]: unknown;
}

interface ExpectedFindings {
  findings: ExpectedFindingSpec[];
  count_min?: number;
  count_max?: number;
  [key: `$${string}`]: unknown;
}

interface ExpectedPackets {
  work_packets?: Array<{
    $match?: string;
    packet_kind?: "individual" | "aggregate";
    files?: string[];
    suggested_model?: "opus" | "sonnet";
    sensitivity_reason_pattern?: string;
    [key: `$${string}`]: unknown;
  }>;
  judgment_findings_count?: number;
  individual_packets_count_max?: number;
  [key: `$${string}`]: unknown;
}

interface Result {
  fixture: string;
  passed: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
}

function runFixture(name: string): Result {
  const dir = join(FIXTURES_DIR, name);
  const findingsPath = join(dir, "expected.findings.json");
  const packetsPath = join(dir, "expected.packets.json");

  const checks: Result["checks"] = [];

  if (!existsSync(findingsPath)) {
    return {
      fixture: name,
      passed: false,
      checks: [{
        name: "expected.findings.json present",
        ok: false,
        detail: `not found at ${findingsPath}`,
      }],
    };
  }

  const findings: ExpectedFindings = JSON.parse(readFileSync(findingsPath, "utf8"));
  const packets: ExpectedPackets | null = existsSync(packetsPath)
    ? JSON.parse(readFileSync(packetsPath, "utf8"))
    : null;

  checks.push({
    name: "expected.findings.json parses",
    ok: true,
    detail: `${findings.findings.length} spec entries`,
  });

  // Each $match spec is a structured expectation, not a raw finding. We
  // synthesize the minimal Finding shape it implies (with placeholder
  // prose) and validate that against the schema — catches enum / file /
  // line constraint drift in the spec entries themselves.
  for (const spec of findings.findings) {
    const matchName = spec.$match ?? "(unnamed)";
    if (!spec.category) {
      checks.push({
        name: `[${matchName}] has category`,
        ok: false,
        detail: "expected.findings.json spec missing required field 'category'",
      });
      continue;
    }
    if (!spec.file) {
      checks.push({
        name: `[${matchName}] has file`,
        ok: false,
        detail: "expected.findings.json spec missing required field 'file'",
      });
      continue;
    }

    const synthesized = {
      severity: spec.severity ?? spec.severity_in?.[0] ?? "P2",
      category: spec.category,
      file: spec.file,
      line: spec.line_min ?? 1,
      summary: "synthesized-for-schema-check",
      why: "synthesized-for-schema-check",
      fix: `${spec.fix_prefix ?? ""}synthesized-for-schema-check`,
      ...(spec.kind ? { kind: spec.kind } : {}),
    };
    const errors = validateFinding(synthesized);
    checks.push({
      name: `[${matchName}] spec implies a schema-valid finding`,
      ok: errors.length === 0,
      detail: errors.length === 0
        ? "ok"
        : errors.map((e) => `${e.path}: ${e.message}`).join("; "),
    });

    // Sensitivity gate: does the synthesized finding land on the model
    // the fixture expects?
    const gateResult = gate({
      files: [spec.file],
      categories: [spec.category],
      isAggregate: spec.kind === "aggregate",
    });

    // Find the matching packet, if any, to compare against
    const matchedPacket = packets?.work_packets?.find(
      (p) => p.$match === spec.$match,
    );
    if (matchedPacket?.suggested_model) {
      checks.push({
        name: `[${matchName}] sensitivity gate matches expected packet model`,
        ok: gateResult.suggested_model === matchedPacket.suggested_model,
        detail: gateResult.suggested_model === matchedPacket.suggested_model
          ? `${gateResult.suggested_model} (${gateResult.sensitivity_reason})`
          : `gate says ${gateResult.suggested_model} (${gateResult.sensitivity_reason}); fixture expects ${matchedPacket.suggested_model}`,
      });
    } else {
      checks.push({
        name: `[${matchName}] sensitivity gate reports`,
        ok: true,
        detail: `${gateResult.suggested_model} (${gateResult.sensitivity_reason})`,
      });
    }
  }

  const passed = checks.every((c) => c.ok);
  return { fixture: name, passed, checks };
}

function discoverFixtures(): string[] {
  return readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function format(result: Result): string {
  const heading = `${result.passed ? "✓" : "✗"} ${result.fixture}`;
  const lines = result.checks.map((c) => {
    const mark = c.ok ? "  ✓" : "  ✗";
    return `${mark} ${c.name}: ${c.detail}`;
  });
  return [heading, ...lines].join("\n");
}

function main() {
  const arg = process.argv[2];
  const fixtures = arg ? [arg] : discoverFixtures();

  if (fixtures.length === 0) {
    console.error("no fixtures found in", FIXTURES_DIR);
    process.exit(1);
  }

  const results = fixtures.map(runFixture);
  for (const r of results) console.log(format(r), "\n");

  const failed = results.filter((r) => !r.passed);
  console.log(`Summary: ${results.length - failed.length}/${results.length} fixtures passed`);

  process.exit(failed.length === 0 ? 0 : 1);
}

main();
