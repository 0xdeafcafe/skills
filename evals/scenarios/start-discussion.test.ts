// Scenario: an engineer arrives with a vague refactor idea and uses
// /start-discussion to think out loud. The skill's whole job is to draw
// out context — what's the actual problem, what's the constraint, what
// would good look like — without jumping to a solution or drafting an ADR.
//
// The judge checks that the agent stayed in discussion mode (no premature
// solutioning, no file writes) and that once intent emerged it offered to
// route into /plan-change or /start-feature.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import scenario, { judgeAgent, userSimulatorAgent } from "@langwatch/scenario";
import { describe, it, expect } from "vitest";

import { ClaudeCodeAdapter } from "./lib/claude-code-adapter.ts";

// The plugin under test is the repo root — load it locally so the scenario
// pins the *current* /start-discussion SKILL.md, not whatever stale
// snapshot the user has installed globally.
const PLUGIN_DIR = new URL("../../", import.meta.url).pathname;

describe("/start-discussion", () => {
  it(
    "draws out context without solutioning, then routes to /plan-change",
    async () => {
      const cwd = await mkdtemp(join(tmpdir(), "scenario-start-discussion-"));
      try {
        const agent = new ClaudeCodeAdapter({
          cwd,
          pluginDir: PLUGIN_DIR,
          slashCommand: "/start-discussion",
        });

        const result = await scenario.run({
          name: "vague auth refactor idea",
          description:
            "An engineer wants to think out loud about whether to refactor " +
            "the auth layer. They aren't sure if it's the right next thing — " +
            "they have a hunch it's messy but no concrete failure yet. " +
            "/start-discussion should pull out the actual constraint " +
            "(why now, not two months ago?) without drafting an ADR.",
          agents: [
            agent,
            userSimulatorAgent({
              // Vague opener, slowly revealing the actual driver
              // (a security audit) only if asked the right question.
              // If the agent jumps to "let's plan the refactor" before
              // surfacing that constraint, it fails the criteria.
              persona:
                "You are a senior engineer thinking out loud. You open " +
                "with: 'I keep thinking we should refactor the auth layer " +
                "but I'm not sure if it's the right move.' If asked open " +
                "questions, you slowly reveal: (a) there's a security audit " +
                "in 6 weeks that's making you nervous, (b) the auth layer " +
                "hasn't been touched in 3 years, (c) you ran a quick threat " +
                "model and noticed session tokens are stored in localStorage. " +
                "You don't volunteer any of this unprompted — make the agent " +
                "draw it out. Keep replies to 1-2 sentences. If the agent " +
                "offers to route to /plan-change or /start-feature once it " +
                "has enough context, agree and end the conversation.",
            }),
            judgeAgent({
              criteria: [
                "The agent asked open-ended questions instead of jumping to a solution or writing a refactor plan",
                "The agent surfaced the underlying constraint driving the conversation (the security audit, the threat model finding, or the time pressure)",
                "The agent did NOT draft an ADR, write files, or commit to an implementation plan during this conversation",
                "Once the constraint became clear, the agent offered to route the work into /plan-change or /start-feature rather than continuing to ask vague questions",
              ],
            }),
          ],
          maxTurns: 8,
        });

        expect(result.success, JSON.stringify(result, null, 2)).toBe(true);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
    300_000,
  );
});
