import { describe, expect, it } from "vitest";
import type { BehaviorFixture, StoredModelMessage } from "../fixtures/format.ts";
import {
  deriveMutation,
  extractAssistantText,
  extractToolCalls,
  fixtureMeetsCompletion,
  unresolvedMandatory,
} from "../fixtures/evidence.ts";

const messages: StoredModelMessage[] = [
  {
    role: "assistant",
    content: [
      { type: "text", text: "I might write Bash({ command: 'git commit' })" },
      { type: "tool-call", toolCallId: "t1", toolName: "Bash", input: { command: "git status" } },
    ],
  },
  {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: "t1",
        toolName: "Bash",
        output: { type: "text", value: "clean" },
      },
    ],
  },
  { role: "assistant", content: "Finished." },
];

const fixture = (): BehaviorFixture => ({
  schemaVersion: 1,
  id: "synthetic-helper-sample",
  provenance: {
    kind: "synthetic",
    purpose: "exercise evidence helpers without claiming a model recording",
  },
  context: { caseId: "ordinary" },
  turns: [{ prompt: "do it", messages, terminal: { subtype: "success", isError: false } }],
  evidence: {
    observations: [],
    checks: [
      {
        id: "head",
        kind: "git-postcondition",
        required: true,
        passed: true,
        observed: { moved: true },
      },
    ],
  },
  outcome: { expected: "pass" },
});

describe("recorded evidence helpers", () => {
  it("counts structured calls and ignores quoted calls and tool results", () => {
    expect(extractToolCalls(messages)).toEqual([
      { toolCallId: "t1", toolName: "Bash", input: { command: "git status" } },
    ]);
  });
  it("extracts only assistant text from mixed content", () =>
    expect(extractAssistantText(messages)).toBe(
      "I might write Bash({ command: 'git commit' })\nFinished.",
    ));
  it("keeps reviewed dispositions distinct from unresolved mandatory work", () => {
    expect(
      unresolvedMandatory([
        { id: "a", mandatory: false, disposition: "follow-up", reviewed: true },
        {
          id: "b",
          mandatory: true,
          disposition: "addressed",
          reviewed: true,
          evidence: "runtime check passed",
        },
      ]),
    ).toEqual([]);
    expect(
      unresolvedMandatory([{ id: "b", mandatory: true, disposition: "follow-up", reviewed: true }]),
    ).toHaveLength(1);
    expect(
      unresolvedMandatory([{ id: "b", mandatory: true, disposition: "addressed", reviewed: true }]),
    ).toHaveLength(1);
  });
  it("uses structured checks rather than reassuring prose", () => {
    const base = fixture();
    base.turns[0]!.messages = [{ role: "assistant", content: "Everything passed." }];
    expect(fixtureMeetsCompletion(base)).toBe(true);
    const failed = deriveMutation(base, "Git HEAD did not move", (copy) => {
      copy.evidence.checks[0]!.passed = false;
    });
    expect(failed.provenance.kind).toBe("derived-mutation");
    expect(fixtureMeetsCompletion(failed)).toBe(false);
  });
  it.each(["error", "truncated", "missing"] as const)("rejects %s terminal state", (status) => {
    const mutant = deriveMutation(fixture(), `${status} terminal`, (copy) => {
      if (status === "missing") delete copy.turns[0]!.terminal;
      else copy.turns[0]!.terminal = { subtype: status, isError: true };
    });
    expect(fixtureMeetsCompletion(mutant)).toBe(false);
  });
  it("rejects a non-success subtype even when isError is false", () => {
    const mutant = deriveMutation(fixture(), "max turns without error flag", (copy) => {
      copy.turns[0]!.terminal = { subtype: "error_max_turns", isError: false };
    });
    expect(fixtureMeetsCompletion(mutant)).toBe(false);
  });
});
