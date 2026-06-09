// Default model for the UserSimulatorAgent + JudgeAgent. These are the
// scenarios' own LLM calls (not the agent under test) — pick a capable
// but cost-reasonable model. Sonnet handles the multi-turn persona-play
// and rubric-style judging more reliably than haiku, and the per-scenario
// token volume is small (a handful of turns, ~hundreds of tokens each).
//
// Routing mirrors evals/lib/claude-invoke.ts's buildSubprocessEnv():
//
//   1. LANGWATCH_GATEWAY_URL + LANGWATCH_VIRTUAL_AI_KEY → gateway
//      (preferred — gets us per-trace cost + every simulator/judge
//      turn shows up alongside the agent-under-test turns in the
//      LangWatch dashboard).
//   2. ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN → manual override
//      (for users who set their own gateway).
//   3. LOCAL_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY → direct to
//      api.anthropic.com (bypass; useful for local dev).
//
// Why LANGWATCH_GATEWAY_URL and not LANGWATCH_ENDPOINT: the dashboard /
// governance origin (app.langwatch.ai) and the AI gateway origin
// (gateway.langwatch.ai) are different services. The dashboard happily
// 200s an SPA index.html for `<dashboard>/v1/messages` requests, which
// looks like silent success until @ai-sdk fails to parse the HTML as
// JSON. Keep them separate.
//
// Project attribution on the gateway path:
//
//   Preferred — issue a **project-scoped** virtual AI key:
//
//     langwatch api-keys create \
//       --name "evals scenarios" \
//       --project-id <LANGWATCH_PROJECT_ID>
//
//   A scoped key carries the project binding in the credential itself, so
//   the gateway attributes traces correctly with zero extra wiring. This
//   matters here because @langwatch/scenario routes its simulator + judge
//   LLM calls through @ai-sdk/anthropic, which has no first-class notion
//   of a project id — the only knob is per-request headers.
//
//   Fallback — unscoped virtual AI key + LANGWATCH_PROJECT_ID env var:
//
//   If LANGWATCH_PROJECT_ID is set we send it on `x-project-id` as a
//   belt-and-suspenders header. This works for unscoped keys but is
//   redundant (and harmless) for scoped ones. If neither path is
//   available the traces still flow but land in an unattributed bucket
//   — we don't throw, but we do warn.
//
// The agent under test (the Claude Code session running /start-discussion
// etc.) is driven through @anthropic-ai/claude-agent-sdk with its own
// env wiring — see scenarios/lib/claude-code-adapter.ts.
//
// Why this file lives at evals/ (not evals/scenarios/): @langwatch/scenario's
// config loader only looks for `scenario.config.{js,mjs}` at `process.cwd()`
// (see src/config/load.ts in the package). vitest runs from evals/, so the
// config has to sit alongside package.json, not next to the tests.

import { defineConfig } from "@langwatch/scenario";
import { createAnthropic } from "@ai-sdk/anthropic";

const rawBaseUrl = process.env.ANTHROPIC_BASE_URL ?? process.env.LANGWATCH_GATEWAY_URL;
const gatewayToken = process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.LANGWATCH_VIRTUAL_AI_KEY;
const projectId = process.env.LANGWATCH_PROJECT_ID;

// claude-code appends `/v1/messages` to ANTHROPIC_BASE_URL itself, so the
// CLI-side env var omits the version segment. @ai-sdk/anthropic does NOT —
// it POSTs to `<baseURL>/messages` directly. So we need to add `/v1` here
// (and only here), otherwise requests land at `<gateway>/messages` which
// the gateway treats as the session-management endpoint, not the chat one.
// Symptom if you forget: `{"error":"Invalid or missing session ID"}` 400s.
const baseUrl = rawBaseUrl
  ? rawBaseUrl.replace(/\/+$/, "") + (rawBaseUrl.endsWith("/v1") ? "" : "/v1")
  : undefined;

const providerConfig =
  baseUrl && gatewayToken
    ? {
        baseURL: baseUrl,
        apiKey: gatewayToken,
        ...(projectId ? { headers: { "x-project-id": projectId } } : {}),
      }
    : process.env.LOCAL_ANTHROPIC_API_KEY
      ? { apiKey: process.env.LOCAL_ANTHROPIC_API_KEY }
      : process.env.ANTHROPIC_API_KEY
        ? { apiKey: process.env.ANTHROPIC_API_KEY }
        : null;

if (providerConfig === null) {
  throw new Error(
    "no Claude credentials for scenario judge/simulator: set " +
      "LANGWATCH_GATEWAY_URL + LANGWATCH_VIRTUAL_AI_KEY (preferred — see " +
      "scenario.config.mjs for project-scoped key setup), " +
      "ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN, " +
      "LOCAL_ANTHROPIC_API_KEY, or ANTHROPIC_API_KEY",
  );
}

if (baseUrl && gatewayToken && !projectId) {
  // Not fatal: a project-scoped virtual AI key carries the binding
  // implicitly. But if the key is unscoped, traces will land in an
  // unattributed bucket — warn so the user can either scope the key
  // or set LANGWATCH_PROJECT_ID.
  console.warn(
    "[scenarios] LANGWATCH_PROJECT_ID is unset. If your virtual AI key is " +
      "project-scoped (issued via `langwatch api-keys create --project-id ...`), " +
      "this is fine. Otherwise scenario traces will not be attributed to a " +
      "LangWatch project. Set LANGWATCH_PROJECT_ID or re-issue a scoped key.",
  );
}

const anthropic = createAnthropic(providerConfig);

export default defineConfig({
  defaultModel: { model: anthropic("claude-sonnet-4-6") },
});
