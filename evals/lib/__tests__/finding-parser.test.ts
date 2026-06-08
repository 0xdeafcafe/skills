import { describe, expect, it } from "vitest";

import { ParseError, parseFindingBlock, splitTranscript } from "../finding-parser.ts";
import { validateFinding } from "../schema.ts";

describe("parseFindingBlock — happy path", () => {
  it("parses a minimal mechanical finding", () => {
    const block = [
      "[P0] [security] auth/session.ts:147 — refresh tokens stored in localStorage",
      "why: XSS-readable; one DOM injection exfiltrates every active session.",
      "fix: replace localStorage.setItem(...) at line 147 with cookieStore.set",
    ].join("\n");

    const finding = parseFindingBlock(block);
    expect(finding).not.toBeNull();
    expect(finding?.severity).toBe("P0");
    expect(finding?.category).toBe("security");
    expect(finding?.file).toBe("auth/session.ts");
    expect(finding?.line).toBe(147);
    expect(validateFinding(finding)).toEqual([]);
  });

  it("parses a decide: prefix without re-interpreting it", () => {
    const block = [
      "[P1] [design] src/foo.ts:23 — formatUserName duplicated across 4 files",
      "why: promotion threshold passed.",
      "fix: decide: extract to src/utils/users.ts and update the four call sites?",
    ].join("\n");

    const finding = parseFindingBlock(block);
    expect(finding?.fix).toMatch(/^decide:/);
    expect(validateFinding(finding)).toEqual([]);
  });

  it("parses an aggregate finding with all optional fields", () => {
    const block = [
      "[P2] [hygiene] src/components/Button.tsx:1 — 230 prettier auto-fixable violations across 8 files",
      "why: prettier --check listed 230 issues, all marked auto-fixable",
      "fix: auto: prettier --write src/components",
      "kind: aggregate",
      "tool: prettier",
      'files_affected: ["src/components/Button.tsx", "src/components/Card.tsx"]',
      "files_affected_count: 8",
      "violations_count: 230",
    ].join("\n");

    const finding = parseFindingBlock(block);
    expect(finding?.kind).toBe("aggregate");
    expect(finding?.tool).toBe("prettier");
    expect(finding?.files_affected_count).toBe(8);
    expect(finding?.violations_count).toBe(230);
    expect(finding?.files_affected).toHaveLength(2);
    expect(validateFinding(finding)).toEqual([]);
  });

  it("parses an em-dash separator on the head line", () => {
    const block =
      "[P3] [hygiene] foo.ts:1 — short summary\nwhy: x\nfix: y";
    expect(parseFindingBlock(block)).not.toBeNull();
  });

  it("also accepts a regular hyphen separator (be lenient on copy-paste)", () => {
    const block =
      "[P3] [hygiene] foo.ts:1 - short summary\nwhy: x\nfix: y";
    const finding = parseFindingBlock(block);
    expect(finding).not.toBeNull();
    expect(finding?.summary).toBe("short summary");
  });
});

describe("parseFindingBlock — non-findings", () => {
  it("returns null for prose preamble that doesn't match the head pattern", () => {
    expect(parseFindingBlock("Let me review this code...")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseFindingBlock("")).toBeNull();
  });

  it("returns null for a malformed head (no brackets)", () => {
    expect(parseFindingBlock("P0 security auth.ts:1 — foo")).toBeNull();
  });
});

describe("parseFindingBlock — drift detection", () => {
  it("throws on unknown finding fields (catches reviewer prompt drift)", () => {
    const block = [
      "[P0] [security] foo.ts:1 — bar",
      "why: x",
      "fix: y",
      "vibes: high",
    ].join("\n");

    expect(() => parseFindingBlock(block)).toThrow(ParseError);
    expect(() => parseFindingBlock(block)).toThrow(/unknown finding field: vibes/);
  });

  it("throws on malformed integer fields", () => {
    const block = [
      "[P2] [hygiene] foo.ts:1 — agg",
      "why: x",
      "fix: y",
      "files_affected_count: many",
    ].join("\n");
    expect(() => parseFindingBlock(block)).toThrow(ParseError);
  });

  it("throws on malformed JSON array fields", () => {
    const block = [
      "[P2] [hygiene] foo.ts:1 — agg",
      "why: x",
      "fix: y",
      "files_affected: not an array",
    ].join("\n");
    expect(() => parseFindingBlock(block)).toThrow(ParseError);
  });
});

describe("splitTranscript", () => {
  it("splits two findings separated by a blank line", () => {
    const transcript = [
      "[P0] [security] a.ts:1 — first",
      "why: x",
      "fix: y",
      "",
      "[P1] [hygiene] b.ts:1 — second",
      "why: x",
      "fix: y",
    ].join("\n");

    expect(splitTranscript(transcript)).toHaveLength(2);
  });

  it("ignores leading and trailing blank lines", () => {
    const transcript = "\n\n[P0] [security] a.ts:1 — only\nwhy: x\nfix: y\n\n";
    expect(splitTranscript(transcript)).toHaveLength(1);
  });

  it("collapses multiple blank lines between findings", () => {
    const transcript = [
      "[P0] [security] a.ts:1 — first",
      "why: x",
      "fix: y",
      "",
      "",
      "",
      "[P1] [hygiene] b.ts:1 — second",
      "why: x",
      "fix: y",
    ].join("\n");
    expect(splitTranscript(transcript)).toHaveLength(2);
  });
});
