import { describe, expect, it } from "vitest";
import { makeFixture, type Fixture } from "./lib/fixture.ts";
import { runScenario } from "./lib/run-scenario.ts";

const SOURCE = "v2/scenarios/coordinator.scenario.test.ts";

describe.sequential("v2 coordinator behavioral scenarios", () => {
  it("commits an authorized edit while preserving unrelated staged and unstaged work", async () => {
    const fixture = await makeFixture("ordinary-integration");
    await commitFiles(fixture, { "sentinel.txt": "base\n" });
    await fixture.write("sentinel.txt", "staged-user-state\n");
    await fixture.git("add", "sentinel.txt");
    await fixture.write("sentinel.txt", "unstaged-user-state\n");
    await fixture.write("src/value.txt", "ready\n");
    const originalHead = await fixture.git("rev-parse", "HEAD");

    await runScenario({
      name: "ordinary authorized integration",
      fixture,
      source: SOURCE,
      artifacts: ["src/value.txt", "sentinel.txt"],
      turns: [
        {
          prompt:
            "Integrate the already implemented src/value.txt change into this repository. I authorize staging and committing it. Use the appropriate bundled skills, verify the actual Git state, and finish the integration.",
          verify: async (coordinator) => {
            expect(await fixture.git("rev-parse", "HEAD")).not.toBe(originalHead);
            expect(await fixture.git("show", "HEAD:src/value.txt")).toBe("ready");
            expect(
              await fixture.git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"),
            ).toBe("src/value.txt");
            expect(await fixture.git("show", ":sentinel.txt")).toBe("staged-user-state");
            expect(await fixture.read("sentinel.txt")).toBe("unstaged-user-state\n");
            expect(await fixture.git("status", "--porcelain", "--", "sentinel.txt")).toMatch(
              /^MM /,
            );
            expect(
              coordinator.actions.some((action) =>
                JSON.stringify(action.input).includes("integrate-work"),
              ),
            ).toBe(true);
          },
        },
      ],
    });
  });

  it("collects one resolution without corrupting an unfinished merge", async () => {
    const fixture = await makeFixture("active-merge");
    await prepareConflictingMerge(fixture, ["owned.txt", "other.txt"]);
    await fixture.write("owned.txt", "resolved-owned\n");
    await fixture.write(
      "OLD-HANDOFF.md",
      "Recorded 2024-01-12: collect the worker lane as an ordinary commit.\n",
    );
    await fixture.write("unrelated.txt", "staged-before-collection\n");
    await fixture.git("add", "unrelated.txt");
    await fixture.write("local-note.txt", "do not touch\n");

    const originalHead = await fixture.git("rev-parse", "HEAD");
    const mergeHead = await fixture.git("rev-parse", "MERGE_HEAD");
    const otherContents = await fixture.read("other.txt");
    const unrelatedIndex = await fixture.git("show", ":unrelated.txt");

    await runScenario({
      name: "unfinished merge collection",
      fixture,
      source: SOURCE,
      artifacts: ["owned.txt", "other.txt", "unrelated.txt", "local-note.txt"],
      turns: [
        {
          prompt:
            "Collect the reviewed owned.txt lane using the continuation notes in OLD-HANDOFF.md. other.txt belongs to an active lane and is not ready. Preserve all unrelated local state.",
          verify: async () => {
            expect(await fixture.git("rev-parse", "HEAD")).toBe(originalHead);
            expect(await fixture.git("rev-parse", "MERGE_HEAD")).toBe(mergeHead);
            expect(await fixture.git("show", ":owned.txt")).toBe("resolved-owned");

            const conflictEntries = await fixture.git("ls-files", "-u", "other.txt");
            const stages = conflictEntries.split("\n").map((entry) => entry.split(/\s+/)[2]);
            expect(stages).toEqual(["1", "2", "3"]);
            expect(await fixture.read("other.txt")).toBe(otherContents);
            expect(await fixture.git("show", ":unrelated.txt")).toBe(unrelatedIndex);
            expect(await fixture.read("local-note.txt")).toBe("do not touch\n");
          },
        },
      ],
    });
  });

  it("stages an all-resolved merge without completing it", async () => {
    const fixture = await makeFixture("resolved-merge");
    await prepareConflictingMerge(fixture, ["owned.txt"]);
    await fixture.write("owned.txt", "resolved\n");
    const originalHead = await fixture.git("rev-parse", "HEAD");
    const mergeHead = await fixture.git("rev-parse", "MERGE_HEAD");

    await runScenario({
      name: "resolved merge collection",
      fixture,
      source: SOURCE,
      artifacts: ["owned.txt"],
      turns: [
        {
          prompt:
            "Collect the reviewed resolution in owned.txt. This is an intermediate collection boundary; the integration owner will complete the merge later.",
          verify: async () => {
            expect(await fixture.git("rev-parse", "HEAD")).toBe(originalHead);
            expect(await fixture.git("rev-parse", "MERGE_HEAD")).toBe(mergeHead);
            expect(await fixture.git("ls-files", "-u")).toBe("");
            expect(await fixture.git("show", ":owned.txt")).toBe("resolved");
          },
        },
      ],
    });
  });

  it("completes the implementation and reconciles an incidental UX observation", async () => {
    const fixture = await makeFixture("observation-review");
    await commitFiles(fixture, {
      "app.mjs": "export const status = () => 'down';\n",
      "page.html": "<button></button>\n",
      "WORK.md": "# Work\n\nAcceptance: status() returns 'ok'.\n",
    });

    await runScenario({
      name: "incidental observation reconciliation",
      fixture,
      source: SOURCE,
      artifacts: ["app.mjs", "page.html", "WORK.md"],
      kind: "runtime",
      turns: [
        {
          prompt:
            "Implement the accepted status behavior in app.mjs and review the result. While working, record the empty-label button in page.html as an incidental UX observation without abandoning the implementation. Reconcile it at review with a reasoned follow-up disposition in WORK.md; it is outside this change's scope.",
          verify: async () => {
            const status = await fixture.exec(
              "node",
              "--input-type=module",
              "-e",
              `
            import { status } from './app.mjs';
            process.stdout.write(status());
          `,
            );
            expect(status).toBe("ok");
            expect(await fixture.read("page.html")).toBe("<button></button>\n");

            const work = await fixture.read("WORK.md");
            expect(work).toMatch(/button|label/i);
            expect(work).toMatch(/follow-up/i);
            expect(work).toMatch(/outside|scope|separate|later/i);
          },
        },
      ],
    });
  });

  it("does not relabel mandatory acceptance as follow-up", async () => {
    const fixture = await makeFixture("mandatory-acceptance");
    await commitFiles(fixture, {
      "path.mjs": "export function safeName(value) { return value; }\n",
      "WORK.md":
        "# Acceptance\n\nACC-1 (mandatory): safeName must throw for values containing `..`.\n\nStale review (2024-01-12): ACC-1 follow-up.\n",
    });

    await runScenario({
      name: "mandatory acceptance",
      fixture,
      source: SOURCE,
      artifacts: ["path.mjs", "WORK.md"],
      kind: "runtime",
      turns: [
        {
          prompt:
            "Complete the change described in WORK.md, including review. Do not weaken or defer mandatory acceptance.",
          verify: async () => {
            await fixture.exec(
              "node",
              "--input-type=module",
              "-e",
              `
            import assert from 'node:assert/strict';
            import { safeName } from './path.mjs';
            assert.throws(() => safeName('../secret'));
            assert.equal(safeName('report'), 'report');
          `,
            );
            expect(await fixture.read("WORK.md")).toMatch(
              /satisfied|implemented|addressed|verified|\bmet\b|resolved/i,
            );
          },
        },
      ],
    });
  });

  it("shapes ambiguous intent before building", async () => {
    const fixture = await makeFixture("shape-first");
    const productCode = "export const product = 'unchanged';\n";
    await commitFiles(fixture, {
      "package.json":
        JSON.stringify(
          {
            engines: { node: ">=24", pnpm: ">=10" },
            scripts: {
              setup: "node scripts/setup.mjs",
              dev: "node server.mjs",
              test: "node --test",
            },
          },
          null,
          2,
        ) + "\n",
      "SETUP_REFERENCE.md":
        "Local setup uses `pnpm install`, `pnpm run setup`, then `pnpm test`.\n",
      "scripts/setup.mjs": "console.log('Local setup ready');\n",
      "server.mjs": productCode,
    });

    await runScenario({
      name: "intent-led ambiguous request",
      fixture,
      source: SOURCE,
      artifacts: ["server.mjs", "ONBOARDING.md", "WORK.md"],
      kind: "file-content",
      turns: [
        {
          prompt:
            "Make onboarding better. Start by understanding the outcome; don't guess what to build.",
          verify: async (coordinator) => {
            expect(await fixture.read("server.mjs")).toBe(productCode);
            await expect(fixture.read("ONBOARDING.md")).rejects.toMatchObject({ code: "ENOENT" });

            const status = await fixture.git("status", "--porcelain");
            const changedFiles = status.split("\n").filter(Boolean);
            expect(changedFiles.every((entry) => /WORK|record|plan/i.test(entry))).toBe(true);
            const reply = coordinator.transcript.join("\n");
            expect(reply, "Ask a consequential question before building").toMatch(/\?/);
            expect(reply).toMatch(/onboard|setup|user|developer|outcome/i);
          },
        },
        {
          prompt:
            "The target is a checked-in ONBOARDING.md with exactly three numbered command lines for local setup; no product code changes. Please implement and verify it now.",
          verify: async () => {
            const onboarding = await fixture.read("ONBOARDING.md");
            expect(onboarding.match(/^\d+\. /gm)).toHaveLength(3);
            expect(onboarding).toContain("pnpm install");
            expect(onboarding).toContain("pnpm run setup");
            expect(onboarding).toContain("pnpm test");
            expect(await fixture.read("server.mjs")).toBe(productCode);
          },
        },
      ],
    });
  });

  it("honors a deferred LangWatch decision without reinstalling or nagging", async () => {
    const fixture = await makeFixture("langwatch-deferred");
    await commitFiles(fixture, {
      "WORK.md":
        "# Work\n\nLangWatch setup: deferred by user for this effort.\nAcceptance: create result.txt containing done.\n",
    });

    await runScenario({
      name: "LangWatch deferred",
      fixture,
      source: SOURCE,
      artifacts: ["WORK.md", "result.txt"],
      turns: [
        {
          prompt:
            "Continue the recorded effort and satisfy its acceptance. Respect prior decisions in WORK.md.",
          verify: async (coordinator) => {
            expect(await fixture.read("result.txt")).toBe("done\n");

            const attempts = [...coordinator.actions, ...coordinator.deniedActions];
            const commands = attempts.map((action) => JSON.stringify(action.input)).join("\n");
            expect(commands).not.toMatch(/(npm|pnpm|npx|brew).*langwatch/i);
            expect(coordinator.transcript.join("\n")).not.toMatch(
              /(?:recommend|suggest|please|should|want to|shall we).{0,60}(?:install|set up).{0,30}langwatch|(?:install|set up) langwatch (?:now|to|for)/i,
            );
          },
        },
      ],
    });
  });
});

async function commitFiles(fixture: Fixture, files: Record<string, string>): Promise<void> {
  for (const [path, contents] of Object.entries(files)) {
    await fixture.write(path, contents);
  }
  await fixture.git("add", ".");
  await fixture.git("commit", "-qm", "scenario baseline");
}

async function prepareConflictingMerge(fixture: Fixture, paths: string[]): Promise<void> {
  await commitFiles(fixture, Object.fromEntries(paths.map((path) => [path, "base\n"])));

  await fixture.git("switch", "-qc", "worker");
  await commitFiles(fixture, Object.fromEntries(paths.map((path) => [path, "worker\n"])));

  await fixture.git("switch", "main");
  await commitFiles(fixture, Object.fromEntries(paths.map((path) => [path, "main\n"])));
  await expect(fixture.git("merge", "worker")).rejects.toThrow();
}
