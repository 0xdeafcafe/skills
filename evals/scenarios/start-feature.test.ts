// Scenario: an engineer arrives with a concrete piece of new work and uses
// /start-feature to figure out what scaffolding belongs around it. The
// skill's job here is routing — not authoring. It asks ≤2 questions, looks
// at the ADR landscape, decides which next skill should run, and hands off
// via the Skill tool. It must NOT write files itself.
//
// We pick the "new feature, nothing exists yet" path because it's the
// cleanest routing decision: the right call is /plan-change. Other paths
// (existing-with-ADR, existing-without-ADR → /backfill-feature, trivial →
// skip) are valuable to test eventually but bleed into downstream skills'
// behaviour; this scenario isolates the routing logic itself.
//
// Success conditions:
//   - asked at most a couple of pin-down questions before routing
//   - inspected the repo for existing ADRs / specs (Phase 1 discovery)
//   - stated the route back to the user before invoking anything
//   - chose /plan-change (correct for new + no-prior-work)
//   - did not write any files into the fixture dir
//
// We seed the fixture with an empty docs/adr/ and specs/ directory plus
// one unrelated ADR — so the discovery step has something to find but
// nothing that would conflict with "this is new work".

import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import scenario, { judgeAgent, userSimulatorAgent } from "@langwatch/scenario";
import { describe, it, expect } from "vitest";

import { ClaudeCodeAdapter } from "./lib/claude-code-adapter.ts";

const PLUGIN_DIR = new URL("../../", import.meta.url).pathname;

const UNRELATED_ADR = `---
status: accepted
date: 2026-02-10
---

# 20260210 - billing webhook retry budget

## Decision

Webhooks retry for 24h with exponential backoff. Out of scope for any
rate-limiting work.
`;

describe("/start-feature", () => {
  it(
    "routes new feature work to /plan-change without writing files",
    async () => {
      const cwd = await mkdtemp(join(tmpdir(), "scenario-start-feature-"));
      try {
        await mkdir(join(cwd, "docs", "adr"), { recursive: true });
        await mkdir(join(cwd, "specs"), { recursive: true });
        await writeFile(
          join(cwd, "docs", "adr", "20260210-billing-webhook-retries.md"),
          UNRELATED_ADR,
          "utf8",
        );

        const agent = new ClaudeCodeAdapter({
          cwd,
          pluginDir: PLUGIN_DIR,
          slashCommand: "/start-feature",
          // Lock the session to start-feature only. Otherwise claude-code's
          // auto-discovery picks /plan-change based on the user's "i want to
          // add X" opener — its description matches that phrasing exactly,
          // and the slash prefix in the prompt isn't enough to override.
          skills: ["start-feature"],
        });

        const result = await scenario.run({
          name: "new rate-limiting feature",
          description:
            "An engineer has a clear new feature to build (per-API-key " +
            "rate limiting). Nothing for it exists today. /start-feature " +
            "should pin the work in ≤2 questions, discover the ADR " +
            "landscape, state the route back, and hand off to /plan-change.",
          agents: [
            agent,
            userSimulatorAgent({
              persona:
                "You are a platform engineer. You open with: 'I want to " +
                "add per-API-key rate limiting. It doesn't exist yet — " +
                "totally new feature.' If asked whether this is new or " +
                "modifying something existing, confirm: brand new, no " +
                "code for it today. If asked to summarise, agree with the " +
                "summary. When the agent shows you what it found in " +
                "docs/adr/ and specs/, confirm none of it is related. " +
                "When the agent states a route (e.g. 'I'll call " +
                "/plan-change next'), agree. Do NOT volunteer extra " +
                "design context — this skill is supposed to route, not " +
                "to design. Keep replies to one sentence. End the " +
                "conversation as soon as the route has been confirmed and " +
                "the agent is about to hand off.",
            }),
            judgeAgent({
              criteria: [
                "The agent asked at most a couple of short pin-down questions (one-sentence work summary + new-vs-existing) before routing — it did NOT launch into a multi-anchor design discussion",
                "The agent inspected the repo for existing ADRs / specs (Phase 1 discovery — ran find/ls/grep against docs/adr, specs, or similar directories)",
                "The agent stated the routing decision back to the user (which next skill it would call, and why) BEFORE invoking it",
                "The agent routed to /plan-change (correct for new feature with no prior ADR) — NOT to /backfill-feature, NOT to 'skip the scaffolding', and NOT directly to implementation",
                "The agent did NOT itself draft an ADR, spec, or any other file — start-feature only routes, it does not author",
              ],
            }),
          ],
          maxTurns: 8,
        });

        expect(result.success, JSON.stringify(result, null, 2)).toBe(true);

        // Filesystem assertion: start-feature is documented as
        // non-authoring. Verify no new files were dropped into the
        // scaffolding directories beyond the seed ADR.
        const adrFiles = await readdir(join(cwd, "docs", "adr"));
        const specFiles = await readdir(join(cwd, "specs"));

        expect(
          adrFiles.sort(),
          "start-feature must not write ADRs — it only routes",
        ).toEqual(["20260210-billing-webhook-retries.md"]);
        expect(
          specFiles,
          "start-feature must not write specs — it only routes",
        ).toEqual([]);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
    300_000,
  );
});
