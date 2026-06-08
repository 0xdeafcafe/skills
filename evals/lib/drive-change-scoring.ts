// Score a parsed Phase 7 report against an expected.drive_change.json spec.
//
// Mirrors lib/scoring.ts's shape (greedy matcher + per-spec checks) so the
// runner can reuse the same metric vocabulary across tier-2 and tier-3.
// Tier-3 adds reviewer + mode + specialists checks that don't exist at the
// per-reviewer level.

import type { DriveChangeFinding, DriveChangeMode, DriveChangeReport } from "./drive-change-parser.ts";

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

export type DriveChangeSpecScore = {
  readonly $match: string;
  readonly matched_index: number | null;
  readonly checks: Readonly<Record<string, boolean>>;
  readonly all_passed: boolean;
};

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

const matches = (pattern: string | undefined, value: string | undefined): boolean => {
  if (pattern === undefined) return true;
  if (value === undefined) return false;
  try {
    const inline = /^\(\?([imsu]+)\)/.exec(pattern);
    const flags = inline?.[1] ?? "";
    const body = inline ? pattern.slice(inline[0].length) : pattern;
    return new RegExp(body, flags).test(value);
  } catch {
    return false;
  }
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

const countTruthy = (record: Readonly<Record<string, boolean>>): number =>
  Object.values(record).filter(Boolean).length;

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

  const used = new Set<number>();
  const per_spec: DriveChangeSpecScore[] = [];

  for (const spec of expected.findings) {
    let best: { index: number; checks: Readonly<Record<string, boolean>>; passed: number } | null = null;
    for (let i = 0; i < report.findings.length; i++) {
      if (used.has(i)) continue;
      const actual = report.findings[i];
      if (actual === undefined) continue;
      const checks = checkSpecAgainst(spec, actual);
      const passed = countTruthy(checks);
      if (best === null || passed > best.passed) best = { index: i, checks, passed };
    }

    if (best === null) {
      per_spec.push({ $match: spec.$match, matched_index: null, checks: {}, all_passed: false });
      continue;
    }
    used.add(best.index);
    per_spec.push({
      $match: spec.$match,
      matched_index: best.index,
      checks: best.checks,
      all_passed:
        Object.keys(best.checks).length > 0 && Object.values(best.checks).every(Boolean),
    });
  }

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
