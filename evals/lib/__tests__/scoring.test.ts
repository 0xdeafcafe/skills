import { describe, expect, it } from "vitest";

import type { Finding } from "../schema.ts";
import { type ExpectedFindings, scoreFixture } from "../scoring.ts";

const securityActual: Finding = {
  severity: "P0",
  category: "security",
  file: "src/config/payment.ts",
  line: 5,
  summary: "live Stripe secret key hardcoded in config",
  why: "value is hardcoded; leaked to git; needs rotation at provider plus history rewrite",
  fix: "decide: rotate at Stripe, move to secret manager, possibly rewrite history",
};

const hygieneActual: Finding = {
  severity: "P2",
  category: "hygiene",
  file: "src/config/payment.ts",
  line: 1,
  summary: "12 prettier auto-fixable formatting violations across 1 file",
  why: "prettier --check listed 12 issues, all marked auto-fixable",
  fix: "auto: prettier --write src/config/payment.ts",
  kind: "aggregate",
  tool: "prettier",
  files_affected: ["src/config/payment.ts"],
  files_affected_count: 1,
};

const tinyTokenLeakExpected: ExpectedFindings = {
  findings: [
    {
      $match: "security-secret-leak",
      severity: "P0",
      category: "security",
      file: "src/config/payment.ts",
      line_min: 4,
      line_max: 7,
      summary_pattern: "(?i)(stripe.*secret|sk_live|hardcoded.*secret|secret.*hardcoded)",
      why_pattern: "(?i)(hardcoded|leak|rotate|history)",
      fix_prefix: "decide:",
    },
    {
      $match: "hygiene-prettier-aggregate",
      severity_in: ["P1", "P2"],
      category: "hygiene",
      file: "src/config/payment.ts",
      kind: "aggregate",
      tool_pattern: "(?i)(prettier|biome|formatter)",
      summary_pattern: "(?i)(format|prettier|indent|whitespace).*violation",
      fix_prefix: "auto:",
      files_affected_min: 1,
    },
  ],
  count_min: 2,
  count_max: 4,
};

describe("scoreFixture — happy path", () => {
  it("returns overall_pass when both expected specs match perfectly", () => {
    const result = scoreFixture(
      [securityActual, hygieneActual],
      tinyTokenLeakExpected,
      { all_valid: true },
    );

    expect(result.overall_pass).toBe(true);
    expect(result.expected_findings_matched).toBe(1);
    expect(result.count_in_range).toBe(true);
    expect(result.all_findings_schema_valid).toBe(true);
    expect(result.extra_findings_count).toBe(0);
    expect(result.missing_specs_count).toBe(0);
    expect(result.per_spec).toHaveLength(2);
    expect(result.per_spec.every((s) => s.all_passed)).toBe(true);
  });

  it("includes every check key in the per-spec breakdown", () => {
    const result = scoreFixture(
      [securityActual, hygieneActual],
      tinyTokenLeakExpected,
      { all_valid: true },
    );

    const securityChecks = result.per_spec[0]?.checks ?? {};
    expect(securityChecks).toHaveProperty("severity_match", true);
    expect(securityChecks).toHaveProperty("category_match", true);
    expect(securityChecks).toHaveProperty("file_match", true);
    expect(securityChecks).toHaveProperty("line_in_range", true);
    expect(securityChecks).toHaveProperty("summary_pattern_match", true);
    expect(securityChecks).toHaveProperty("why_pattern_match", true);
    expect(securityChecks).toHaveProperty("fix_prefix_match", true);

    const hygieneChecks = result.per_spec[1]?.checks ?? {};
    expect(hygieneChecks).toHaveProperty("kind_match", true);
    expect(hygieneChecks).toHaveProperty("tool_pattern_match", true);
    expect(hygieneChecks).toHaveProperty("files_affected_count_above_min", true);
  });

  it("counts extra actuals when there are more than expected", () => {
    const extra: Finding = { ...hygieneActual, line: 99, summary: "extra" };
    const result = scoreFixture(
      [securityActual, hygieneActual, extra],
      tinyTokenLeakExpected,
      { all_valid: true },
    );

    expect(result.extra_findings_count).toBe(1);
    expect(result.count_in_range).toBe(true); // 3 is within [2, 4]
    expect(result.overall_pass).toBe(true); // extras don't fail us
  });
});

