import { describe, expect, it } from "vitest";

import {
  type CellSummary,
  passRateLabel,
  renderTier2Summary,
} from "../summary-markdown.ts";

const cell = (
  fixture: string,
  reviewer: string,
  pass_rate: number,
  overrides: Partial<CellSummary> = {},
): CellSummary => ({
  fixture_name: fixture,
  reviewer_skill: reviewer,
  run_count: 3,
  pass_rate,
  mean_findings_count: 0,
  stddev_findings_count: 0,
  mean_extra_findings: 0,
  mean_missing_specs: 0,
  mean_drifted: 0,
  mean_matched: 1,
  total_cost_usd: 0.0,
  invocation_failures: 0,
  ...overrides,
});

describe("passRateLabel", () => {
  it.each([
    [1.0, "✓"],
    [2 / 3, "~"],
    [0.66, "✗"],
    [0.5, "✗"],
    [0.0, "✗"],
  ])("rate=%f -> %s", (rate, label) => {
    expect(passRateLabel(rate)).toBe(label);
  });
});

describe("renderTier2Summary", () => {
  it("starts with the marker comment so the workflow find-or-edit logic works", () => {
    const md = renderTier2Summary([], {
      runsPerCell: 3,
      dryRun: false,
      dashboardUrl: null,
    });
    expect(md.startsWith("<!-- evals-tier2-result -->")).toBe(true);
  });

  it("emits a fenced markdown link when a dashboard URL is provided", () => {
    const md = renderTier2Summary([cell("f", "r", 1)], {
      runsPerCell: 3,
      dryRun: false,
      dashboardUrl: "https://app.langwatch.ai/x/experiments/y?runId=z",
    });
    expect(md).toContain(
      "[Open experiment in LangWatch](https://app.langwatch.ai/x/experiments/y?runId=z)",
    );
  });

  it("falls back to an italic note when no dashboard URL is available", () => {
    const md = renderTier2Summary([cell("f", "r", 1)], {
      runsPerCell: 3,
      dryRun: false,
      dashboardUrl: null,
    });
    expect(md).toContain("_LangWatch dashboard URL not captured for this run._");
  });

  it("counts green/flaky/broken correctly", () => {
    const md = renderTier2Summary(
      [
        cell("f", "review-security", 1),
        cell("f", "review-hygiene", 1),
        cell("f", "review-code", 2 / 3),
        cell("f", "review-test", 0),
      ],
      { runsPerCell: 3, dryRun: false, dashboardUrl: null },
    );
    expect(md).toContain("**2 green · 1 flaky · 1 broken**");
  });

  it("renders the cell table with code-spanned fixture/reviewer names", () => {
    const md = renderTier2Summary(
      [cell("tiny-token-leak", "review-security", 1, { total_cost_usd: 0.1234 })],
      { runsPerCell: 3, dryRun: false, dashboardUrl: null },
    );
    expect(md).toContain("`tiny-token-leak`");
    expect(md).toContain("`review-security`");
    expect(md).toContain("3/3 ✓");
    expect(md).toContain("$0.1234");
  });

  it("appends the dry-run marker when dryRun is true", () => {
    const md = renderTier2Summary([cell("f", "r", 1)], {
      runsPerCell: 1,
      dryRun: true,
      dashboardUrl: null,
    });
    expect(md).toContain("· *dry-run*");
  });

  it("renders the legend line so reviewers know what the symbols mean", () => {
    const md = renderTier2Summary([], {
      runsPerCell: 3,
      dryRun: false,
      dashboardUrl: null,
    });
    expect(md).toContain("Legend: ✓ 3/3 · ~ 2/3 (flaky) · ✗ <2/3 (broken)");
  });
});
