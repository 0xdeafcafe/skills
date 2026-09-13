import type {
  BehaviorFixture,
  ObservationEvidence,
  RecordedTurn,
  StoredModelMessage,
} from "./format.ts";

export type ToolCall = {
  toolCallId: string;
  toolName: string;
  input: unknown;
};

export function extractToolCalls(messages: readonly StoredModelMessage[]): ToolCall[] {
  const calls: ToolCall[] = [];

  for (const message of messages) {
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type !== "tool-call") continue;
      calls.push({ toolCallId: part.toolCallId, toolName: part.toolName, input: part.input });
    }
  }

  return calls;
}

export function extractBashCommands(messages: readonly StoredModelMessage[]): string[] {
  return extractToolCalls(messages)
    .filter((call) => call.toolName === "Bash")
    .flatMap((call) => {
      if (typeof call.input !== "object" || call.input === null) return [];
      if (!("command" in call.input) || typeof call.input.command !== "string") return [];
      return [call.input.command];
    });
}

export function extractToolErrors(messages: readonly StoredModelMessage[]): string[] {
  const errors: string[] = [];

  for (const message of messages) {
    if (message.role !== "tool" || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type !== "tool-result" || part.output.type !== "error-text") continue;
      errors.push(part.output.value);
    }
  }

  return errors;
}

export function extractAssistantText(messages: readonly StoredModelMessage[]): string {
  return messages
    .flatMap((message) => {
      if (message.role !== "assistant") return [];
      if (typeof message.content === "string") return [message.content];
      return message.content.flatMap((part) => (part.type === "text" ? [part.text] : []));
    })
    .join("\n");
}

export function unresolvedMandatory(
  observations: readonly ObservationEvidence[] = [],
): ObservationEvidence[] {
  return observations.filter((observation) => {
    if (!observation.mandatory) return false;
    if (!observation.reviewed) return true;
    if (observation.disposition === "open-in-scope") return true;
    if (observation.disposition === "follow-up") return true;
    return !observation.evidence?.trim();
  });
}

export function turnHasTerminalData(turn: RecordedTurn): boolean {
  return (
    turn.terminal?.subtype === "success" &&
    !turn.terminal.isError &&
    turn.error === undefined &&
    turn.messages.length > 0
  );
}

export function fixtureMeetsCompletion(fixture: BehaviorFixture): boolean {
  if (!fixture.turns.every(turnHasTerminalData)) return false;
  if (unresolvedMandatory(fixture.evidence.observations).length > 0) return false;

  const requiredChecks = fixture.evidence.checks.filter((check) => check.required);
  return requiredChecks.length > 0 && requiredChecks.every((check) => check.passed);
}

export function deriveMutation(
  fixture: BehaviorFixture,
  mutation: string,
  transform: (copy: BehaviorFixture) => void,
): BehaviorFixture {
  const copy = structuredClone(fixture);
  copy.id = `${fixture.id}.mutation`;
  copy.provenance = { kind: "derived-mutation", sourceFixtureId: fixture.id, mutation };
  transform(copy);
  return copy;
}
