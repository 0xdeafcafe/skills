// Default model for the UserSimulatorAgent + JudgeAgent. These are the
// scenarios' own LLM calls (not the agent under test) — pick a capable
// but cost-reasonable model. Sonnet handles the multi-turn persona-play
// and rubric-style judging more reliably than haiku, and the per-scenario
// token volume is small (a handful of turns, ~hundreds of tokens each).
//
// Routing mirrors evals/lib/claude-invoke.ts's buildSubprocessEnv():
//
//   1. LANGWATCH_ENDPOINT + LANGWATCH_VIRTUAL_AI_KEY → gateway
//      (preferred — gets us per-trace cost + every simulator/judge
//      turn shows up alongside the agent-under-test turns in the
//      LangWatch dashboard).
//   2. ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN → manual override
//      (for users who set their own gateway).
//   3. LOCAL_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY → direct to
//      api.anthropic.com (bypass; useful for local dev).
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

import { defineConfig } from "@langwatch/scenario";
import { createAnthropic } from "@ai-sdk/anthropic";

const baseUrl = process.env.ANTHROPIC_BASE_URL ?? process.env.LANGWATCH_ENDPOINT;
const gatewayToken = process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.LANGWATCH_VIRTUAL_AI_KEY;
const projectId = process.env.LANGWATCH_PROJECT_ID;

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
      "LANGWATCH_ENDPOINT + LANGWATCH_VIRTUAL_AI_KEY (preferred — see " +
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
