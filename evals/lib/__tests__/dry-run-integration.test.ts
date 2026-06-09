// Integration smoke: shell out to the actual runner binaries with
// `--dry-run --local` and assert exit code + summary file shape.
//
// Keeps the structural orchestration code honest without needing a real
// LLM. Slow-ish (~1s per spawn) but worth it for the regression coverage.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

const EVALS_DIR = fileURLToPath(new URL("../../", import.meta.url));

const tempDir = mkdtempSync(join(tmpdir(), "skills-eval-int-"));
afterAll(() => rmSync(tempDir, { recursive: true, force: true }));

const runNode = (script: string, args: readonly string[]) =>
  spawnSync(
    process.execPath,
    [join(EVALS_DIR, "runners", script), ...args],
    { encoding: "utf8", cwd: EVALS_DIR, stdio: "pipe" },
  );

describe("run-pipeline.ts --dry-run --local", () => {
  it("exits 0 and writes a markdown summary with the marker tag", () => {
    const summaryPath = join(tempDir, "tier2.md");
    const r = runNode("run-pipeline.ts", [
      "--dry-run",
      "--local",
      "--fixture",
      "tiny-token-leak",
      "--reviewer",
      "review-ux",
      "--runs",
      "1",
      "--summary-path",
      summaryPath,
    ]);
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    expect(existsSync(summaryPath)).toBe(true);
    const md = readFileSync(summaryPath, "utf8");
    expect(md.startsWith("<!-- evals-tier2-result -->")).toBe(true);
    expect(md).toContain("Tier 2 eval results");
    expect(md).toContain("review-ux");
  });
});

describe("run-tier3.ts --dry-run", () => {
  it("exits 0 without invoking claude", () => {
    const r = runNode("run-tier3.ts", ["--dry-run"]);
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toContain("dry-run complete");
  });
});
