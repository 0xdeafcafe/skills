import {
  ClaudeCodeAgentAdapter,
  parseStreamJson,
  type AgentInput,
  type AgentReturnTypes,
  type ClaudeStreamMessage,
} from "@langwatch/scenario";
import { extractAssistantText, extractToolCalls } from "../../fixtures/evidence.ts";
import type { RecordedTurn } from "../../fixtures/format.ts";
import { coordinatorSettings } from "./claude-settings.ts";

export type ToolAction = {
  readonly name: string;
  readonly input: unknown;
};

const STDOUT_PREFIX = "Claude Code stdout: ";

/** Records evidence; the official adapter owns execution and session continuation. */
export class ClaudeCoordinator extends ClaudeCodeAgentAdapter {
  override name = "skills-v2-coordinator";

  readonly turns: RecordedTurn[] = [];
  readonly deniedActions: ToolAction[] = [];
  sessionId?: string;
  model?: string;

  private readonly stdoutChunks: string[];

  constructor(projectPath: string, pluginPath: string, delegation = false) {
    const stdoutChunks: string[] = [];

    super({
      ...coordinatorSettings(projectPath, pluginPath, delegation),
      logger: {
        log(message: unknown) {
          if (typeof message === "string" && message.startsWith(STDOUT_PREFIX)) {
            stdoutChunks.push(message.slice(STDOUT_PREFIX.length));
          }
        },
        // The adapter surfaces failures as exceptions; do not publish raw stderr.
        warn() {},
      },
    });

    this.stdoutChunks = stdoutChunks;
  }

  get actions(): ToolAction[] {
    return this.turns.flatMap(({ messages }) =>
      extractToolCalls(messages).map(({ toolName, input }) => ({ name: toolName, input })),
    );
  }

  get transcript(): string[] {
    return this.turns.map(({ messages }) => extractAssistantText(messages));
  }

  get reportedCostsUsd(): (number | undefined)[] {
    return this.turns.map((turn) => turn.reportedCostUsd);
  }

  override async call(input: AgentInput): Promise<AgentReturnTypes> {
    this.stdoutChunks.length = 0;
    let error: RecordedTurn["error"];

    try {
      return await super.call(input);
    } catch (cause) {
      error = {
        name: "ClaudeCodeTurnError",
        message: "Claude Code turn failed; see terminal status",
      };
      throw cause;
    } finally {
      this.capture(latestUserPrompt(input), error);
      // The converted messages exclude thinking; discard the raw stream.
      this.stdoutChunks.length = 0;
    }
  }

  verification() {
    return {
      sessionId: this.sessionId,
      model: this.model,
      reportedCostsUsd: this.reportedCostsUsd,
      actions: this.actions,
      deniedActions: this.deniedActions,
      transcript: this.transcript,
    };
  }

  private capture(prompt: string, error: RecordedTurn["error"]) {
    const parsed = parseStreamJson(this.stdoutChunks.join(""));
    this.sessionId = parsed.sessionId ?? this.sessionId;
    let reportedCostUsd: number | undefined;

    for (const event of parsed.messages) {
      if (event.type === "system" && event.subtype === "init" && typeof event.model === "string") {
        this.model = event.model;
      }

      if (event.type === "result") {
        if (typeof event.total_cost_usd === "number") {
          reportedCostUsd = event.total_cost_usd;
        }
        this.deniedActions.push(...permissionDenials(event));
      }
    }

    const { subtype, isError } = parsed.result;
    this.turns.push({
      prompt,
      model: this.model,
      reportedCostUsd,
      messages: parsed.modelMessages,
      terminal: subtype ? { subtype, isError: isError ?? false } : undefined,
      error,
    });
  }
}

function latestUserPrompt(input: AgentInput): string {
  const message = [...input.messages].reverse().find((entry) => entry.role === "user");
  return typeof message?.content === "string"
    ? message.content
    : JSON.stringify(message?.content ?? []);
}

function permissionDenials(event: ClaudeStreamMessage): ToolAction[] {
  if (!Array.isArray(event.permission_denials)) return [];

  return event.permission_denials.flatMap((denied: unknown) => {
    if (typeof denied !== "object" || denied === null || !("tool_name" in denied)) return [];
    if (typeof denied.tool_name !== "string" || !("tool_input" in denied)) return [];

    return [{ name: denied.tool_name, input: denied.tool_input }];
  });
}
