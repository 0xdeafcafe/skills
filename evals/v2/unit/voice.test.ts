import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadRecordedCorpus } from "../fixtures/io.ts";
import { deriveMutation } from "../fixtures/evidence.ts";
import {
  americanSpellings,
  hasManufacturedContrast,
  stockPhrases,
  voiceDraftFindings,
} from "../fixtures/voice.ts";

const corpus = fileURLToPath(new URL("../fixtures/recorded/", import.meta.url));

async function recordedDraft(caseId: string) {
  const recordings = await loadRecordedCorpus(corpus);
  const voice = recordings.find(
    (fixture) => fixture.context.caseId === caseId && fixture.evidence.git?.files?.["DRAFTS.md"],
  );
  expect(voice, `a successful ${caseId} recording is required`).toBeDefined();
  return { fixture: voice!, draft: voice!.evidence.git!.files!["DRAFTS.md"]! };
}

const cleanDraft = `## Slack

Search drops the query after a timeout. The agreed fix keeps it so people can retry the same search. Not shipped, no date yet.

## Twitter/X

Fixing search: a timeout currently wipes your query. The fix keeps it so you can retry. Not out yet.

## WhatsApp

Sam, the search timeout fix keeps the query and lets them retry it. Not shipped yet.

## Blog

Hit a timeout in search and your query disappears.

We've agreed a fix that keeps the query so you can retry. It hasn't shipped.

## Code review

Blocking: on timeout this clears the query. The behaviour must keep it so the user can retry the same search.
`;

describe("voice draft findings", () => {
  it("accepts a grounded draft in either voice", () => {
    expect(voiceDraftFindings(cleanDraft, false)).toEqual([]);
    expect(voiceDraftFindings(cleanDraft, true)).toEqual([]);
  });

  it("rejects em dashes in both voices", () => {
    const dashed = cleanDraft.replace("Not shipped, no date yet.", "Not shipped — no date yet.");
    expect(voiceDraftFindings(dashed, false)).toEqual(["draft contains an em dash"]);
    expect(voiceDraftFindings(dashed, true)).toEqual(["draft contains an em dash"]);
    const hyphenated = cleanDraft.replace(
      "Not shipped, no date yet.",
      "Not shipped - no date yet.",
    );
    expect(voiceDraftFindings(hyphenated, false)).toEqual([]);
  });

  it.each([
    ["delve", "Let me delve into the timeout."],
    ["leverage as a verb", "We leverage the cache to keep the query."],
    ["leverage as a verb", "The fix is leveraging local state."],
    ["seamless", "Retry is now seamless."],
    ["seamless", "It retries seamlessly."],
    ["robust", "A robust fix for timeouts."],
    ["unlock", "This unlocks faster retries."],
    ["harness as a verb", "We harness the browser history."],
    ["harness as a verb", "By harnessing session storage, the query survives."],
    ["game-changer", "A game-changer for search."],
    ["game-changer", "It is game changing."],
    ["groundbreaking", "A groundbreaking retry flow."],
    ["superpower", "Retry is your new superpower."],
    ["let's dive in", "Let's dive in."],
    ["let's dive in", "Lets dive into the bug."],
    ["connective filler", "The query is kept. Furthermore, retry works."],
    ["connective filler", "Moreover, it has not shipped."],
    ["connective filler", "\n- Additionally, retry reuses the query."],
    ["I hope this finds you well", "Hi Sam, I hope this message finds you well."],
    ["thanks in advance", "Thanks in advance for the review."],
  ])("flags %s in %j", (label, text) => {
    expect(stockPhrases(text)).toContain(label);
    const findings = voiceDraftFindings(cleanDraft.replace("Not out yet.", text), false);
    expect(findings).toContain(`stock LLM phrasing: ${label}`);
  });

  it.each([
    "The fix gives us leverage over the retry path.",
    "The test harness covers timeouts.",
    "Add a harness for the retry case.",
    "The query additionally survives a reload, and moreover, it is cached.",
    "We dove into the logs.",
    "Thanks for the review.",
    "Locking the query keeps it.",
  ])("does not flag ordinary usage %j", (text) => {
    expect(stockPhrases(text)).toEqual([]);
  });

  it("flags the not-just pivot as manufactured contrast", () => {
    expect(hasManufacturedContrast("It's not just a bug fix, it's a new search model.")).toBe(true);
    expect(hasManufacturedContrast("This isn't just retry; it is persistence.")).toBe(true);
    expect(hasManufacturedContrast("It's just a timeout bug, and it's not shipped.")).toBe(false);
    expect(
      voiceDraftFindings(
        cleanDraft.replace("Not out yet.", "It's not just a fix, it's a promise."),
        false,
      ),
    ).toEqual(["manufactured contrast"]);
  });

  it("flags American spellings only for Alex", () => {
    const american = cleanDraft.replace(
      "Not out yet.",
      "We realized the behavior was off, analyzed it, optimized the color and centered it.",
    );
    expect(americanSpellings(american)).toEqual([
      "realized",
      "behavior",
      "analyzed",
      "optimized",
      "color",
      "centered",
    ]);
    expect(voiceDraftFindings(american, false)).toEqual([]);
    expect(voiceDraftFindings(american, true)).toEqual([
      "American spelling: realized",
      "American spelling: behavior",
      "American spelling: analyzed",
      "American spelling: optimized",
      "American spelling: color",
      "American spelling: centered",
    ]);
    expect(
      americanSpellings(
        "We realised the behaviour, analysed it, optimised the colour, centred it.",
      ),
    ).toEqual([]);
  });

  it("requires Alex's code review to name the behaviour in British spelling", () => {
    const american = cleanDraft.replace("The behaviour must", "The behavior must");
    expect(voiceDraftFindings(american, true)).toEqual([
      "American spelling: behavior",
      "Alex code review does not name the behaviour",
    ]);
    const unnamed = cleanDraft.replace("The behaviour must", "It must");
    expect(voiceDraftFindings(unnamed, true)).toEqual([
      "Alex code review does not name the behaviour",
    ]);
    expect(voiceDraftFindings(unnamed, false)).toEqual([]);
  });
});

