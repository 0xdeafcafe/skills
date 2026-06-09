// Tiny shared CLI-arg helper. The runners all want the same shape: a flag
// list mapped to typed values, with the option of presence-only switches.
//
// Not pulling in a dep (commander / yargs) for ~20 LOC of parsing.

export type FlagSpec = {
  readonly flags: readonly string[];
  /** Presence-only flag (no value): `--dry-run`, `--local`. */
  readonly boolean?: boolean;
};

/**
 * Returns the value following the first matching flag, or null if the flag
 * isn't present. Looks up by literal match — supply both long and short
 * forms (`--fixture`, `-f`) in `flags` if you want them.
 */
export const flagValue = (
  argv: readonly string[],
  ...flags: readonly string[]
): string | null => {
  for (const flag of flags) {
    const idx = argv.indexOf(flag);
    if (idx !== -1) return argv[idx + 1] ?? null;
  }
  return null;
};

/**
 * True iff at least one of the listed flags appears anywhere in argv.
 */
export const flagPresent = (
  argv: readonly string[],
  ...flags: readonly string[]
): boolean => flags.some((flag) => argv.includes(flag));

/**
 * Convenience: parse a numeric flag with a default. Throws if the value is
 * present but not a finite number, so a typo (`--runs three`) fails loud
 * instead of silently defaulting.
 */
export const numericFlag = (
  argv: readonly string[],
  flag: string,
  fallback: number,
): number => {
  const raw = flagValue(argv, flag);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flag} requires a number; got "${raw}"`);
  }
  return parsed;
};
