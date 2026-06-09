// Score actual findings (from /drive-change output) against expected.findings.json.
//
// Pure functions, no side effects. Each public function returns a structured
// score breakdown that the runner emits as individual evaluation.log() calls
// per metric. The runner stays thin; this module owns the comparison logic
// so we can unit-test it without a live Claude run.
//
// Matching strategy: greedy by file + category. For each expected spec, find
// an unused actual finding with matching file + category, score it against
// every other criterion. Findings unmatched by any spec count as "extra";
// specs unmatched by any actual count as "missing". The greedy loop itself
// lives in lib/match.ts — shared with drive-change-scoring.ts.

import { greedyMatchSpecs, matches, type SpecMatch } from "./match.ts";
import type { Finding } from "./schema.ts";

export type ExpectedSpec = {
  readonly $match: string;
  readonly severity?: string;
  readonly severity_in?: readonly string[];
  readonly category?: string;
  readonly file?: string;
  readonly line_min?: number;
  readonly line_max?: number;
  readonly summary_pattern?: string;
  readonly why_pattern?: string;
  readonly fix_pattern?: string;
  readonly fix_prefix?: string;
  readonly kind?: "individual" | "aggregate";
  readonly tool_pattern?: string;
  readonly files_affected_min?: number;
};

export type ExpectedFindings = {
  readonly findings: readonly ExpectedSpec[];
  readonly count_min?: number;
  readonly count_max?: number;
};

export type SpecScore = SpecMatch;

export type FixtureScore = {
  readonly per_spec: readonly SpecScore[];
  readonly count_in_range: boolean;
  readonly all_findings_schema_valid: boolean;
  readonly expected_findings_matched: number; // 0..1 fraction
  readonly extra_findings_count: number;
  readonly missing_specs_count: number;
  readonly overall_pass: boolean;
};

const checkSpecAgainstActual = (
  spec: ExpectedSpec,
  actual: Finding,
): Readonly<Record<string, boolean>> => {
  const checks: Record<string, boolean> = {};

  if (spec.severity !== undefined) checks.severity_match = actual.severity === spec.severity;
  if (spec.severity_in !== undefined) {
    checks.severity_match = spec.severity_in.includes(actual.severity);
  }
  if (spec.category !== undefined) checks.category_match = actual.category === spec.category;
  if (spec.file !== undefined) checks.file_match = actual.file === spec.file;
  if (spec.line_min !== undefined && spec.line_max !== undefined) {
    checks.line_in_range = actual.line >= spec.line_min && actual.line <= spec.line_max;
  }
  if (spec.summary_pattern !== undefined) {
    checks.summary_pattern_match = matches(spec.summary_pattern, actual.summary);
  }
  if (spec.why_pattern !== undefined) {
    checks.why_pattern_match = matches(spec.why_pattern, actual.why);
  }
  if (spec.fix_pattern !== undefined) {
    checks.fix_pattern_match = matches(spec.fix_pattern, actual.fix);
  }
  if (spec.fix_prefix !== undefined) {
    checks.fix_prefix_match = actual.fix.startsWith(spec.fix_prefix);
  }
  if (spec.kind !== undefined) checks.kind_match = actual.kind === spec.kind;
  if (spec.tool_pattern !== undefined) {
    checks.tool_pattern_match = matches(spec.tool_pattern, actual.tool);
  }
  if (spec.files_affected_min !== undefined) {
    checks.files_affected_count_above_min =
      (actual.files_affected_count ?? actual.files_affected?.length ?? 0) >= spec.files_affected_min;
  }

  return checks;
};

export const scoreFixture = (
  actuals: readonly Finding[],
  expected: ExpectedFindings,
  schemaValidity: { readonly all_valid: boolean },
): FixtureScore => {
  const { per_spec, used } = greedyMatchSpecs(
    expected.findings,
    actuals,
    checkSpecAgainstActual,
  );

  const count_in_range =
    (expected.count_min === undefined || actuals.length >= expected.count_min) &&
    (expected.count_max === undefined || actuals.length <= expected.count_max);

  const matched_count = per_spec.filter((s) => s.all_passed).length;
  const expected_findings_matched =
    expected.findings.length === 0 ? 1 : matched_count / expected.findings.length;

  return {
    per_spec,
    count_in_range,
    all_findings_schema_valid: schemaValidity.all_valid,
    expected_findings_matched,
    extra_findings_count: actuals.length - used.size,
    missing_specs_count: per_spec.filter((s) => s.matched_index === null).length,
    overall_pass:
      count_in_range &&
      schemaValidity.all_valid &&
      expected_findings_matched === 1,
  };
};
