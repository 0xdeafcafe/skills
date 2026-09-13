import { expect, it } from "vitest";
import { voiceDraftFindings } from "../fixtures/voice.ts";
import { makeFixture } from "./lib/fixture.ts";
import { runScenario } from "./lib/run-scenario.ts";

const skills = ["tone-of-voice", "alex-tone-of-voice"] as const;

function promptFor(skill: (typeof skills)[number]): string {
  const voice =
    skill === "alex-tone-of-voice"
      ? "Write as Alex."
      : "Use a clear general voice; do not write as Alex.";

  return `Use the bundled ${skill} skill to draft five short versions of the same update. ${voice}
Known facts: the current search UI loses the entered query after a timeout. The agreed fix must preserve it and let the user retry the same query. The fix has not shipped. There are no confirmed release dates or performance figures.
Save DRAFTS.md with exactly these second-level headings: Slack, Twitter/X, WhatsApp, Blog, Code review. Slack is for an internal engineering channel. Twitter/X is a public post. WhatsApp is a private work message to a colleague, Sam. Blog is a two-paragraph opening. Code review is a blocking comment explaining the required behavior. Adapt the register to each channel, preserve the known facts, and invent no experiences, relationships, figures or release claims. Do not publish or commit anything.`;
}

it.each(skills)("uses %s across five channels without inventing facts", async (skill) => {
  const fixture = await makeFixture(`voice-${skill}`);
  const originalHead = await fixture.git("rev-parse", "HEAD");

  await runScenario({
    name: `voice: ${skill}`,
    fixture,
    source: "v2/scenarios/voice.scenario.test.ts",
    artifacts: ["DRAFTS.md"],
    kind: "file-content",
    turns: [
      {
        prompt: promptFor(skill),
        verify: async (coordinator) => {
          const draft = await fixture.read("DRAFTS.md");
          const personal = skill === "alex-tone-of-voice";
          expect(voiceDraftFindings(draft, personal)).toEqual([]);

          const loadedSkill = coordinator.actions.some((action) => {
            if (action.name !== "Read" && action.name !== "Skill") return false;
            return JSON.stringify(action.input).includes(skill);
          });
          expect(loadedSkill).toBe(true);
          expect(await fixture.git("rev-parse", "HEAD")).toBe(originalHead);
        },
      },
    ],
  });
});
