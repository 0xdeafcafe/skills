// Reference implementation of the sensitivity gate from
// references/sensitivity-paths.md and the rule from agents/orchestrate-merge.md.
//
// The real merger agent runs this gate per work-packet to annotate
// `suggested_model`. We mirror it here so tier-1 tests can verify packets
// land on Opus or Sonnet without invoking an LLM — and so that if the
// reference file's patterns or the gate's behaviour drift, the contract
// test fails loud at commit time instead of silently routing the wrong
// model to a sensitive path.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { FindingCategory } from "./schema.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SENSITIVITY_PATHS_PATH = resolve(
  __dirname,
  "../../references/sensitivity-paths.md",
);

export interface SensitivityResult {
  suggested_model: "opus" | "sonnet";
  sensitivity_reason: string;
}

/**
 * Decide which model the orchestrator should dispatch the fix-applier as.
 *
 * Rules (from agents/orchestrate-merge.md Step 5):
 * - `opus` if any file path matches any glob in sensitivity-paths.md.
 * - `opus` if any finding has `category: "security"`.
 * - `sonnet` otherwise.
 * - Aggregate packets force `sonnet` regardless — `auto:` fixes are
 *   deterministic tool runs, the gate's purpose doesn't apply.
 */
export function gate({
  files,
  categories,
  isAggregate = false,
}: {
  files: readonly string[];
  categories: readonly FindingCategory[];
  isAggregate?: boolean;
}): SensitivityResult {
  if (isAggregate) {
    return {
      suggested_model: "sonnet",
      sensitivity_reason: "aggregate (deterministic) — sonnet regardless of paths",
    };
  }

  if (categories.includes("security")) {
    return {
      suggested_model: "opus",
      sensitivity_reason: "finding category=security",
    };
  }

  for (const file of files) {
    for (const pattern of patterns()) {
      if (matchGlob(pattern.glob, file)) {
        return {
          suggested_model: "opus",
          sensitivity_reason: `matched pattern ${pattern.glob}`,
        };
      }
    }
  }

  return {
    suggested_model: "sonnet",
    sensitivity_reason: "non-sensitive",
  };
}

interface Pattern {
  glob: string;
  rationale: string;
}

let cachedPatterns: Pattern[] | null = null;

export function patterns(): Pattern[] {
  if (cachedPatterns !== null) return cachedPatterns;

  const content = readFileSync(SENSITIVITY_PATHS_PATH, "utf8");
  const out: Pattern[] = [];

  // Patterns live inside a single ``` code block; everything outside is
  // prose. Inside, lines that don't start with `#` and aren't empty are
  // glob + inline rationale.
  let inCodeBlock = false;
  for (const rawLine of content.split(/\r?\n/)) {
    if (rawLine.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (!inCodeBlock) continue;

    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    // `<glob>     # rationale`. The rationale isn't required.
    const hashIdx = line.indexOf("#");
    const glob = hashIdx === -1 ? line.trim() : line.slice(0, hashIdx).trim();
    const rationale = hashIdx === -1 ? "" : line.slice(hashIdx + 1).trim();
    if (glob === "") continue;

    out.push({ glob, rationale });
  }

  cachedPatterns = out;
  return out;
}

/**
 * Tiny case-insensitive glob matcher for the subset of patterns
 * sensitivity-paths.md uses. Supported syntax:
 * - `**` — any number of path segments (including zero)
 * - `*` — any number of non-slash characters
 * - `{a,b,c}` — alternation
 * - `.` — literal dot (escaped)
 *
 * This is intentionally not a full minimatch implementation. If we ever
 * need brace ranges, character classes, or `?` we should add `picomatch`
 * as a dep — but for the patterns we ship, this stays dependency-free
 * and easy to audit.
 */
export function matchGlob(glob: string, candidate: string): boolean {
  return globToRegex(glob).test(candidate.toLowerCase());
}

function globToRegex(glob: string): RegExp {
  let regex = "";
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];

    if (ch === "*") {
      if (glob[i + 1] === "*") {
        // `**/` matches any number of leading segments (or none).
        if (glob[i + 2] === "/") {
          regex += "(?:.*/)?";
          i += 3;
          continue;
        }
        regex += ".*";
        i += 2;
        continue;
      }
      regex += "[^/]*";
      i += 1;
      continue;
    }

    if (ch === "{") {
      const close = glob.indexOf("}", i);
      if (close === -1) {
        regex += "\\{";
        i += 1;
        continue;
      }
      const alts = glob.slice(i + 1, close).split(",");
      regex += `(?:${alts.map(escapeForRegex).join("|")})`;
      i = close + 1;
      continue;
    }

    if (".+?^$()|[]\\".includes(ch ?? "")) {
      regex += `\\${ch}`;
      i += 1;
      continue;
    }

    regex += ch ?? "";
    i += 1;
  }

  return new RegExp(`^${regex}$`, "i");
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
