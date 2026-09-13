const INTERESTING_BIT_PIVOT =
  /\b(?:is not|isn['’]t) the interesting (?:bit|part)[.!?]\s*(?:the )?interesting (?:bit|part) is\b/i;
const NOT_ABOUT_PIVOT =
  /\b(?:this|it) (?:is not|isn['’]t) about\b[^.!?\n]{1,120}[.;]\s*(?:this|it|it['’]s) (?:is )?about\b/i;

export function hasManufacturedContrast(text: string): boolean {
  return INTERESTING_BIT_PIVOT.test(text) || NOT_ABOUT_PIVOT.test(text);
}

const EXPECTED_HEADINGS = ["## Slack", "## Twitter/X", "## WhatsApp", "## Blog", "## Code review"];

// These checks cover the concrete synthetic brief. They do not score literary
// quality or claim to reproduce a person's voice.
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
  if (personal && draft.includes("—")) {
    findings.push("Alex draft contains an em dash");
  }
  if (hasManufacturedContrast(draft)) {
    findings.push("manufactured contrast rejected by Alex");
  }

  return findings;
}
