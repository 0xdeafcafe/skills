import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BehaviorFixture } from "../fixtures/format.ts";
import { loadFixture, validateFixture, writeFixture } from "../fixtures/io.ts";

function sampleFixture(): BehaviorFixture {
  return {
    schemaVersion: 1,
    id: "sample",
    provenance: { kind: "synthetic", purpose: "I/O contract test" },
    context: { caseId: "io" },
    turns: [
      {
        prompt: "literal /tmp/private prompt",
        messages: [{ role: "assistant", content: "literal /tmp/private response" }],
        terminal: { subtype: "success", isError: false },
      },
    ],
    evidence: { checks: [] },
    outcome: { expected: "fail" },
  };
}

function fixtureWithTurns(turns: unknown[]): unknown {
  return { ...sampleFixture(), turns };
}

describe("fixture I/O", () => {
  it("round trips messages without silently rewriting them", async () => {
    const directory = await mkdtemp(join(tmpdir(), "skills-fixture-"));

    try {
      const path = await writeFixture(directory, sampleFixture());
      expect(await loadFixture(path)).toEqual(sampleFixture());
      expect(await readFile(path, "utf8")).toContain("literal /tmp/private response");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects traversal IDs and malformed terminal data", () => {
    expect(() => validateFixture({ ...sampleFixture(), id: "../escape" })).toThrow(/slug/);
    const malformed = fixtureWithTurns([
      { prompt: "x", messages: [], terminal: { subtype: 3, isError: false } },
    ]);
    expect(() => validateFixture(malformed)).toThrow(/terminal/);
  });

  const malformedParts = [
    ["tool-call without an id", "assistant", { type: "tool-call", toolName: "Bash", input: {} }],
    [
      "tool-call without input",
      "assistant",
      { type: "tool-call", toolCallId: "t1", toolName: "Bash" },
    ],
    [
      "tool-result with scalar output",
      "tool",
      { type: "tool-result", toolCallId: "t1", toolName: "Bash", output: "ok" },
    ],
    [
      "error result with numeric text",
      "tool",
      {
        type: "tool-result",
        toolCallId: "t1",
        toolName: "Bash",
        output: { type: "error-text", value: 1 },
      },
    ],
  ] as const;

  it.each(malformedParts)("rejects %s", (_name, role, part) => {
    const malformed = fixtureWithTurns([
      {
        prompt: "x",
        messages: [{ role, content: [part] }],
        terminal: { subtype: "success", isError: false },
      },
    ]);
    expect(() => validateFixture(malformed)).toThrow(/turns\.0\.messages\.0/);
  });

  it("rejects malformed observation and error records", () => {
    const malformedObservation: unknown = {
      ...sampleFixture(),
      evidence: {
        checks: [],
        observations: [{ id: "OBS-1", mandatory: "yes", disposition: "addressed", reviewed: true }],
      },
    };
    expect(() => validateFixture(malformedObservation)).toThrow(/observation/);

    const malformedError = fixtureWithTurns([
      { prompt: "x", messages: [], error: { name: "Failure", message: 42 } },
    ]);
    expect(() => validateFixture(malformedError)).toThrow(/error/);
  });
});
