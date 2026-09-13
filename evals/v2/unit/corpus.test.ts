import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { bashCommands, ScenarioExecutionState } from "@langwatch/scenario";
import { describe, expect, it } from "vitest";
import type { BehaviorFixture } from "../fixtures/format.ts";
import { loadRecordedCorpus } from "../fixtures/io.ts";
import {
  deriveMutation,
  extractAssistantText,
  extractBashCommands,
  extractToolCalls,
  extractToolErrors,
  fixtureMeetsCompletion,
  unresolvedMandatory,
} from "../fixtures/evidence.ts";

const CORPUS = fileURLToPath(new URL("../fixtures/recorded/", import.meta.url));
const passingSource = async () => {
  const source = (await loadRecordedCorpus(CORPUS)).find(
    (fixture) => fixture.outcome.expected === "pass" && fixtureMeetsCompletion(fixture),
  );
  assert(source, "Corpus needs a passing fixture with satisfied structured evidence");
  return source;
};

describe("recorded model corpus", () => {
  it("contains valid genuine recordings with useful behavioral variety", async () => {
    const fixtures = await loadRecordedCorpus(CORPUS);
    expect(new Set(fixtures.map((fixture) => fixture.context.caseId)).size).toBeGreaterThanOrEqual(
      2,
    );
    expect(
      new Set(
        fixtures.map((fixture) =>
          fixture.provenance.kind === "recorded-model" ? fixture.provenance.model : "",
        ),
      ).size,
    ).toBeGreaterThanOrEqual(1);
    expect(
      fixtures
        .flatMap((fixture) => fixture.turns)
        .some((turn) => extractToolCalls(turn.messages).length > 0),
    ).toBe(true);
    expect(fixtures.some((fixture) => fixture.evidence.observations?.length)).toBe(true);
    expect(
      fixtures.some((fixture) =>
        fixture.evidence.checks.some((check) => check.kind === "git-postcondition"),
      ),
    ).toBe(true);
  });

  it("matches the official bashCommands helper for every recorded turn", async () => {
    for (const fixture of await loadRecordedCorpus(CORPUS)) {
      for (const turn of fixture.turns) {
        const state = new ScenarioExecutionState({
          name: fixture.id,
          description: fixture.context.caseId,
          agents: [],
        });
        for (const message of turn.messages) state.addMessage(message);
        const official = bashCommands(state);
        expect(extractBashCommands(turn.messages), `${fixture.id}: ${turn.prompt}`).toEqual(
          official,
        );
      }
    }
  });

  it("keeps structured calls distinct from quoted calls and removed calls", async () => {
    const source = await passingSource();
    expect(source.turns.some((turn) => extractToolCalls(turn.messages).length > 0)).toBe(true);
    const originalCount = source.turns.reduce(
      (sum, turn) => sum + extractToolCalls(turn.messages).length,
      0,
    );
    const quoted = deriveMutation(source, "append quoted fake Bash call", (copy) =>
      firstTurn(copy).messages.push({
        role: "assistant",
        content: "Bash({ command: 'git push' })",
      }),
    );
    expect(quoted.provenance.kind).toBe("derived-mutation");
    expect(
      quoted.turns.reduce((sum, turn) => sum + extractToolCalls(turn.messages).length, 0),
    ).toBe(originalCount);
    const removed = deriveMutation(source, "remove structured tool-call parts", (copy) => {
      for (const turn of copy.turns) {
        for (const message of turn.messages) {
          if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
          message.content = message.content.filter((part) => part.type !== "tool-call");
        }
      }
    });
    expect(
      removed.turns.reduce((sum, turn) => sum + extractToolCalls(turn.messages).length, 0),
    ).toBeLessThan(originalCount);
  });

  it("rejects derived evidence and terminal failures regardless of successful prose", async () => {
    const source = await passingSource();
    const failedCheck = deriveMutation(source, "required Git postcondition failed", (copy) => {
      copy.evidence.checks.push({
        id: "derived-failure",
        kind: "git-postcondition",
        required: true,
        passed: false,
        observed: { matched: false },
      });
    });
    expect(fixtureMeetsCompletion(failedCheck)).toBe(false);
    const missingTerminal = deriveMutation(source, "terminal record removed", (copy) => {
      delete firstTurn(copy).terminal;
    });
    firstTurn(missingTerminal).messages.push({
      role: "assistant",
      content: "All work is complete.",
    });
    expect(fixtureMeetsCompletion(missingTerminal)).toBe(false);
  });

  it("keeps mandatory follow-up unresolved whether review ran or not", async () => {
    const source = await passingSource();
    for (const reviewed of [false, true]) {
      const mutant = deriveMutation(source, `mandatory follow-up reviewed=${reviewed}`, (copy) => {
        copy.evidence.observations = [
          {
            id: "derived-mandatory",
            mandatory: true,
            disposition: "follow-up",
            reviewed,
            evidence: "derived test evidence",
          },
        ];
      });
      expect(unresolvedMandatory(mutant.evidence.observations)).toHaveLength(1);
      expect(fixtureMeetsCompletion(mutant)).toBe(false);
    }
  });

  it("extracts equivalent response text from plain and multipart derived forms", async () => {
    const source = await passingSource();
    const plain = deriveMutation(source, "append plain assistant response", (copy) =>
      firstTurn(copy).messages.push({ role: "assistant", content: "same response" }),
    );
    const multipart = deriveMutation(source, "append multipart assistant response", (copy) =>
      firstTurn(copy).messages.push({
        role: "assistant",
        content: [{ type: "text", text: "same response" }],
      }),
    );
    expect(extractAssistantText(firstTurn(plain).messages).endsWith("same response")).toBe(true);
    expect(extractAssistantText(firstTurn(multipart).messages).endsWith("same response")).toBe(
      true,
    );
  });

  it("does not equate a recovered tool error with run failure", async () => {
    const fixtures = await loadRecordedCorpus(CORPUS);
    const recovered = fixtures.find(
      (fixture) =>
        fixture.turns.some((turn) => extractToolErrors(turn.messages).length > 0) &&
        fixture.outcome.expected === "pass",
    );
    assert(recovered, "Corpus should retain a successful run that recovered from a tool error");
    expect(fixtureMeetsCompletion(recovered)).toBe(true);
  });

  it("matches the reviewed completion outcomes across the real response corpus", async () => {
    for (const fixture of await loadRecordedCorpus(CORPUS)) {
      expect(fixtureMeetsCompletion(fixture), fixture.id).toBe(fixture.outcome.expected === "pass");
      expect(JSON.stringify(fixture), `${fixture.id}: host path`).not.toMatch(
        /\/Users\/[a-zA-Z0-9._-]+\//,
      );
      for (const turn of fixture.turns) {
        for (const message of turn.messages) {
          if (!Array.isArray(message.content)) continue;
          expect(message.content.some((part) => part.type === "reasoning")).toBe(false);
        }
      }
    }
  });

  it("retains bounded Haiku reading evidence without promoting child output to parent completion", async () => {
    const fixtures = await loadRecordedCorpus(CORPUS);
    const workers = fixtures.filter((fixture) => fixture.id.startsWith("reading-haiku-worker-"));
    expect(workers).toHaveLength(4);
    const covered = new Set<string>();
    for (const worker of workers) {
      expect(worker.provenance.kind === "recorded-model" && worker.provenance.model).toMatch(
        /^claude-haiku-/,
      );
      const reads = worker.turns
        .flatMap((turn) => extractToolCalls(turn.messages))
        .filter((call) => call.toolName === "Read");
      expect(reads).toHaveLength(3);
      for (const read of reads) {
        expect(read.input).toEqual({
          file_path: expect.stringMatching(/<WORKTREE>\/sources\/source-\d{2}\.md$/),
        });
        assert(typeof read.input === "object" && read.input !== null);
        assert("file_path" in read.input && typeof read.input.file_path === "string");
        const path = read.input.file_path;
        expect(covered.has(path)).toBe(false);
        covered.add(path);
      }
      expect(fixtureMeetsCompletion(worker)).toBe(false);
    }
    expect(covered.size).toBe(12);
    expect(fixtureMeetsCompletion(fixtureById(fixtures, "broad-reading-interrupted"))).toBe(false);
    const completed = fixtureById(fixtures, "broad-reading");
    expect(fixtureMeetsCompletion(completed)).toBe(true);
    const dispatches = completed.turns
      .flatMap((turn) => extractToolCalls(turn.messages))
      .filter((call) => call.toolName === "Agent");
    expect(dispatches).toHaveLength(4);
    expect(
      dispatches.every(
        (call) =>
          typeof call.input === "object" &&
          call.input !== null &&
          "model" in call.input &&
          call.input.model === "haiku",
      ),
    ).toBe(true);
  });
});

function firstTurn(fixture: BehaviorFixture) {
  const [turn] = fixture.turns;
  assert(turn, `Missing recorded turn: ${fixture.id}`);
  return turn;
}

function fixtureById(fixtures: BehaviorFixture[], id: string): BehaviorFixture {
  const fixture = fixtures.find((entry) => entry.id === id);
  assert(fixture, `Missing recorded fixture: ${id}`);
  return fixture;
}
