// Wraps a Claude Code session as a Scenario AgentAdapter so the framework
// can drive a multi-turn conversation against it. The first turn injects
// the slash command (`/start-discussion`, `/plan-change`, etc.) into the
// user's opener; subsequent turns resume the same SDK session so we don't
// replay history through tokens we already paid for.
//
// Session state lives in adapter instance fields — Scenario calls `call()`
// stateless, but we keep `sessionId` across turns so we can pass it back
// via the SDK's `resume` option.

import {
  AbortError,
  query,
  type Options,
  type SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { AgentAdapter, AgentRole } from "@langwatch/scenario";
import type { AgentInput, AgentReturnTypes } from "@langwatch/scenario";

import { buildSubprocessEnv, DEFAULT_ALLOWED_TOOLS } from "../../lib/claude-invoke.ts";

const DEFAULT_TURN_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_MAX_BUDGET_USD = 1.5;

export type ClaudeCodeAdapterOptions = {
  /**
   * Working directory the SDK launches claude in. Use a fresh temp dir per
   * scenario so one test's filesystem mutations can't leak into another.
   */
  readonly cwd: string;
  /**
   * Absolute path to the local plugin under test. Loaded via
   * `plugins: [{type:'local', path}]` so the scenario pins the *current*
   * skill code, not whatever stale snapshot the user has installed
   * globally.
   */
  readonly pluginDir: string;
  /**
   * Slash command to invoke at the start of the conversation
   * (e.g. `/start-discussion`). Prepended to the first user message.
   */
  readonly slashCommand: string;
  /**
   * Names of skills to load into the session. Pass the single skill
   * we want to evaluate to prevent claude-code's auto-discovery from
   * picking a different skill based on the user's natural language
   * (e.g. "I want to add X" would otherwise trigger /plan-change's
   * description, ignoring the `/start-feature` slash prefix).
   *
   * Use exact SKILL.md `name:` values. Omit to load all discovered
   * skills (default claude-code behaviour).
   */
  readonly skills?: readonly string[];
  readonly allowedTools?: readonly string[];
  readonly maxBudgetUsd?: number;
  readonly turnTimeoutMs?: number;
};

const extractText = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((p): p is { type: "text"; text: string } =>
        typeof p === "object" && p !== null && "type" in p && p.type === "text",
      )
      .map((p) => p.text)
      .join("\n");
  }
  return "";
};

export class ClaudeCodeAdapter extends AgentAdapter {
  override role = AgentRole.AGENT;

  private sessionId: string | null = null;
  private readonly opts: ClaudeCodeAdapterOptions;

  constructor(opts: ClaudeCodeAdapterOptions) {
    super();
    this.opts = opts;
  }

  override async call(input: AgentInput): Promise<AgentReturnTypes> {
    const lastUser = [...input.newMessages, ...input.messages]
      .filter((m) => m.role === "user")
      .at(-1);
    if (!lastUser) return null;

    const userText = extractText(lastUser.content);
    const prompt =
      this.sessionId === null
        ? `${this.opts.slashCommand}\n\n${userText}`
        : userText;

    const env = buildSubprocessEnv();
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      this.opts.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS,
    );

    const options: Options = {
      cwd: this.opts.cwd,
      allowedTools: [...(this.opts.allowedTools ?? DEFAULT_ALLOWED_TOOLS)],
      maxBudgetUsd: this.opts.maxBudgetUsd ?? DEFAULT_MAX_BUDGET_USD,
      env,
      abortController,
      plugins: [{ type: "local", path: this.opts.pluginDir }],
      ...(this.opts.skills ? { skills: [...this.opts.skills] } : {}),
      ...(this.sessionId ? { resume: this.sessionId } : {}),
    };

    let result: SDKResultMessage | null = null;
    try {
      for await (const message of query({ prompt, options })) {
        if (message.type === "result") {
          result = message;
          break;
        }
      }
    } catch (err) {
      if (!(err instanceof AbortError)) throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (result === null) {
      throw new Error(
        `claude session yielded no result message (timeout or stream ended early). cwd=${this.opts.cwd}`,
      );
    }

    this.sessionId = result.session_id;

    if (result.subtype !== "success") {
      throw new Error(
        `claude session ended in ${result.subtype}: ${result.errors.join("; ")}`,
      );
    }

    return result.result;
  }
}
