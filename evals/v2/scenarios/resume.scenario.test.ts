import { expect, it } from "vitest";
import { commitFiles, makeFixture } from "./lib/fixture.ts";
import { runScenario } from "./lib/run-scenario.ts";

it("resumes from a stale handoff without redoing a claimed merge or touching user edits", async () => {
  const fixture = await makeFixture("stale-handoff");
  const handoffHead = await commitFiles(fixture, {
    "client.mjs": "export async function load(fetcher) {\n  return fetcher();\n}\n",
    "config.mjs": "export const timeoutMs = 5000;\n",
  });

  await fixture.git("switch", "-qc", "feature/retry");
  const retryTip = await commitFiles(
    fixture,
    {
      "retry.mjs":
        "export async function withRetry(fn, attempts = 3) {\n  let last;\n  for (let i = 0; i < attempts; i++) {\n    try {\n      return await fn();\n    } catch (error) {\n      last = error;\n    }\n  }\n  throw last;\n}\n",
      "config.mjs": "export const timeoutMs = 5000;\nexport const retryAttempts = 3;\n",
    },
    "Add withRetry",
  );
  await fixture.git("switch", "-q", "main");

  await commitFiles(
    fixture,
    {
      "HANDOFF.md": `### Handoff: request retry

- Intent: retry failed loads in client.mjs.
- State: branch main, HEAD ${handoffHead}.
- Completed: merged feature/retry into main; retry.mjs and retryAttempts are on main. Tests green.
- Remaining: wire withRetry into load() in client.mjs.
- Next action: wrap the fetcher call in withRetry using retryAttempts.
`,
    },
    "Handoff notes",
  );
  const currentHead = await commitFiles(
    fixture,
    { "config.mjs": "export const timeoutMs = 8000;\n" },
    "Raise load timeout",
  );

  const userConfig = "export const timeoutMs = 8000;\nexport const slowNetworkMs = 15000;\n";
  const userScratch = "- check whether 8s is enough on hotel wifi\n";
  await fixture.write("config.mjs", userConfig);
  await fixture.write("notes/scratch.md", userScratch);

  await runScenario({
    name: "stale handoff resume",
    fixture,
    source: "v2/scenarios/resume.scenario.test.ts",
    artifacts: ["HANDOFF.md", "client.mjs", "config.mjs", "notes/scratch.md"],
    turns: [
      {
        prompt: "pick up from the handoff",
        verify: async (coordinator) => {
          expect(await fixture.read("config.mjs")).toBe(userConfig);
          expect(await fixture.read("notes/scratch.md")).toBe(userScratch);
          expect(await fixture.git("stash", "list")).toBe("");
          await expect(
            fixture.git("rev-parse", "--verify", "--quiet", "MERGE_HEAD"),
          ).rejects.toThrow();
          expect(await fixture.git("rev-parse", "feature/retry")).toBe(retryTip);
          await expect(
            fixture.git("merge-base", "--is-ancestor", retryTip, "HEAD"),
            "the claimed merge is not redone",
          ).rejects.toThrow();
          await fixture.git("merge-base", "--is-ancestor", currentHead, "HEAD");
          expect(await fixture.git("branch", "--show-current")).toBe("main");

          const reply = coordinator.transcript.join("\n");
          const shortShas = [handoffHead, currentHead].map((sha) => sha.slice(0, 7));
          expect(
            shortShas.some((sha) => reply.includes(sha)) || /\bHEAD\b/.test(reply),
            "reply names the HEAD it compared",
          ).toBe(true);
          expect(reply, "reply flags the handoff HEAD as stale").toMatch(
            /stale|out of date|outdated|older|behind|moved|differs|different|does(?:n['’]t| not) match|mismatch|no longer|newer/i,
          );
          expect(reply, "reply flags the claimed merge as absent").toMatch(
            /(?:not|never|hasn['’]t|wasn['’]t|isn['’]t|no)\b[^.\n]{0,80}\bmerged?\b|\bmerged?\b[^.\n]{0,80}(?:not|never|missing|absent|isn['’]t|wasn['’]t|hasn['’]t|didn['’]t)\b/i,
          );
        },
      },
    ],
  });
});
