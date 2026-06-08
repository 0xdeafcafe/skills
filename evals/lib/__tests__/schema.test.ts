import { describe, expect, it } from "vitest";

import {
  type Finding,
  assertFinding,
  validateFinding,
} from "../schema.ts";

const baseSecurityFinding: Finding = {
  severity: "P0",
  category: "security",
  file: "auth/session.ts",
  line: 147,
  summary: "refresh tokens stored in localStorage",
  why: "XSS-readable; one DOM injection exfiltrates every active session.",
  fix: "replace localStorage.setItem(...) at line 147 with cookieStore.set",
};

const baseAggregateFinding: Finding = {
  severity: "P2",
  category: "hygiene",
  file: "src/components/Button.tsx",
  line: 1,
  summary: "230 prettier auto-fixable violations across 8 files",
  why: "prettier --check listed 230 issues, all marked auto-fixable",
  fix: "auto: prettier --write src/components",
  kind: "aggregate",
  tool: "prettier",
  files_affected: ["src/components/Button.tsx", "src/components/Card.tsx"],
  files_affected_count: 8,
  violations_count: 230,
};

describe("validateFinding — happy path", () => {
  it("accepts a well-formed security finding", () => {
    expect(validateFinding(baseSecurityFinding)).toEqual([]);
  });

  it("accepts a well-formed aggregate hygiene finding", () => {
    expect(validateFinding(baseAggregateFinding)).toEqual([]);
  });

  it("accepts a decide: prefix on the fix field", () => {
    const f = { ...baseSecurityFinding, fix: "decide: rotate at Stripe?" };
    expect(validateFinding(f)).toEqual([]);
  });

  it("accepts the optional evidence field for review-ux findings", () => {
    const f: Finding = {
      ...baseSecurityFinding,
      category: "ux",
      evidence: "screenshots/03-loading.png",
    };
    expect(validateFinding(f)).toEqual([]);
  });
});

describe("validateFinding — drift detection", () => {
  it("rejects unknown severity", () => {
    const errors = validateFinding({ ...baseSecurityFinding, severity: "P9" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.path).toMatch(/severity/);
  });

  it("rejects unknown category", () => {
    const errors = validateFinding({ ...baseSecurityFinding, category: "vibes" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.path).toMatch(/category/);
  });

  it("rejects negative line numbers", () => {
    const errors = validateFinding({ ...baseSecurityFinding, line: -1 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects findings missing the why field", () => {
    const { why: _why, ...missing } = baseSecurityFinding;
    const errors = validateFinding(missing);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toMatch(/required/);
  });

  it("rejects additional properties not in the schema", () => {
    const errors = validateFinding({
      ...baseSecurityFinding,
      vibes: "high",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toMatch(/additional/);
  });

  it("rejects file paths starting with a slash (absolute)", () => {
    const errors = validateFinding({
      ...baseSecurityFinding,
      file: "/auth/session.ts",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.path).toMatch(/file/);
  });

  it("rejects empty string summaries", () => {
    const errors = validateFinding({ ...baseSecurityFinding, summary: "" });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("assertFinding", () => {
  it("does not throw for valid findings", () => {
    expect(() => assertFinding(baseSecurityFinding)).not.toThrow();
  });

  it("throws with a multi-error summary for invalid findings", () => {
    expect(() =>
      assertFinding({ ...baseSecurityFinding, severity: "P9", category: "vibes" }),
    ).toThrow(/severity.*category|category.*severity/);
  });
});
