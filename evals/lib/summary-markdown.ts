// Renders the tier-2 result rollup as markdown. The tier-2 workflow pipes
// the output straight into `gh pr comment --body-file`, so the format here
// is also the format that lands on the PR.
//
// Pure function — no I/O, no SDK calls. Snapshot-tested so accidental
// format drift breaks loudly instead of silently mangling the PR comment.

export type CellSummary = {
  readonly fixture_name: string;
  readonly reviewer_skill: string;
  readonly run_count: number;
  readonly pass_rate: number;
  readonly mean_findings_count: number;
  readonly stddev_findings_count: number;
  readonly mean_extra_findings: number;
  readonly mean_missing_specs: number;
  readonly mean_drifted: number;
  readonly mean_matched: number;
  readonly total_cost_usd: number;
  readonly invocation_failures: number;
};

export type SummaryRenderOptions = {
  readonly runsPerCell: number;
  readonly dryRun: boolean;
  readonly dashboardUrl: string | null;
};

/**
 * Same as the runner's per-cell label: 3/3 green, ≥2/3 flaky, otherwise broken.
 */
export const passRateLabel = (rate: number): string => {
  if (rate === 1) return "✓";
  if (rate >= 2 / 3) return "~";
  return "✗";
};

/**
 * `<!-- evals-tier2-result -->` marker is load-bearing: the workflow's
 * find-or-edit step uses it to locate an existing comment on re-runs. If
 * you change the marker, change the workflow.
 */
export const renderTier2Summary = (
  cells: readonly CellSummary[],
  opts: SummaryRenderOptions,
): string => {
  const totalCost = cells.reduce((acc, c) => acc + c.total_cost_usd, 0);
  const passing = cells.filter((c) => c.pass_rate === 1).length;
  const flaky = cells.filter((c) => c.pass_rate > 0 && c.pass_rate < 1).length;
  const broken = cells.filter((c) => c.pass_rate === 0).length;

  const rows = cells
    .map((c) => {
      const passes = Math.round(c.pass_rate * c.run_count);
      return `| \`${c.fixture_name}\` | \`${c.reviewer_skill}\` | ${passes}/${c.run_count} ${passRateLabel(c.pass_rate)} | ${c.mean_findings_count.toFixed(1)} | ${c.mean_extra_findings.toFixed(1)} | $${c.total_cost_usd.toFixed(4)} |`;
    })
    .join("\n");

  const lines = [
    "<!-- evals-tier2-result -->",
    "## Tier 2 eval results",
    "",
    opts.dashboardUrl
      ? `[Open experiment in LangWatch](${opts.dashboardUrl})`
      : "_LangWatch dashboard URL not captured for this run._",
    "",
    `**${passing} green · ${flaky} flaky · ${broken} broken** · ${cells.length} cells × ${opts.runsPerCell} runs · total cost $${totalCost.toFixed(4)}${opts.dryRun ? " · *dry-run*" : ""}`,
    "",
    "| fixture | reviewer | pass rate | mean findings | mean extras | cost |",
    "|---|---|:--:|--:|--:|--:|",
    rows,
    "",
    "_Legend: ✓ 3/3 · ~ 2/3 (flaky) · ✗ <2/3 (broken)._",
    "",
  ];

  return `${lines.join("\n")}\n`;
};
