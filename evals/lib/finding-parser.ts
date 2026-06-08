// Parses finding-format markdown blocks into Finding objects.
//
// Block shape (see references/finding-format.md):
//
//   [P0] [security] auth/session.ts:147 — refresh tokens stored in localStorage
//   why: XSS-readable; one DOM injection exfiltrates every active session.
//   fix: replace localStorage.setItem(...) at line 147 with cookieStore.set
//   kind: aggregate                                  (optional)
//   tool: prettier                                   (optional)
//   files_affected: ["a.ts", "b.ts"]                 (optional, JSON array)
//   files_affected_count: 8                          (optional, integer)
//   violations_count: 230                            (optional, integer)
//   evidence: screenshots/01-empty.png               (optional)
//
// Reviewer drift produces malformed blocks; we throw rather than silently
// rescue, so callers can route bad blocks to a `discarded` list with the
// raw text + parse error preserved. That keeps the merger's contract
// honest (drifted reviewers fail loud, not silent).

import type { Finding } from "./schema.ts";

const HEAD = new RegExp(
  String.raw`^\[(?<severity>P[0-3])\]\s+` +
    String.raw`\[(?<category>[a-z]+)\]\s+` +
    String.raw`(?<file>[^:\s]+):(?<line>\d+)\s+` +
    String.raw`[—-]\s+(?<summary>.+?)\s*$`,
);

const STRING_KEYS = new Set([
  "why",
  "fix",
  "tool",
  "evidence",
  "kind",
  "slice",
  "reviewer",
]);
const INT_KEYS = new Set(["files_affected_count", "violations_count"]);
const ARRAY_KEYS = new Set(["files_affected", "originating_reviewers"]);

export class ParseError extends Error {
  constructor(message: string, public block: string) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Parse one finding block. Returns null if the first line doesn't match the
 * head pattern (the caller should treat this as "not a finding"). Throws
 * ParseError if the head matches but a subsequent line is malformed.
 */
export function parseFindingBlock(block: string): Finding | null {
  const lines = block.trim().split(/\r?\n/);
  if (lines.length === 0) return null;

  const headLine = lines[0];
  if (headLine === undefined) return null;

  const match = HEAD.exec(headLine);
  if (!match?.groups) return null;

  const out: Record<string, unknown> = {
    severity: match.groups.severity,
    category: match.groups.category,
    file: match.groups.file,
    line: Number.parseInt(match.groups.line ?? "", 10),
    summary: (match.groups.summary ?? "").trim(),
  };

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    if (trimmed === "") continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (STRING_KEYS.has(key)) {
      out[key] = value;
    } else if (INT_KEYS.has(key)) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        throw new ParseError(`${key} is not a valid integer: ${value}`, block);
      }
      out[key] = parsed;
    } else if (ARRAY_KEYS.has(key)) {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
          throw new Error("not an array");
        }
        out[key] = parsed;
      } catch (e) {
        const err = e as Error;
        throw new ParseError(`${key} is not a valid JSON array: ${err.message}`, block);
      }
    } else {
      throw new ParseError(`unknown finding field: ${key}`, block);
    }
  }

  return out as unknown as Finding;
}

/**
 * Split a reviewer's raw transcript into candidate finding blocks.
 * Blocks are separated by blank lines.
 */
export function splitTranscript(transcript: string): string[] {
  return transcript
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}
