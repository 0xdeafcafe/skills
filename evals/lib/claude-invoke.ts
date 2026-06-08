// Spawn `claude` in non-interactive mode against a fixture's git state and
// capture the output. Routes through the LangWatch AI Gateway by setting
// ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN in the subprocess env (the
// Anthropic CLI honours those; the gateway is API-compatible at /v1/messages).
//
// We don't use the @anthropic-ai/sdk directly here because the plugin under
// test ships as a Claude Code skill — invoking `/drive-change` requires the
// CLI's skill discovery + orchestration. Cleanest path is to spawn the CLI
// the user already has installed.

import { spawnSync } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 min per fixture; tune later.

export type ClaudeInvokeOptions = {
  readonly cwd: string;
  readonly prompt: string;
  readonly timeoutMs?: number;
};

export type ClaudeInvokeResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly timedOut: boolean;
};

/**
 * Resolve gateway credentials from the LangWatch-native env names (preferred)
 * or the Anthropic SDK names (fallback). The subprocess gets whichever pair
 * resolved; if neither is set and LOCAL_ANTHROPIC_API_KEY is unset, we throw —
 * we never want to silently call the Anthropic API unbilled to LangWatch.
 */
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
    // Make sure we don't accidentally leak a stale base URL.
    delete env.ANTHROPIC_BASE_URL;
    delete env.ANTHROPIC_AUTH_TOKEN;
    return env;
  }

  throw new Error(
    "no Claude credentials: set LANGWATCH_ENDPOINT + LANGWATCH_VIRTUAL_AI_KEY (preferred)" +
      " or ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN, or LOCAL_ANTHROPIC_API_KEY",
  );
};

export const invokeClaude = ({
  cwd,
  prompt,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: ClaudeInvokeOptions): ClaudeInvokeResult => {
  const env = buildSubprocessEnv();

  const result = spawnSync("claude", ["-p", prompt], {
    cwd,
    env,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 50 * 1024 * 1024, // 50MB — drive-change reports can get chatty
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? -1,
    timedOut: result.signal === "SIGTERM" && result.status === null,
  };
};
