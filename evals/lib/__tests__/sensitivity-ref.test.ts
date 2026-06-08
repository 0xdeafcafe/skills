import { describe, expect, it } from "vitest";

import { gate, matchGlob, patterns } from "../sensitivity-ref.ts";

describe("patterns", () => {
  it("loads non-empty patterns from references/sensitivity-paths.md", () => {
    const ps = patterns();
    expect(ps.length).toBeGreaterThan(10);
    for (const p of ps) {
      expect(p.glob.length).toBeGreaterThan(0);
    }
  });

  it("each pattern has either a rationale or is allowed to be silent (we don't reject)", () => {
    const ps = patterns();
    expect(ps.every((p) => typeof p.rationale === "string")).toBe(true);
  });
});

describe("matchGlob", () => {
  it("matches **/auth/**", () => {
    expect(matchGlob("**/auth/**", "src/auth/session.ts")).toBe(true);
    expect(matchGlob("**/auth/**", "auth/session.ts")).toBe(true);
    expect(matchGlob("**/auth/**", "src/orders/cancel.ts")).toBe(false);
  });

  it("matches **/*session*", () => {
    expect(matchGlob("**/*session*", "src/lib/sessionStore.ts")).toBe(true);
    expect(matchGlob("**/*session*", "sessionStore.ts")).toBe(true);
    expect(matchGlob("**/*session*", "src/orders/cancel.ts")).toBe(false);
  });

  it("matches brace alternation", () => {
    expect(matchGlob("**/*.{ts,tsx,js,jsx}", "src/foo.ts")).toBe(true);
    expect(matchGlob("**/*.{ts,tsx,js,jsx}", "src/foo.tsx")).toBe(true);
    expect(matchGlob("**/*.{ts,tsx,js,jsx}", "src/foo.go")).toBe(false);
  });

  it("is case-insensitive (Auth/, AUTH/, auth/ all match)", () => {
    expect(matchGlob("**/auth/**", "src/Auth/session.ts")).toBe(true);
    expect(matchGlob("**/auth/**", "src/AUTH/session.ts")).toBe(true);
  });
});

describe("gate", () => {
  it("returns opus for any security-category finding regardless of path", () => {
    expect(
      gate({ files: ["docs/readme.md"], categories: ["security"] }),
    ).toEqual({
      suggested_model: "opus",
      sensitivity_reason: "finding category=security",
    });
  });

  it("returns opus for sensitive paths (auth/ etc.) even with non-security category", () => {
    expect(gate({ files: ["src/auth/session.ts"], categories: ["hygiene"] }))
      .toEqual({
        suggested_model: "opus",
        sensitivity_reason: expect.stringMatching(/matched pattern.*auth/),
      });
  });

  it("returns opus for crypto paths", () => {
    expect(gate({ files: ["src/cryptoHelpers.ts"], categories: ["hygiene"] }))
      .toMatchObject({ suggested_model: "opus" });
  });

  it("returns sonnet for non-sensitive paths + non-security category", () => {
    expect(
      gate({
        files: ["src/components/Card.tsx", "src/components/Button.tsx"],
        categories: ["hygiene"],
      }),
    ).toEqual({
      suggested_model: "sonnet",
      sensitivity_reason: "non-sensitive",
    });
  });

  it("forces sonnet for aggregate packets regardless of file path", () => {
    // Aggregate packets are auto: fixes — deterministic tool runs. The
    // sensitivity gate's purpose (route risky LLM edits to a more
    // capable model) doesn't apply when no LLM is generating the edit.
    expect(
      gate({
        files: ["src/auth/session.ts"],
        categories: ["hygiene"],
        isAggregate: true,
      }),
    ).toEqual({
      suggested_model: "sonnet",
      sensitivity_reason: "aggregate (deterministic) — sonnet regardless of paths",
    });
  });

  it("respects multiple files — any match flips to opus", () => {
    expect(
      gate({
        files: ["src/components/Card.tsx", "src/auth/session.ts"],
        categories: ["hygiene"],
      }),
    ).toMatchObject({ suggested_model: "opus" });
  });
});
