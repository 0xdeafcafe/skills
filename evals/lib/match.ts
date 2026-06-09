// Greedy spec/actual matcher shared between tier-2 (lib/scoring.ts) and
// tier-3 (lib/drive-change-scoring.ts). Each scorer supplies its own field
// comparison via `checkFn`; the matching loop and per-spec result shape are
// identical.

/**
 * Pattern test that understands inline flags like `(?i)` at the start of the
 * pattern — JavaScript's RegExp doesn't natively support them. Fixtures
 * write `(?i)(stripe.*secret)`-style patterns because they originated as
 * Python-style; we parse the prefix and pass the flags to the constructor's
 * second arg.
 */
export const matches = (pattern: string | undefined, value: string | undefined): boolean => {
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

export const countTruthy = (record: Readonly<Record<string, boolean>>): number =>
  Object.values(record).filter(Boolean).length;

export type SpecMatch = {
  readonly $match: string;
  readonly matched_index: number | null;
  readonly checks: Readonly<Record<string, boolean>>;
  readonly all_passed: boolean;
};

/**
 * Greedy matcher. For each spec in order, finds the unused actual that passes
 * the most checks against that spec. Marks the actual as used; moves on.
 * Returns the per-spec breakdown plus the set of used actual indices so
 * callers can compute `extra_findings_count = actuals.length - used.size`.
 */
export const greedyMatchSpecs = <TSpec extends { readonly $match: string }, TActual>(
  specs: readonly TSpec[],
  actuals: readonly TActual[],
  checkFn: (spec: TSpec, actual: TActual) => Readonly<Record<string, boolean>>,
): { readonly per_spec: readonly SpecMatch[]; readonly used: ReadonlySet<number> } => {
  const used = new Set<number>();
  const per_spec: SpecMatch[] = [];

  for (const spec of specs) {
    let best: { index: number; checks: Readonly<Record<string, boolean>>; passed: number } | null = null;

    for (let i = 0; i < actuals.length; i++) {
      if (used.has(i)) continue;
      const actual = actuals[i];
      if (actual === undefined) continue;
      const checks = checkFn(spec, actual);
      const passed = countTruthy(checks);
      if (best === null || passed > best.passed) {
        best = { index: i, checks, passed };
      }
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

  return { per_spec, used };
};
