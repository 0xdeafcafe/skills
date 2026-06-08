// Spawn `claude` in non-interactive mode (`-p`) against a fixture's git state
// and capture the output. Routes through the LangWatch AI Gateway via env
// (ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN). The Claude Code CLI honours
// those; gateway is API-compatible at /v1/messages.
//
// Why the CLI and not the Anthropic SDK: the plugin under test ships as a
// Claude Code skill, so invoking `/review-security` etc. requires the CLI's
// skill discovery + tool wiring + reference-file loading. The user already
// has the plugin installed user-scope; `claude -p` resolves slash commands
// from any cwd.

import { spawnSync } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_MAX_BUDGET_USD = 1.0;

// Tools the `/review-*` skills + `/drive-change` orchestrator legitimately
// need to function. Keep this list bounded — anything new will deny by
// default (no silent escalation).
//
//  - Bash:        the reviewers' toolchain (rg, gitleaks, npm/pip/cargo
//                 audit, prettier, eslint, biome, …)
//  - Read/Grep/   reading + scanning the fixture's working tree
//    Glob/LS
//  - WebFetch/    ADR / spec / CVE cross-references (review-security &
//    WebSearch    review-feature pull these in)
//  - Task/Skill:  /drive-change spawns sub-agents (orchestrate-slice etc.)
//                 and invokes reviewers via Skill — tier-3 needs both
//  - Edit/Write:  drive-change's fix-applier writes auto-fixes; reviewers
//                 themselves don't write, but tier-3 leans on this
//  - Todo*:       reviewers + orchestrator use the task tools for planning
const DEFAULT_ALLOWED_TOOLS: readonly string[] = [
  "Bash",
  "Read",
  "Grep",
  "Glob",
  "LS",
  "WebFetch",
  "WebSearch",
  "Task",
  "Skill",
  "Edit",
  "Write",
  "TodoWrite",
  "NotebookRead",
];

export type ClaudeInvokeOptions = {
  readonly cwd: string;
  readonly prompt: string;
  readonly timeoutMs?: number;
  /** Per-call hard cap. The CLI fails fast if the run would exceed it. */
  readonly maxBudgetUsd?: number;
  /**
   * Local plugin directory to load for the session (`--plugin-dir`). The
   * eval runs in a temp fixture dir, so we can't rely on the user's
   * globally-installed plugin (it may be a stale snapshot). Loading from
   * the repo root pins the eval to the *current* skill code under test.
   */
  readonly pluginDir?: string;
  /**
   * Explicit allow-list passed to `--allowed-tools`. The reviewers can't
   * run to completion without their toolchain (Bash for rg/gitleaks/npm
   * audit, WebFetch for ADR cross-refs), and we want a bounded surface —
   * anything outside the list is denied at the CLI layer and surfaces as
   * a finding gap rather than a silent escalation.
   */
  readonly allowedTools?: readonly string[];
};

export type ClaudeInvokeResult = {
  /** The assistant's final response text (parsed out of the JSON envelope). */
  readonly response: string;
  /** Full stdout in case the caller wants to debug. */
  readonly rawStdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly timedOut: boolean;
  /** Token usage as reported by the CLI's JSON envelope, when available. */
  readonly tokens: { readonly input: number; readonly output: number } | null;
  /** Approximate USD spent on this call, per the envelope. */
  readonly costUsd: number | null;
};

/**
 * The shape `claude -p --output-format json` returns. Captured here so we
 * fail loud (not silently) if the envelope changes.
 */
type ClaudeJsonEnvelope = {
  readonly type: "result";
  readonly subtype?: string;
  readonly result?: string;
  readonly is_error?: boolean;
  readonly num_turns?: number;
  readonly usage?: {
    readonly input_tokens?: number;
    readonly output_tokens?: number;
  };
  readonly total_cost_usd?: number;
};

const buildSubprocessEnv = (): NodeJS.ProcessEnv => {
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? process.env.LANGWATCH_ENDPOINT;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.LANGWATCH_VIRTUAL_AI_KEY;

  const env: NodeJS.ProcessEnv = { ...process.env };

  if (baseUrl && authToken) {
    env.ANTHROPIC_BASE_URL = baseUrl;
    env.ANTHROPIC_AUTH_TOKEN = authToken;
    return env;
  }

  if (process.env.LOCAL_ANTHROPIC_API_KEY) {
    env.ANTHROPIC_API_KEY = process.env.LOCAL_ANTHROPIC_API_KEY;
    delete env.ANTHROPIC_BASE_URL;
    delete env.ANTHROPIC_AUTH_TOKEN;
    return env;
  }

  throw new Error(
    "no Claude credentials: set LANGWATCH_ENDPOINT + LANGWATCH_VIRTUAL_AI_KEY (preferred), " +
      "ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN, or LOCAL_ANTHROPIC_API_KEY",
  );
};

export const invokeClaude = ({
  cwd,
  prompt,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBudgetUsd = DEFAULT_MAX_BUDGET_USD,
  pluginDir,
  allowedTools = DEFAULT_ALLOWED_TOOLS,
}: ClaudeInvokeOptions): ClaudeInvokeResult => {
  const env = buildSubprocessEnv();

  const args = [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--max-budget-usd",
    String(maxBudgetUsd),
    "--allowed-tools",
    allowedTools.join(" "),
  ];
  if (pluginDir) {
    args.push("--plugin-dir", pluginDir);
  }

  const result = spawnSync("claude", args, {
    cwd,
    env,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 50 * 1024 * 1024,
  });

  const rawStdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const exitCode = result.status ?? -1;
  const timedOut = result.signal === "SIGTERM" && result.status === null;

  if (timedOut || exitCode !== 0 || !rawStdout) {
    return {
      response: "",
      rawStdout,
      stderr,
      exitCode,
      timedOut,
      tokens: null,
      costUsd: null,
    };
  }

  // The CLI streams partial JSON during the run; the final result line is the
  // assistant's response envelope. Parse from the last `{` that starts a top-
  // level JSON object — defensive against any prefix logging.
  const lastJsonStart = rawStdout.lastIndexOf("\n{");
  const candidate = lastJsonStart === -1 ? rawStdout : rawStdout.slice(lastJsonStart + 1);

  try {
    const envelope = JSON.parse(candidate) as ClaudeJsonEnvelope;
    return {
      response: envelope.result ?? "",
      rawStdout,
      stderr,
      exitCode,
      timedOut: false,
      tokens: envelope.usage
        ? {
            input: envelope.usage.input_tokens ?? 0,
            output: envelope.usage.output_tokens ?? 0,
          }
        : null,
      costUsd: envelope.total_cost_usd ?? null,
    };
  } catch (_e) {
    return {
      response: rawStdout, // fall back to raw — caller can still try to parse
      rawStdout,
      stderr,
      exitCode,
      timedOut: false,
      tokens: null,
      costUsd: null,
    };
  }
};
