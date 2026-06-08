import { describe, expect, it } from "vitest";

import type { DriveChangeReport } from "../drive-change-parser.ts";
import {
  type ExpectedDriveChange,
  scoreDriveChange,
} from "../drive-change-scoring.ts";

const baseReport: DriveChangeReport = {
  mode: "tiny",
  slices: null,
  specialists: ["review-hygiene", "review-security"],
  findings: [
    {
      severity: "P0",
      summary: "hardcoded Stripe secret key in config",
      file: "src/config/payment.ts",
      line: 5,
      reviewer: "review-security",
    },
    {
      severity: "P2",
      summary: "12 prettier auto-fixable violations across 1 file",
      file: "src/config/payment.ts",
      line: 1,
      reviewer: "review-hygiene",
    },
  ],
  unparsed_lines: [],
};

const tinyTokenLeakExpected: ExpectedDriveChange = {
  mode: "tiny",
  expected_specialists_run: ["review-hygiene", "review-security"],
  count_min: 2,
  count_max: 4,
  findings: [
    {
      $match: "security-secret-leak",
      severity: "P0",
      reviewer: "review-security",
      file: "src/config/payment.ts",
      summary_pattern: "(?i)(stripe.*secret|sk_live|hardcoded.*secret)",
    },
    {
      $match: "hygiene-prettier",
      severity_in: ["P1", "P2"],
      reviewer: "review-hygiene",
      file: "src/config/payment.ts",
      summary_pattern: "(?i)(format|prettier|violation)",
    },
  ],
};

describe("scoreDriveChange — happy path", () => {
  it("returns overall_pass when everything matches", () => {
    const score = scoreDriveChange(baseReport, tinyTokenLeakExpected);
    expect(score.mode_match).toBe(true);
    expect(score.specialists_match).toBe(true);
    expect(score.count_in_range).toBe(true);
    expect(score.expected_findings_matched).toBe(1);
    expect(score.overall_pass).toBe(true);
    expect(score.per_spec).toHaveLength(2);
    expect(score.per_spec.every((s) => s.all_passed)).toBe(true);
  });

  it("tolerates extra specialists in report.specialists if all expected are present", () => {
    const wider: DriveChangeReport = {
      ...baseReport,
      specialists: ["review-code", "review-test", "review-hygiene", "review-security"],
    };
    expect(scoreDriveChange(wider, tinyTokenLeakExpected).specialists_match).toBe(true);
  });
});

describe("scoreDriveChange — failure modes", () => {
  it("flags mode_match=false when report.mode disagrees", () => {
    const wrong = { ...baseReport, mode: "small" as const };
    const score = scoreDriveChange(wrong, tinyTokenLeakExpected);
    expect(score.mode_match).toBe(false);
    expect(score.overall_pass).toBe(false);
  });

  it("flags specialists_match=false when an expected specialist didn't run", () => {
    const missing = { ...baseReport, specialists: ["review-hygiene"] };
    const score = scoreDriveChange(missing, tinyTokenLeakExpected);
    expect(score.specialists_match).toBe(false);
    expect(score.overall_pass).toBe(false);
  });

  it("flags count_in_range=false when too few findings", () => {
    const tooFew = { ...baseReport, findings: baseReport.findings.slice(0, 1) };
    const score = scoreDriveChange(tooFew, tinyTokenLeakExpected);
    expect(score.count_in_range).toBe(false);
    expect(score.overall_pass).toBe(false);
  });

  it("flags overall_pass=false when there are unparsed lines (drift)", () => {
    const drifted = { ...baseReport, unparsed_lines: ["P0 malformed line"] };
    const score = scoreDriveChange(drifted, tinyTokenLeakExpected);
    expect(score.unparsed_lines_count).toBe(1);
    expect(score.overall_pass).toBe(false);
  });

  it("rejects wrong reviewer (greedy matcher prefers wrong-reviewer-but-otherwise-matching)", () => {
    const reviewerSwap: DriveChangeReport = {
      ...baseReport,
      findings: baseReport.findings.map((f) =>
        f.severity === "P0" ? { ...f, reviewer: "review-feature" } : f,
      ),
    };
    const score = scoreDriveChange(reviewerSwap, tinyTokenLeakExpected);
    // The security spec finds a near-match (same file, same severity) but fails
    // the reviewer_match check.
    expect(score.per_spec[0]?.checks.reviewer_match).toBe(false);
    expect(score.overall_pass).toBe(false);
  });
});
