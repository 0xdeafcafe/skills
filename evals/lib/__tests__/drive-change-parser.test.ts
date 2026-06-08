import { describe, expect, it } from "vitest";

import { parseDriveChangeReport } from "../drive-change-parser.ts";

const tinyReport = `
drive-change ran on the working tree.

  Mode: tiny
  Specialists: review-hygiene, review-security

Findings, severity-ordered:

  P0  refresh tokens stored in localStorage   auth/session.ts:147   (review-security)
  P2  230 prettier auto-fixable violations   src/components/Button.tsx:1   (review-hygiene)
`;

const largeReport = `
drive-change ran on PR #234.

  Mode: large
  Slices: 4
  Specialists: review-code, review-test, review-feature, review-security, review-hygiene, review-ux

Findings, severity-ordered:

  P0  hardcoded API key   src/config/payment.ts:5   (review-security)
  P1  caller passes old arg shape   rendering/caller.ts:117   (review-feature)
  P2  formatUserName duplicated   src/profile/UserCard.tsx:23   (review-code)
`;

describe("parseDriveChangeReport — happy path", () => {
  it("parses tiny mode + specialists + findings", () => {
    const r = parseDriveChangeReport(tinyReport);
    expect(r.mode).toBe("tiny");
    expect(r.slices).toBeNull();
    expect(r.specialists).toEqual(["review-hygiene", "review-security"]);
    expect(r.findings).toHaveLength(2);
    expect(r.unparsed_lines).toHaveLength(0);
  });

  it("captures Slices: count in large mode", () => {
    const r = parseDriveChangeReport(largeReport);
    expect(r.mode).toBe("large");
    expect(r.slices).toBe(4);
    expect(r.specialists).toHaveLength(6);
    expect(r.findings).toHaveLength(3);
  });

  it("each finding carries severity / summary / file / line / reviewer", () => {
    const r = parseDriveChangeReport(tinyReport);
    const first = r.findings[0];
    expect(first?.severity).toBe("P0");
    expect(first?.summary).toBe("refresh tokens stored in localStorage");
    expect(first?.file).toBe("auth/session.ts");
    expect(first?.line).toBe(147);
    expect(first?.reviewer).toBe("review-security");
  });
});

describe("parseDriveChangeReport — drift / unparsed", () => {
  it("captures lines that look like findings but don't match the strict shape", () => {
    const drifted = `
drive-change ran on the working tree.

  Mode: tiny
  Specialists: review-security

Findings, severity-ordered:

  P0  bad shape — no file:line tuple                 (review-security)
  P1  another bad one with malformed line   src/foo.ts:not-a-number   (review-test)
`;
    const r = parseDriveChangeReport(drifted);
    expect(r.findings).toHaveLength(0);
    expect(r.unparsed_lines.length).toBeGreaterThan(0);
  });

  it("ignores prose / non-finding lines silently", () => {
    const r = parseDriveChangeReport(tinyReport);
    expect(r.unparsed_lines).toEqual([]);
  });
});

describe("parseDriveChangeReport — edge cases", () => {
  it("returns nulls when the report has no Mode line", () => {
    const r = parseDriveChangeReport("just some prose with no structured fields");
    expect(r.mode).toBeNull();
    expect(r.slices).toBeNull();
    expect(r.specialists).toEqual([]);
    expect(r.findings).toEqual([]);
  });

  it("strips brackets from a square-bracketed specialists list", () => {
    const bracketed = `
Mode: small
Specialists: [review-code, review-test]
Findings:
  P0  something   foo.ts:1   (review-code)
`;
    const r = parseDriveChangeReport(bracketed);
    expect(r.specialists).toEqual(["review-code", "review-test"]);
  });
});
