// Parses /drive-change's Phase 7 unified report (see
// skills/drive-change/SKILL.md). Distinct from finding-format blocks:
// the orchestrator emits a structured but prose-shaped summary, not
// per-finding markdown blocks.
//
// Shape (from the skill's spec):
//
//   drive-change ran on <target>.
//
//     Mode: tiny | small | large
//     Slices: <N>                                       (large only)
//     Specialists: review-hygiene, review-code, ...
//
//   Findings, severity-ordered:
//
//     P0  <one-line>     auth/session.ts:147     (review-security)
//     P2  <one-line>     ...                     (review-hygiene)
//
// The parser is forgiving on whitespace + line ordering; it strictly
// expects the bracketed-tuple finding shape so misformatted findings
// fail loud (drift detection).

export type DriveChangeMode = "tiny" | "small" | "large";

export type DriveChangeFinding = {
  readonly severity: "P0" | "P1" | "P2" | "P3";
  readonly summary: string;
  readonly file: string;
  readonly line: number;
  readonly reviewer: string;
};

export type DriveChangeReport = {
  readonly mode: DriveChangeMode | null;
  readonly slices: number | null;
  readonly specialists: readonly string[];
  readonly findings: readonly DriveChangeFinding[];
  /** Lines the parser couldn't categorise; surfaced for drift visibility. */
  readonly unparsed_lines: readonly string[];
};

const MODE_PATTERN = /^\s*Mode:\s+(tiny|small|large)\s*$/i;
const SLICES_PATTERN = /^\s*Slices:\s+(\d+)\s*$/i;
const SPECIALISTS_PATTERN = /^\s*Specialists:\s+(.+?)\s*$/i;

const FINDING_PATTERN =
  /^\s*(?<severity>P[0-3])\s+(?<summary>.+?)\s+(?<file>\S+):(?<line>\d+)\s+\((?<reviewer>[a-z-]+)\)\s*$/;

const isLikelyFindingHeader = (line: string): boolean =>
  /^\s*findings\b/i.test(line);

export const parseDriveChangeReport = (report: string): DriveChangeReport => {
  const lines = report.split(/\r?\n/);

  let mode: DriveChangeMode | null = null;
  let slices: number | null = null;
  let specialists: string[] = [];
  const findings: DriveChangeFinding[] = [];
  const unparsed: string[] = [];

  let inFindingsSection = false;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim() === "") continue;

    const modeMatch = MODE_PATTERN.exec(line);
    if (modeMatch?.[1]) {
      mode = modeMatch[1].toLowerCase() as DriveChangeMode;
      continue;
    }

    const slicesMatch = SLICES_PATTERN.exec(line);
    if (slicesMatch?.[1]) {
      slices = Number.parseInt(slicesMatch[1], 10);
      continue;
    }

    const specialistsMatch = SPECIALISTS_PATTERN.exec(line);
    if (specialistsMatch?.[1]) {
      specialists = specialistsMatch[1]
        .split(",")
        .map((s) => s.trim().replace(/^\[|]$/g, ""))
        .filter((s) => s.length > 0);
      continue;
    }

    if (isLikelyFindingHeader(line)) {
      inFindingsSection = true;
      continue;
    }

    const findingMatch = FINDING_PATTERN.exec(line);
    if (findingMatch?.groups) {
      const g = findingMatch.groups;
      findings.push({
        severity: g.severity as DriveChangeFinding["severity"],
        summary: g.summary?.trim() ?? "",
        file: g.file ?? "",
        line: Number.parseInt(g.line ?? "0", 10),
        reviewer: g.reviewer ?? "",
      });
      continue;
    }

    if (inFindingsSection && /^\s*P[0-3]\b/.test(line)) {
      // Looks like a finding line but didn't match the strict pattern;
      // capture it for drift detection.
      unparsed.push(line);
    }
  }

  return {
    mode,
    slices,
    specialists,
    findings,
    unparsed_lines: unparsed,
  };
};
