import scenario, { agent, user, type ScriptStep } from "@langwatch/scenario";
import { expect } from "vitest";
import { turnHasTerminalData } from "../../fixtures/evidence.ts";
import type { OutcomeCheck } from "../../fixtures/format.ts";
import { ClaudeCoordinator } from "./claude-coordinator.ts";
import { snapshot, type Fixture } from "./fixture.ts";
import { instructionDigest, recordResponse } from "./record-response.ts";
import { ScriptedUser } from "./scripted-user.ts";

export type ScenarioTurn = {
  prompt: string;
  verify: (coordinator: ClaudeCoordinator) => Promise<void>;
};

type ScenarioCase = {
  name: string;
  fixture: Fixture;
  source: string;
  artifacts: readonly string[];
  turns: readonly [ScenarioTurn, ...ScenarioTurn[]];
  kind?: OutcomeCheck["kind"];
  delegation?: boolean;
};

/** Run the conversation, assess every turn, then record the outcome once. */
export async function runScenario(testCase: ScenarioCase): Promise<void> {
  const {
    name,
    fixture,
    source,
    artifacts,
    turns,
    delegation = false,
    kind = "git-postcondition",
  } = testCase;
  const coordinator = new ClaudeCoordinator(fixture.path, fixture.pluginDir, delegation);
  const before = await snapshot(fixture);
  const digest = await instructionDigest(fixture.pluginDir);
  const script = turns.flatMap((turn) => [
    user(turn.prompt),
    agent(),
    verifyTurn(turn, coordinator),
  ]);

  script.push(async (_state, executor) => {
    await executor.succeed("All requested outcomes verified");
  });

  let passed = false;
  let reason = "Scenario stopped before verification completed";

  try {
    const result = await scenario.run(
      {
        name,
        description: turns[0].prompt,
        agents: [new ScriptedUser(), coordinator],
        maxTurns: turns.length * 2,
        script,
        metadata: { suite: "skills-v2", upload: false },
      },
      { langwatch: { apiKey: "", endpoint: "http://127.0.0.1" } },
    );

    passed = result.success;
    reason = result.reasoning ?? "Scenario assertions passed";
    console.info(`[skills-v2] ${name}`, {
      model: coordinator.model,
      reportedCostsUsd: coordinator.reportedCostsUsd,
      tools: coordinator.actions.length,
      success: passed,
    });

    expect(passed, `${reason}\n${JSON.stringify(coordinator.verification(), null, 2)}`).toBe(true);
  } finally {
    await recordResponse({
      fixture,
      coordinator,
      before,
      digest,
      source,
      artifacts,
      kind,
      passed,
      reason: passed ? undefined : reason,
    });
  }
}

function verifyTurn(turn: ScenarioTurn, coordinator: ClaudeCoordinator): ScriptStep {
  return async (_state, executor) => {
    try {
      await turn.verify(coordinator);
      expect(coordinator.sessionId, "CLI session identity").toBeTruthy();
      expect(coordinator.model, "Resolved model identity").toBeTruthy();
      expect(coordinator.turns.length, "Captured CLI turns").toBeGreaterThan(0);
      expect(coordinator.turns.every(turnHasTerminalData), "Successful CLI terminal evidence").toBe(
        true,
      );
    } catch (error) {
      await executor.fail(error instanceof Error ? error.message : String(error));
    }
  };
}
