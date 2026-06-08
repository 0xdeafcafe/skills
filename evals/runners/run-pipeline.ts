// Tier-2 pipeline runner — invokes /drive-change against a fixture's git
// state and validates the resulting findings against expected.findings.json.
//
// Wired through the LangWatch AI Gateway so we don't manage Anthropic keys
// directly. Wrapping spans land in the LangWatch dashboard with fixture
// metadata; per-call telemetry flows automatically from the gateway.
//
// Usage:
//   node runners/run-pipeline.ts <fixture-name> [--dry-run]

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Span } from "@opentelemetry/api";

const SERVICE_NAME = "skills-evals";
const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;

type Args = { readonly fixture: string; readonly dryRun: boolean };
type EnvResult = { readonly ok: boolean; readonly reason: string };
type ExpectedFindings = {
  readonly findings: readonly unknown[];
  readonly count_min?: number;
  readonly count_max?: number;
};

const parseArgs = (argv: readonly string[]): Args => {
  const args = argv.slice(2);
  const fixture = args.find((a) => !a.startsWith("--"));
  if (!fixture) {
    throw new Error("usage: run-pipeline.ts <fixture-name> [--dry-run]");
  }
  return { fixture, dryRun: args.includes("--dry-run") };
};

const checkEnv = (dryRun: boolean): EnvResult => {
  if (dryRun) return { ok: true, reason: "--dry-run; gateway not required" };

  const { ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, LOCAL_ANTHROPIC_API_KEY } = process.env;
  const viaGateway =
    ANTHROPIC_BASE_URL?.includes("langwatch") && ANTHROPIC_AUTH_TOKEN?.startsWith("vk-lw-");

  if (viaGateway) return { ok: true, reason: "routing via LangWatch gateway" };
  if (LOCAL_ANTHROPIC_API_KEY) {
    return { ok: true, reason: "LOCAL_ANTHROPIC_API_KEY set — bypassing gateway" };
  }
  return {
    ok: false,
    reason:
      "set ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN (gateway) or LOCAL_ANTHROPIC_API_KEY (bypass)",
  };
};

const loadExpected = async (fixture: string): Promise<ExpectedFindings> =>
  JSON.parse(await readFile(join(FIXTURES_DIR, fixture, "expected.findings.json"), "utf8"));

/**
 * Set up a fixture's git state in a temp directory. The returned object is
 * an AsyncDisposable — declare it with `await using` and the temp dir gets
 * cleaned up automatically when it falls out of scope, even on throw.
 */
const setupRepo = async (fixture: string): Promise<AsyncDisposable & { readonly path: string }> => {
  const fixtureDir = join(FIXTURES_DIR, fixture);
  const path = await mkdtemp(join(tmpdir(), `skills-eval-${fixture}-`));

  const setup = spawnSync("bash", [join(fixtureDir, "setup.sh"), path], { stdio: "inherit" });
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

/**
 * Lazy langwatch tracer factory. Returns null when LANGWATCH_API_KEY is
 * unset — callers run uninstrumented in that case. The gateway still
 * captures every LLM call as a trace; this wrap adds a fixture-level
 * span on top.
 */
const tracerFactory = async () => {
  if (!process.env.LANGWATCH_API_KEY) return null;
  const { setupObservability } = await import("langwatch/observability/node");
  const { getLangWatchTracer } = await import("langwatch");
  setupObservability({ serviceName: SERVICE_NAME });
  return getLangWatchTracer(SERVICE_NAME);
};

type RunOutcome =
  | { readonly kind: "dry-run" }
  | { readonly kind: "stub-only"; readonly reason: string };

const runFixture = async (args: Args, span: Span | null): Promise<RunOutcome> => {
  const expected = await loadExpected(args.fixture);

  span?.setAttributes({
    "skills_eval.fixture": args.fixture,
    "skills_eval.dry_run": args.dryRun,
    "skills_eval.expected_findings_count": expected.findings.length,
  });

  await using repo = await setupRepo(args.fixture);
  console.log(`◦ fixture set up at ${repo.path}`);
  span?.setAttribute("skills_eval.workdir", repo.path);

  if (args.dryRun) {
    console.log("◦ --dry-run: skipping Claude invocation");
    return { kind: "dry-run" };
  }

  // TODO: invoke claude -p with --workdir <repo.path> and "/drive-change",
  // parse finding blocks via lib/finding-parser.ts, validate against
  // expected.findings.json. Throwing here keeps non-dry runs honest while
  // the wiring lands in a follow-up commit.
  throw new Error("real Claude invocation not yet wired — use --dry-run");
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);

  const env = checkEnv(args.dryRun);
  if (!env.ok) throw new Error(env.reason);
  console.log(`◦ ${env.reason}`);

  const tracer = await tracerFactory();
  console.log(`◦ langwatch span wrap: ${tracer ? "enabled" : "disabled"}`);

  const outcome = tracer
    ? await tracer.withActiveSpan(`fixture:${args.fixture}`, (span) => runFixture(args, span))
    : await runFixture(args, null);

  console.log(`✓ ${outcome.kind}`);
};

await main().catch((err: unknown) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
