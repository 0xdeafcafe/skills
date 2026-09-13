import { expect, it } from "vitest";
import { makeFixture } from "./lib/fixture.ts";
import { runScenario } from "./lib/run-scenario.ts";

const PROMPT =
  "Read through all twelve files in sources/ and summarise the owners and retention policy. Use bounded Haiku or Sonnet reading workers for this pass. Save READING.md with a source-by-source coverage ledger and citations for the important findings. Identify any conflict between sources without selecting a policy on my behalf. Preserve the sources and repository history.";

function buildSources(): Record<string, string> {
  const sources: Record<string, string> = {};

  for (let sourceNumber = 1; sourceNumber <= 12; sourceNumber++) {
    const id = String(sourceNumber).padStart(2, "0");
    const lines = [
      `# Source ${id}: region review`,
      `Source ID: SRC-${id}.`,
      "Status: historical draft, no source supersedes another without review.",
    ];

    for (let batch = 1; batch <= 30; batch++) {
      lines.push(
        `\n## Batch ${batch}\nRegion ${id} processes batch ${batch} after validation. The batch limit is ${sourceNumber * 100 + batch} records. Its audit label is R${id}-B${batch}. Validation and retry remain separate recorded operations; completion of one does not imply completion of the other.`,
      );
    }

    const retention = sourceNumber % 2 === 0 ? 30 : 14;
    lines.splice(
      22,
      0,
      `\nThe unique region owner is owner-${id}. Retention is ${retention} days. This value requires confirmation before implementation.`,
    );
    sources[`sources/source-${id}.md`] = `${lines.join("\n")}\n`;
  }

  return sources;
}

it("routes broad reading to bounded workers and reconciles coverage", async () => {
  const fixture = await makeFixture("broad-reading");
  const sources = buildSources();

  for (const [path, content] of Object.entries(sources)) {
    await fixture.write(path, content);
  }
  await fixture.git("add", ".");
  await fixture.git("commit", "-qm", "source corpus");
  const originalHead = await fixture.git("rev-parse", "HEAD");

  await runScenario({
    name: "broad context ingestion",
    fixture,
    source: "v2/scenarios/reading.scenario.test.ts",
    artifacts: ["READING.md"],
    kind: "tool-action",
    delegation: true,
    turns: [
      {
        prompt: PROMPT,
        verify: async (coordinator) => {
          const reading = await fixture.read("READING.md");

          for (let sourceNumber = 1; sourceNumber <= 12; sourceNumber++) {
            const id = String(sourceNumber).padStart(2, "0");
            expect(reading).toContain(`source-${id}.md`);
            expect(reading).toContain(`owner-${id}`);
          }
          expect(reading).toMatch(/14/);
          expect(reading).toMatch(/30/);
          expect(reading).toMatch(/conflict|contradict|inconsisten|unresolved/i);

          const delegatedModels = coordinator.actions
            .filter((action) => action.name === "Agent")
            .flatMap((action) => {
              if (typeof action.input !== "object" || action.input === null) return [];
              if (!("model" in action.input) || typeof action.input.model !== "string") return [];
              return [action.input.model];
            });
          expect(delegatedModels.length).toBeGreaterThan(0);
          expect(delegatedModels.every((model) => model === "haiku" || model === "sonnet")).toBe(
            true,
          );

          for (const [path, content] of Object.entries(sources)) {
            expect(await fixture.read(path)).toBe(content);
          }
          expect(await fixture.git("rev-parse", "HEAD")).toBe(originalHead);
        },
      },
    ],
  });
});