describe("scoreFixture — failure modes", () => {
  it("flags missing spec when no actual matches", () => {
    const result = scoreFixture(
      [securityActual], // missing hygiene
      tinyTokenLeakExpected,
      { all_valid: true },
    );

    expect(result.overall_pass).toBe(false);
    expect(result.missing_specs_count).toBe(1);
    expect(result.expected_findings_matched).toBe(0.5);
    expect(result.per_spec[1]?.matched_actual_index).toBe(null);
  });

  it("flags count_in_range failure when fewer than count_min", () => {
    const result = scoreFixture([securityActual], tinyTokenLeakExpected, { all_valid: true });
    expect(result.count_in_range).toBe(false);
    expect(result.overall_pass).toBe(false);
  });

  it("flags count_in_range failure when more than count_max", () => {
    const many: readonly Finding[] = [
      securityActual,
      hygieneActual,
      { ...hygieneActual, line: 10 },
      { ...hygieneActual, line: 20 },
      { ...hygieneActual, line: 30 },
    ];
    const result = scoreFixture(many, tinyTokenLeakExpected, { all_valid: true });
    expect(result.count_in_range).toBe(false);
    expect(result.overall_pass).toBe(false);
  });

  it("flags overall_pass=false when schema validity fails", () => {
    const result = scoreFixture(
      [securityActual, hygieneActual],
      tinyTokenLeakExpected,
      { all_valid: false },
    );
    expect(result.all_findings_schema_valid).toBe(false);
    expect(result.overall_pass).toBe(false);
  });

  it("rejects wrong severity even when other fields match", () => {
    const wrongSeverity: Finding = { ...securityActual, severity: "P3" };
    const result = scoreFixture(
      [wrongSeverity, hygieneActual],
      tinyTokenLeakExpected,
      { all_valid: true },
    );
    expect(result.per_spec[0]?.checks.severity_match).toBe(false);
    expect(result.per_spec[0]?.all_passed).toBe(false);
    expect(result.overall_pass).toBe(false);
  });

  it("rejects fix without the expected prefix", () => {
    const wrongFix: Finding = {
      ...securityActual,
      fix: "remove the hardcoded key", // no decide: prefix
    };
    const result = scoreFixture([wrongFix, hygieneActual], tinyTokenLeakExpected, {
      all_valid: true,
    });
    expect(result.per_spec[0]?.checks.fix_prefix_match).toBe(false);
    expect(result.overall_pass).toBe(false);
  });

  it("rejects summary that doesn't match the pattern", () => {
    const wrongSummary: Finding = {
      ...securityActual,
      summary: "configuration file modified",
    };
    const result = scoreFixture(
      [wrongSummary, hygieneActual],
      tinyTokenLeakExpected,
      { all_valid: true },
    );
    expect(result.per_spec[0]?.checks.summary_pattern_match).toBe(false);
  });
});

describe("scoreFixture — edge cases", () => {
  it("returns 1.0 matched when there are no expected findings", () => {
    const result = scoreFixture([], { findings: [] }, { all_valid: true });
    expect(result.expected_findings_matched).toBe(1);
    expect(result.overall_pass).toBe(true);
  });

  it("ignores absent constraints (a spec without a fix_prefix doesn't check fix)", () => {
    const noFixPrefix: ExpectedFindings = {
      findings: [
        {
          $match: "minimal",
          category: "security",
          file: "src/config/payment.ts",
        },
      ],
    };
    const result = scoreFixture([securityActual], noFixPrefix, { all_valid: true });
    expect(result.per_spec[0]?.all_passed).toBe(true);
    expect(result.per_spec[0]?.checks).not.toHaveProperty("fix_prefix_match");
  });

  it("returns false for all_passed when no checks were evaluated (empty spec)", () => {
    // A spec with only $match and nothing else means we have no signal —
    // we shouldn't say "passed" because the spec is meaningless.
    const emptySpec: ExpectedFindings = { findings: [{ $match: "empty" }] };
    const result = scoreFixture([securityActual], emptySpec, { all_valid: true });
    expect(result.per_spec[0]?.all_passed).toBe(false);
  });
});
