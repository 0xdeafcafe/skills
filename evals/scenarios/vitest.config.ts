import { defineConfig } from "vitest/config";
import { withScenario } from "@langwatch/scenario/integrations/vitest/config";

// Scenarios run REAL LLM calls — the agent under test (Claude Code with
// the plugin loaded) plus the UserSimulatorAgent + JudgeAgent. Wall-clock
// is dominated by the SDK subprocess; the 300s per-test timeout is the
// guardrail. `withScenario` wires up Scenario's reporter so test results
// stream into the LangWatch dashboard alongside the trace.
export default withScenario(
  defineConfig({
    test: {
      include: ["scenarios/**/*.test.ts"],
      testTimeout: 300_000,
      hookTimeout: 60_000,
    },
  }),
);
