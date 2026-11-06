const INTERESTING_BIT_PIVOT =
  /\b(?:is not|isn['’]t) the interesting (?:bit|part)[.!?]\s*(?:the )?interesting (?:bit|part) is\b/i;
const NOT_ABOUT_PIVOT =
  /\b(?:this|it) (?:is not|isn['’]t) about\b[^.!?\n]{1,120}[.;]\s*(?:this|it|it['’]s) (?:is )?about\b/i;
const NOT_JUST_PIVOT =
  /\b(?:it|this|that)(?:['’]s not| is not| isn['’]t) just\b[^.!?\n]{1,120}[,;.:]\s*(?:it|this|that)(?:['’]s| is)\b/i;

export function hasManufacturedContrast(text: string): boolean {
  return [INTERESTING_BIT_PIVOT, NOT_ABOUT_PIVOT, NOT_JUST_PIVOT].some((pattern) =>
    pattern.test(text),
  );
}

const OBJECT_START = "(?:the|a|an|our|your|their|its|this|that|these|those|it|them|existing)";
const VERB_LEAD = "(?:to|we|you|they|I|can|will|could|should|must|and|by|let['’]s)";

const STOCK_PHRASES: readonly (readonly [string, RegExp])[] = [
  ["delve", /\bdelv(?:e|es|ed|ing)\b/i],
  [
    "leverage as a verb",
    new RegExp(
      `\\bleverag(?:es|ed|ing)\\b|\\b${VERB_LEAD} leverage\\b|\\bleverage ${OBJECT_START}\\b`,
      "i",
    ),
  ],
  ["seamless", /\bseamless(?:ly)?\b/i],
  ["robust", /\brobust(?:ly|ness)?\b/i],
  ["unlock", /\bunlock(?:s|ed|ing)?\b/i],
  [
    "harness as a verb",
    new RegExp(
      `\\bharness(?:ed|ing)\\b|\\bharnesses ${OBJECT_START}\\b|\\b${VERB_LEAD} harness\\b`,
      "i",
    ),
  ],
  ["game-changer", /\bgame[- ]?chang\w*/i],
  ["groundbreaking", /\bground-?breaking\b/i],
  ["superpower", /\bsuper-?powers?\b/i],
  ["let's dive in", /\blet['’]?s dive in(?:to)?\b/i],
  [
    "connective filler",
    /(?:^|[.!?]["'”’)]?\s+|^\s*(?:[-*>]|\d+\.)\s+)(?:Furthermore|Moreover|Additionally),/m,
  ],
  ["I hope this finds you well", /\bI hope this (?:message |email |note )?finds you well\b/i],
  ["thanks in advance", /\bthanks? (?:you )?in advance\b/i],
];

const AMERICAN_SPELLING =
  /\b(?:behaviors?|behavioral(?:ly)?|optimiz(?:e|es|ed|ing|ation|ations)|colors?|colored|coloring|realiz(?:e|es|ed|ing|ation)|analyz(?:e|es|ed|ing|er|ers)|center(?:s|ed|ing)?)\b/gi;

export function stockPhrases(text: string): string[] {
  return STOCK_PHRASES.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

export function americanSpellings(text: string): string[] {
  return [...new Set((text.match(AMERICAN_SPELLING) ?? []).map((word) => word.toLowerCase()))];
}

const EXPECTED_HEADINGS = ["## Slack", "## Twitter/X", "## WhatsApp", "## Blog", "## Code review"];

export function voiceDraftFindings(draft: string, personal: boolean): string[] {
  const findings: string[] = [];
  const headings = draft.match(/^## .+$/gm) ?? [];

  if (headings.join("\n") !== EXPECTED_HEADINGS.join("\n")) {
    findings.push("five requested channel headings are required");
  }

  for (const section of draft.split(/^## .+$/m).slice(1)) {
    if (!/query|search/i.test(section)) {
      findings.push("channel omits the query context");
    }
    if (!/time[sd]?[ -]*out/i.test(section)) {
      findings.push("channel omits the timeout context");
    }
  }

  if (/\d+%|\d+ ?ms|(?:has|we have|we.ve) shipped|now live|released today/i.test(draft)) {
    findings.push("unprovided metric or release claim");
  }

  const codeReview = draft.split("## Code review")[1] ?? "";
  if (!/block|must|required|needs? to/i.test(codeReview)) {
    findings.push("review does not identify the required fix");
  }
  if (draft.includes("—")) {
    findings.push("draft contains an em dash");
  }
  if (hasManufacturedContrast(draft)) {
    findings.push("manufactured contrast");
  }
  for (const phrase of stockPhrases(draft)) {
    findings.push(`stock LLM phrasing: ${phrase}`);
  }
  if (personal) {
    for (const word of americanSpellings(draft)) {
      findings.push(`American spelling: ${word}`);
    }
    if (!/\bbehaviour\b/i.test(codeReview)) {
      findings.push("Alex code review does not name the behaviour");
    }
  }

  return findings;
}
