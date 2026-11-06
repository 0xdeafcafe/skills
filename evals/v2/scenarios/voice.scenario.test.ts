import { expect, it } from "vitest";
import { voiceDraftFindings } from "../fixtures/voice.ts";
import { makeFixture } from "./lib/fixture.ts";
import { loadedSkill } from "./lib/outcomes.ts";
import { runScenario } from "./lib/run-scenario.ts";

const skills = ["tone-of-voice", "alex-tone-of-voice"] as const;

function promptFor(skill: (typeof skills)[number]): string {
  const voice =
    skill === "alex-tone-of-voice" ? " in my voice" : ", it goes out from the team, not me";

  return `draft this update${voice}: slack, twitter, a whatsapp to Sam, a blog intro and a blocking code review comment.
facts: search UI drops the typed query when a search times out. agreed fix keeps the query and lets them retry it. not shipped, no dates or numbers yet.
put them in DRAFTS.md under ## Slack, ## Twitter/X, ## WhatsApp, ## Blog, ## Code review`;
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

          expect(loadedSkill(coordinator.actions, skill)).toBe(true);
          expect(await fixture.git("rev-parse", "HEAD")).toBe(originalHead);
        },
      },
    ],
  });
});
