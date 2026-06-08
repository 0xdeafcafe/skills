// Tier-2 pipeline runner — invokes /drive-change against a fixture's git
// state and validates the resulting findings against expected.findings.json.
//
// Wired through the LangWatch AI Gateway (gateway.langwatch.ai) so we don't
// manage Anthropic keys ourselves AND so every LLM call lands in the
// LangWatch dashboard with token telemetry + cost attribution. The TS SDK
// adds a wrapping span per run so we can tag with fixture name, commit SHA,
// pass/fail, and (later) per-agent sub-spans.
//
// Usage:
//   node runners/run-pipeline.ts <fixture-name>           # real run
//   node runners/run-pipeline.ts <fixture-name> --dry-run # harness check
//
// --dry-run skips the actual Claude invocation but still:
//   - sets up the fixture's git state
//   - validates schema + sensitivity on the expected findings
//   - emits a telemetry span (if LANGWATCH_API_KEY is set) so we can
//     verify the dashboard wiring without burning gateway credits.
//
// Env (see .env.example): LANGWATCH_API_KEY, ANTHROPIC_BASE_URL,
// ANTHROPIC_AUTH_TOKEN. The runner refuses to invoke Claude unless either
// the gateway env vars are set OR LOCAL_ANTHROPIC_API_KEY is set
// explicitly — we don't want accidental direct-to-Anthropic calls that
// skip telemetry.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { setupTelemetry } from "../lib/telemetry.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../fixtures");

interface RunOptions {
  fixture: string;
  dryRun: boolean;
}

function parseArgs(): RunOptions {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fixture = args.find((a) => !a.startsWith("--"));
  if (!fixture) {
    console.error("usage: run-pipeline.ts <fixture-name> [--dry-run]");
    process.exit(1);
  }
  return { fixture, dryRun };
}

function checkGatewayEnv(dryRun: boolean): { ok: boolean; reason: string } {
  if (dryRun) return { ok: true, reason: "--dry-run; gateway not required" };

  const hasGateway =
    process.env.ANTHROPIC_BASE_URL?.includes("langwatch") &&
    process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("vk-lw-");
  const hasLocal = !!process.env.LOCAL_ANTHROPIC_API_KEY;

  if (hasGateway) return { ok: true, reason: "routing via LangWatch gateway" };
  if (hasLocal) {
    return {
      ok: true,
      reason:
        "LOCAL_ANTHROPIC_API_KEY set — bypassing gateway (no LangWatch telemetry)",
    };
  }
  return {
    ok: false,
    reason:
      "neither LangWatch gateway env (ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN) nor LOCAL_ANTHROPIC_API_KEY is set — refusing to invoke Claude",
  };
}

function setupFixtureRepo(fixtureName: string): string {
  const fixtureDir = join(FIXTURES_DIR, fixtureName);
  if (!existsSync(fixtureDir)) {
    throw new Error(`fixture not found: ${fixtureDir}`);
  }
  const setupScript = join(fixtureDir, "setup.sh");
  if (!existsSync(setupScript)) {
    throw new Error(`fixture missing setup.sh: ${setupScript}`);
  }

  const tempDir = mkdtempSync(join(tmpdir(), `skills-eval-${fixtureName}-`));
  const result = spawnSync("bash", [setupScript, tempDir], {
    stdio: "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`setup.sh failed with status ${result.status}`);
  }

  return tempDir;
}

interface ExpectedFindings {
  count_min?: number;
  count_max?: number;
  findings: unknown[];
}

function loadExpected(fixtureName: string): ExpectedFindings {
  const path = join(FIXTURES_DIR, fixtureName, "expected.findings.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main(): Promise<void> {
  const { fixture, dryRun } = parseArgs();

  const gateway = checkGatewayEnv(dryRun);
  if (!gateway.ok) {
    console.error(`✗ ${gateway.reason}`);
    process.exit(1);
  }
  console.log(`◦ ${gateway.reason}`);

  const telemetry = await setupTelemetry("skills-evals");
  console.log(`◦ telemetry: ${telemetry.enabled ? "enabled" : "disabled (LANGWATCH_API_KEY unset)"}`);

  const expected = loadExpected(fixture);
  let tempDir: string | null = null;
  let exitCode = 0;

  try {
    await telemetry.withSpan(`fixture:${fixture}`, async (span) => {
      span.setAttributes({
        "skills_eval.fixture": fixture,
        "skills_eval.dry_run": dryRun,
        "skills_eval.expected_findings_count": expected.findings.length,
      });

      tempDir = setupFixtureRepo(fixture);
      span.setAttribute("skills_eval.workdir", tempDir);
      console.log(`◦ fixture set up at ${tempDir}`);

      if (dryRun) {
        console.log("◦ --dry-run: skipping Claude invocation");
        span.setAttribute("skills_eval.outcome", "dry-run-ok");
        return;
      }

      // TODO: invoke claude -p with --workdir <tempDir> and prompt
      // "/drive-change". Capture the structured output (finding blocks),
      // parse via lib/finding-parser.ts, validate each against the schema,
      // diff against expected.findings.json with tolerant matching.
      //
      // Stubbed for now so we can land the harness shape end-to-end and
      // wire langwatch telemetry, then layer the actual invocation in a
      // follow-up. Until that lands, real runs (non-dry) error out so we
      // don't silently report "passed" without doing the work.
      throw new Error(
        "real Claude invocation not yet wired — use --dry-run to exercise the harness, or wait for the next commit that lands the claude -p subprocess + finding parser glue",
      );
    });
  } catch (e) {
    exitCode = 1;
    const err = e as Error;
    console.error(`✗ ${err.message}`);
  } finally {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  console.log(exitCode === 0 ? "✓ done" : "✗ failed");
  process.exit(exitCode);
}

await main();
