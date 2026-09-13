import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { loadRecordedCorpus } from "../fixtures/io.ts";
import { deriveMutation } from "../fixtures/evidence.ts";
import { hasManufacturedContrast } from "../fixtures/voice.ts";

const corpus = fileURLToPath(new URL("../fixtures/recorded/", import.meta.url));

it("detects the rejected pivot across a real voice response and an explicit mutation", async () => {
  const recordings = await loadRecordedCorpus(corpus);
  const voice = recordings.find(
    (fixture) =>
      fixture.context.caseId === "voice-alex-tone-of-voice" &&
      fixture.evidence.git?.files?.["DRAFTS.md"],
  );
  expect(voice, "a successful Alex voice recording is required").toBeDefined();
  const draft = voice!.evidence.git!.files!["DRAFTS.md"]!;
  expect(hasManufacturedContrast(draft)).toBe(false);
  const mutated = deriveMutation(
    voice!,
    "prepend the contrast Alex explicitly rejected",
    (copy) => {
      copy.evidence.git!.files!["DRAFTS.md"] =
        `The rewrite is not the interesting bit. The interesting bit is that queries survive.\n${draft}`;
    },
  );
  expect(hasManufacturedContrast(mutated.evidence.git!.files!["DRAFTS.md"]!)).toBe(true);
});

it("keeps factual before/after explanations and negation usable", () => {
  expect(
    hasManufacturedContrast(
      "Before the fix, timeout cleared the query. After the fix, retry preserves it. It has not shipped.",
    ),
  ).toBe(false);
  expect(hasManufacturedContrast("This isn't about the rewrite. It's about retention.")).toBe(true);
});
