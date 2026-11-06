import { ScriptedUser } from "./lib/scripted-user.ts";
import scenario, {
  AgentAdapter,
  AgentRole,
  agent,
  user,
  type AgentInput,
} from "@langwatch/scenario";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

class OfflineAgent extends AgentAdapter {
  override role = AgentRole.AGENT;
  override async call(_input: AgentInput): Promise<string> {
    return "offline response";
  }
}

it("runs scripted Scenario assertions without config credentials or reporting", async () => {
  vi.stubEnv("LANGWATCH_API_KEY", "synthetic-key-that-must-not-be-used");
  const fetch = vi.spyOn(globalThis, "fetch");
  const result = await scenario.run(
    {
      name: "offline harness validation",
      description: "Detect config and reporter initialization regressions without a model call.",
      agents: [new ScriptedUser(), new OfflineAgent()],
      script: [
        user("offline request"),
        agent(),
        async (_state, executor) => {
          await executor.succeed("script completed");
        },
      ],
    },
    { langwatch: { apiKey: "", endpoint: "http://127.0.0.1" } },
  );

  expect(result.success).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

it("stops after a failed outcome check before later steps can declare success", async () => {
  const laterStep = vi.fn();
  const result = await scenario.run(
    {
      name: "failed outcome remains failed",
      description: "A later success must not conceal a failed intermediate check.",
      agents: [new ScriptedUser(), new OfflineAgent()],
      script: [
        user("synthetic request"),
        agent(),
        async (_state, executor) => {
          await executor.fail("Required outcome was absent");
        },
        async (_state, executor) => {
          laterStep();
          await executor.succeed("This step must never run");
        },
      ],
    },
    { langwatch: { apiKey: "", endpoint: "http://127.0.0.1" } },
  );

  expect(result.success).toBe(false);
  expect(laterStep).not.toHaveBeenCalled();
});
