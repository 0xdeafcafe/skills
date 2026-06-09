// Invoke `claude` non-interactively via `@anthropic-ai/claude-agent-sdk`'s
// `query()` async generator. Routes through the LangWatch AI Gateway when
// LANGWATCH_GATEWAY_URL + LANGWATCH_VIRTUAL_AI_KEY are set, otherwise
// direct to Anthropic via LOCAL_ANTHROPIC_API_KEY. The SDK spawns claude-code as
// a subprocess under the hood and inherits the env we build here, so the
// gateway routing is wire-compatible with what the old `claude -p` shell-out
// did — we just get structured messages instead of having to parse a JSON
// envelope out of stdout.
//
// Why the Agent SDK and not the bare Anthropic SDK: the plugin under test
// ships as Claude Code skills, so invoking `/review-security` etc. requires
// the CLI's skill discovery + tool wiring + reference-file loading.
// `query({ options: { plugins: [{type:'local', path}] } })` resolves slash
// commands the same way `claude --plugin-dir ...` would.

import {
  AbortError,
  query,
  type Options,
  type SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";

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
export const DEFAULT_ALLOWED_TOOLS: readonly string[] = [
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
  /** Per-call hard cap. The SDK fails fast if the run would exceed it. */
  readonly maxBudgetUsd?: number;
  /**
   * Local plugin directory to load for the session. The eval runs in a
   * temp fixture dir, so we can't rely on the user's globally-installed
   * plugin (it may be a stale snapshot). Loading from the repo root pins
   * the eval to the *current* skill code under test.
   */
  readonly pluginDir?: string;
  /**
   * Explicit allow-list passed to the SDK's `allowedTools` option. The
   * reviewers can't run to completion without their toolchain (Bash for
   * rg/gitleaks/npm audit, WebFetch for ADR cross-refs), and we want a
   * bounded surface — anything outside the list is denied at the SDK
   * layer and surfaces as a finding gap rather than a silent escalation.
   */
  readonly allowedTools?: readonly string[];
};

export type ClaudeInvokeResult = {
  /** The assistant's final response text (from the SDK's `result` message). */
  readonly response: string;
  /** Errors the SDK reported on a non-success terminal result. */
  readonly errors: readonly string[];
  /** 0 on success, 1 on SDK error result, -1 on timeout / no result. */
  readonly exitCode: number;
  readonly timedOut: boolean;
  /** Token usage as reported by the SDK's result message, when available. */
  readonly tokens: { readonly input: number; readonly output: number } | null;
  /** Approximate USD spent on this call, per the result message. */
  readonly costUsd: number | null;
};

/**
 * Exported for unit testing. The branching here (gateway vs. ANTHROPIC_* vs.
 * LOCAL_ANTHROPIC_API_KEY vs. throw) silently determines whether the SDK
 * subprocess talks to LangWatch's gateway or directly to Anthropic, so the
 * contract is worth locking down in tests.
 */
export const buildSubprocessEnv = (env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv => {
  // LANGWATCH_GATEWAY_URL is the AI gateway base (e.g.
  // https://gateway.langwatch.ai). LANGWATCH_ENDPOINT is the dashboard /
  // governance API origin (https://app.langwatch.ai) — a different
  // service. Don't conflate them: requests sent to the dashboard URL
  // 200-back the SPA's index.html and look like silent success until you
  // try to parse the response.
  const baseUrl = env.ANTHROPIC_BASE_URL ?? env.LANGWATCH_GATEWAY_URL;
  const authToken = env.ANTHROPIC_AUTH_TOKEN ?? env.LANGWATCH_VIRTUAL_AI_KEY;

  const out: NodeJS.ProcessEnv = { ...env };

  if (baseUrl && authToken) {
    out.ANTHROPIC_BASE_URL = baseUrl;
    out.ANTHROPIC_AUTH_TOKEN = authToken;
    return out;
  }

  if (env.LOCAL_ANTHROPIC_API_KEY) {
    out.ANTHROPIC_API_KEY = env.LOCAL_ANTHROPIC_API_KEY;
    delete out.ANTHROPIC_BASE_URL;
    delete out.ANTHROPIC_AUTH_TOKEN;
    return out;
  }

  throw new Error(
    "no Claude credentials: set LANGWATCH_GATEWAY_URL + LANGWATCH_VIRTUAL_AI_KEY (preferred), " +
      "ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN, or LOCAL_ANTHROPIC_API_KEY",
  );
};

export const invokeClaude = async ({
  cwd,
  prompt,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBudgetUsd = DEFAULT_MAX_BUDGET_USD,
  pluginDir,
  allowedTools = DEFAULT_ALLOWED_TOOLS,
}: ClaudeInvokeOptions): Promise<ClaudeInvokeResult> => {
  const env = buildSubprocessEnv();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  const options: Options = {
    cwd,
    allowedTools: [...allowedTools],
    maxBudgetUsd,
    env,
    abortController,
    ...(pluginDir ? { plugins: [{ type: "local", path: pluginDir }] } : {}),
  };

  let result: SDKResultMessage | null = null;
  let timedOut = false;

  try {
    for await (const message of query({ prompt, options })) {
      if (message.type === "result") {
        result = message;
        break;
      }
    }
  } catch (err) {
    if (err instanceof AbortError) {
      timedOut = true;
    } else {
      throw err;
    }
  } finally {
    clearTimeout(timeoutId);
  }

  if (timedOut || result === null) {
    return {
      response: "",
      errors: timedOut ? ["timeout"] : ["no result message received"],
      exitCode: -1,
      timedOut,
      tokens: null,
      costUsd: null,
    };
  }

  const tokens = {
    input: result.usage.input_tokens,
    output: result.usage.output_tokens,
  };

  if (result.subtype === "success") {
    return {
      response: result.result,
      errors: [],
      exitCode: 0,
      timedOut: false,
      tokens,
      costUsd: result.total_cost_usd,
    };
  }

  // SDKResultError: error_during_execution / error_max_turns /
  // error_max_budget_usd / error_max_structured_output_retries
  return {
    response: "",
    errors: result.errors,
    exitCode: 1,
    timedOut: false,
    tokens,
    costUsd: result.total_cost_usd,
  };
};