describe("recorded voice responses", () => {
  it("detects the rejected pivot across a real voice response and an explicit mutation", async () => {
    const { fixture, draft } = await recordedDraft("voice-alex-tone-of-voice");
    expect(hasManufacturedContrast(draft)).toBe(false);
    const mutated = deriveMutation(
      fixture,
      "prepend the contrast Alex explicitly rejected",
      (copy) => {
        copy.evidence.git!.files!["DRAFTS.md"] =
          `The rewrite is not the interesting bit. The interesting bit is that queries survive.\n${draft}`;
      },
    );
    expect(hasManufacturedContrast(mutated.evidence.git!.files!["DRAFTS.md"]!)).toBe(true);
  });

  it("reports what the historical recordings miss under the current voice rules", async () => {
    const general = await recordedDraft("voice-tone-of-voice");
    expect(voiceDraftFindings(general.draft, false)).toEqual(["draft contains an em dash"]);
    const alex = await recordedDraft("voice-alex-tone-of-voice");
    expect(voiceDraftFindings(alex.draft, true)).toEqual([
      "Alex code review does not name the behaviour",
    ]);
  });

  it("detects stock phrasing injected into a real response", async () => {
    const { fixture, draft } = await recordedDraft("voice-tone-of-voice");
    const mutated = deriveMutation(fixture, "inject stock LLM phrasing", (copy) => {
      copy.evidence.git!.files!["DRAFTS.md"] = draft.replace(
        "## Blog\n\n",
        "## Blog\n\nLet's dive in. This robust fix will unlock seamless retries.\n\n",
      );
    });
    expect(stockPhrases(mutated.evidence.git!.files!["DRAFTS.md"]!)).toEqual([
      "seamless",
      "robust",
      "unlock",
      "let's dive in",
    ]);
  });

  it("keeps factual before/after explanations and negation usable", () => {
    expect(
      hasManufacturedContrast(
        "Before the fix, timeout cleared the query. After the fix, retry preserves it. It has not shipped.",
      ),
    ).toBe(false);
    expect(hasManufacturedContrast("This isn't about the rewrite. It's about retention.")).toBe(
      true,
    );
  });
});
