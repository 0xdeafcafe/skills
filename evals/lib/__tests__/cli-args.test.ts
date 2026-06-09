import { describe, expect, it } from "vitest";

import { flagPresent, flagValue, numericFlag } from "../cli-args.ts";

describe("flagValue", () => {
  it("returns the value after the first matching flag", () => {
    expect(flagValue(["--fixture", "tiny-token-leak"], "--fixture")).toBe(
      "tiny-token-leak",
    );
  });

  it("returns null when no flag matches", () => {
    expect(flagValue(["--other", "x"], "--fixture")).toBeNull();
  });

  it("supports multiple aliases (long + short)", () => {
    expect(flagValue(["-f", "tiny"], "--fixture", "-f")).toBe("tiny");
  });

  it("returns null when flag is present but has no value (end of argv)", () => {
    expect(flagValue(["--fixture"], "--fixture")).toBeNull();
  });

  it("prefers the first listed alias when both are present", () => {
    expect(flagValue(["-f", "a", "--fixture", "b"], "--fixture", "-f")).toBe("b");
    expect(flagValue(["-f", "a", "--fixture", "b"], "-f", "--fixture")).toBe("a");
  });
});

describe("flagPresent", () => {
  it("returns true when any flag matches", () => {
    expect(flagPresent(["--dry-run"], "--dry-run")).toBe(true);
  });

  it("returns false when none match", () => {
    expect(flagPresent(["--other"], "--dry-run")).toBe(false);
  });

  it("supports multiple aliases", () => {
    expect(flagPresent(["-n"], "--dry-run", "-n")).toBe(true);
  });
});

describe("numericFlag", () => {
  it("returns the parsed number when present", () => {
    expect(numericFlag(["--runs", "5"], "--runs", 3)).toBe(5);
  });

  it("returns the fallback when absent", () => {
    expect(numericFlag([], "--runs", 3)).toBe(3);
  });

  it("throws on a non-numeric value (typo guard)", () => {
    expect(() => numericFlag(["--runs", "three"], "--runs", 3)).toThrow(
      /requires a number/,
    );
  });

  it("accepts negative and decimal numbers", () => {
    expect(numericFlag(["--budget", "-1"], "--budget", 0)).toBe(-1);
    expect(numericFlag(["--budget", "0.5"], "--budget", 0)).toBe(0.5);
  });
});
