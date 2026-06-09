// Score a parsed Phase 7 report against an expected.drive_change.json spec.
//
// Mirrors lib/scoring.ts's shape (greedy matcher + per-spec checks) so the
// runner can reuse the same metric vocabulary across tier-2 and tier-3.
// Tier-3 adds reviewer + mode + specialists checks that don't exist at the
// per-reviewer level. The greedy matcher itself lives in lib/match.ts.

import type { DriveChangeFinding, DriveChangeMode, DriveChangeReport } from "./drive-change-parser.ts";
import { greedyMatchSpecs, matches, type SpecMatch } from "./match.ts";

export type ExpectedDriveChangeSpec = {
  readonly $match: string;
  readonly severity?: string;
  readonly severity_in?: readonly string[];
  readonly reviewer?: string;
  readonly reviewer_in?: readonly string[];
  readonly file?: string;
  readonly summary_pattern?: string;
};

export type ExpectedDriveChange = {
  readonly mode?: DriveChangeMode;
  readonly expected_specialists_run?: readonly string[];
  readonly count_min?: number;
  readonly count_max?: number;
  readonly findings: readonly ExpectedDriveChangeSpec[];
};

export type DriveChangeSpecScore = SpecMatch;

export type DriveChangeScore = {
  readonly mode_match: boolean;
  readonly specialists_match: boolean;
  readonly count_in_range: boolean;
  readonly per_spec: readonly DriveChangeSpecScore[];
  readonly expected_findings_matched: number; // 0..1 fraction
  readonly extra_findings_count: number;
  readonly missing_specs_count: number;
  readonly unparsed_lines_count: number;
  readonly overall_pass: boolean;
};

const checkSpecAgainst = (
  spec: ExpectedDriveChangeSpec,
  actual: DriveChangeFinding,
): Readonly<Record<string, boolean>> => {
  const checks: Record<string, boolean> = {};
  if (spec.severity !== undefined) checks.severity_match = actual.severity === spec.severity;
  if (spec.severity_in !== undefined) {
    checks.severity_match = spec.severity_in.includes(actual.severity);
  }
  if (spec.reviewer !== undefined) checks.reviewer_match = actual.reviewer === spec.reviewer;
  if (spec.reviewer_in !== undefined) {
    checks.reviewer_match = spec.reviewer_in.includes(actual.reviewer);
  }
  if (spec.file !== undefined) checks.file_match = actual.file === spec.file;
  if (spec.summary_pattern !== undefined) {
    checks.summary_pattern_match = matches(spec.summary_pattern, actual.summary);
  }
  return checks;
};

export const scoreDriveChange = (
  report: DriveChangeReport,
  expected: ExpectedDriveChange,
): DriveChangeScore => {
  const mode_match = expected.mode === undefined || report.mode === expected.mode;

  const specialists_match = (() => {
    if (!expected.expected_specialists_run) return true;
    const present = new Set(report.specialists);
    return expected.expected_specialists_run.every((s) => present.has(s));
  })();

  const count_in_range =
    (expected.count_min === undefined || report.findings.length >= expected.count_min) &&
    (expected.count_max === undefined || report.findings.length <= expected.count_max);

  const { per_spec, used } = greedyMatchSpecs(
    expected.findings,
    report.findings,
    checkSpecAgainst,
  );

  const matched_count = per_spec.filter((s) => s.all_passed).length;
  const expected_findings_matched =
    expected.findings.length === 0 ? 1 : matched_count / expected.findings.length;

  return {
    mode_match,
    specialists_match,
    count_in_range,
    per_spec,
    expected_findings_matched,
    extra_findings_count: report.findings.length - used.size,
    missing_specs_count: per_spec.filter((s) => s.matched_index === null).length,
    unparsed_lines_count: report.unparsed_lines.length,
    overall_pass:
      mode_match &&
      specialists_match &&
      count_in_range &&
      expected_findings_matched === 1 &&
      report.unparsed_lines.length === 0,
  };
};
