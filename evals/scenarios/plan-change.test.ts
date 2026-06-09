// Scenario: an engineer wants to add a feature-flag service and uses
// /plan-change to drive the architectural discussion through to a written
// ADR + Gherkin spec. The persona has a rough lean ("we should build this
// in-house") but hasn't articulated the alternatives, the forcing function,
// or the edge cases — the skill's job is to extract those before writing
// anything, and to write *both* documents cross-linked.
//
// Unlike /start-discussion (where the success condition is "stay in
// discussion mode, don't write"), this one's success condition is "have
// the right discussion, then write the right two files in the right
// places". So the test has both a judge (for conversational quality) AND
// a post-run filesystem assertion (for the actual artifacts).
//
// The fixture is seeded with one existing ADR so Phase 0's "discover
// conventions" step has something real to read. We use a 2026-dated
// MADR-style file because that's the skill's documented default; if the
// skill correctly discovers and matches the convention, the new ADR
// should land alongside it with the same date-prefixed shape.

import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import scenario, { judgeAgent, userSimulatorAgent } from "@langwatch/scenario";
import { describe, it, expect } from "vitest";

import { ClaudeCodeAdapter } from "./lib/claude-code-adapter.ts";

const PLUGIN_DIR = new URL("../../", import.meta.url).pathname;

const SEED_ADR = `---
status: accepted
date: 2026-01-15
---

# 20260115 - use postgres for the events table

## Context and Problem Statement

We needed a durable store for outbound webhook events. Options were
Postgres (existing infra), DynamoDB (already in account), and Kafka
(strongest delivery story).

## Decision Drivers

- ops already runs Postgres; no new on-call surface
- 90-day retention fits comfortably in a single table
- replay-by-tenant is rare but must be possible

## Considered Options

1. Postgres table with a partial index on \`pending\`
2. DynamoDB stream with TTL
3. Kafka topic with a compacted state store

## Decision Outcome

Postgres. See [specs/webhook-events.feature](../../specs/webhook-events.feature)
for the behavioural contract.
`;

describe("/plan-change", () => {
  it(
    "drives an architectural discussion and writes ADR + spec cross-linked",
    async () => {
      const cwd = await mkdtemp(join(tmpdir(), "scenario-plan-change-"));
      try {
        // Seed the fixture with the conventions Phase 0 expects to discover:
        // an existing ADR in docs/adr/ (date-prefixed, MADR-style) and an
        // empty specs/ directory. Without seeding, the skill defaults to its
        // built-in templates — which still works, but we want to verify it
        // can match an existing convention when one is present.
        await mkdir(join(cwd, "docs", "adr"), { recursive: true });
        await mkdir(join(cwd, "specs"), { recursive: true });
        await writeFile(
          join(cwd, "docs", "adr", "20260115-postgres-events-table.md"),
          SEED_ADR,
          "utf8",
        );

        const agent = new ClaudeCodeAdapter({
          cwd,
          pluginDir: PLUGIN_DIR,
          slashCommand: "/plan-change",
          // Lock to plan-change so the agent doesn't get sidetracked into
          // /write-adr or /write-spec via auto-discovery on natural-language
          // phrasing in the simulator's turns.
          skills: ["plan-change"],
        });

        const result = await scenario.run({
          setId: "planning-skills",
          name: "in-house feature flag service",
          description:
            "An engineer wants to add a feature-flag service to their " +
            "platform. They've roughly decided to build it in-house but " +
            "haven't articulated alternatives, the forcing function, or " +
            "edge cases. /plan-change should pull those out, state the " +
            "plan back, and write both an ADR and a Gherkin spec.",
          agents: [
            agent,
            userSimulatorAgent({
              persona:
                "You are a platform engineer at a B2B SaaS company. You " +
                "open with: 'I want to plan out a feature-flag service. " +
                "I'm thinking we build it in-house.' If asked, you reveal: " +
                "(a) the forcing function is that LaunchDarkly's pricing " +
                "jumped 4x at renewal and finance gave you 8 weeks to " +
                "have a migration plan, (b) you considered LaunchDarkly " +
                "(too expensive now), Unleash self-hosted (ops doesn't " +
                "want another service to run), and Statsig (data residency " +
                "concerns — your enterprise customers need EU-only), " +
                "(c) the users are internal product engineers flipping " +
                "flags via a small web UI, (d) golden path: PM creates a " +
                "flag, gradually rolls out 1% → 10% → 100%, (e) edge cases " +
                "you care about: flag evaluation when the service is down " +
                "(fail-closed default), audit log of who flipped what, " +
                "and tenant-scoped flag visibility. You don't volunteer " +
                "any of this unprompted — the agent has to ask. Keep " +
                "replies to 2-3 sentences. When the agent states a plan " +
                "back and asks for sign-off, agree. When it shows drafts, " +
                "approve them after one minor tweak ('can you also note " +
                "that we'll add OpenFeature compatibility later?'). End " +
                "the conversation once both files are written.",
            }),
            judgeAgent({
              criteria: [
                "The agent extracted the decision shape (what's being decided, what the alternatives were, and why each was rejected) before drafting anything",
                "The agent surfaced the forcing function (the LaunchDarkly pricing change + 8-week deadline) explicitly",
                "The agent asked about edge cases (failure modes, audit, multi-tenancy) rather than only the golden path",
                "The agent stated the plan back to the user (what ADR + what spec) BEFORE writing files, and only wrote after sign-off",
                "The agent wrote BOTH an ADR file AND a Gherkin .feature file, not just one",
                "The agent cross-linked the two documents (ADR references the spec, spec references the ADR)",
              ],
            }),
          ],
          maxTurns: 14,
        });

        expect(result.success, JSON.stringify(result, null, 2)).toBe(true);

        // Post-conversation filesystem assertions: the conversational judge
        // can be fooled by a confident "I wrote the files" without the
        // writes actually happening. Verify on disk.
        const adrFiles = (await readdir(join(cwd, "docs", "adr")))
          .filter((f) => f.endsWith(".md"))
          .filter((f) => f !== "20260115-postgres-events-table.md");
        const specFiles = (await readdir(join(cwd, "specs")))
          .filter((f) => f.endsWith(".feature"));

        expect(
          adrFiles.length,
          `expected at least 1 new ADR in docs/adr/, found ${adrFiles.length}: ${adrFiles.join(", ")}`,
        ).toBeGreaterThanOrEqual(1);
        expect(
          specFiles.length,
          `expected at least 1 .feature spec in specs/, found ${specFiles.length}: ${specFiles.join(", ")}`,
        ).toBeGreaterThanOrEqual(1);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
    300_000,
  );
});
