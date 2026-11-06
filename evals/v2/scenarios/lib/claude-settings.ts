import { homedir } from "node:os";
import type { ClaudeCodeAgentAdapterConfig } from "@langwatch/scenario";

export function coordinatorSettings(
  projectPath: string,
  pluginPath: string,
  delegation: boolean,
): ClaudeCodeAgentAdapterConfig {
  const home = homedir();
  const tools = ["Bash", "Read", "Grep", "Glob", "Edit", "Write", "Skill"];
  const allowedTools = [
    "Bash",
    "Read",
    "Grep",
    "Glob",
    "Skill",
    // Claude permission paths use // for an absolute filesystem path.
    `Edit(/${projectPath}/**)`,
    `Write(/${projectPath}/**)`,
  ];

  if (delegation) {
    tools.push("Agent");
    allowedTools.push("Agent");
  }

  const settings = {
    disableAllHooks: true,
    permissions: {
      deny: [`Read(/${home}/**)`, `Edit(/${home}/**)`],
    },
    sandbox: {
      enabled: true,
      autoAllowBashIfSandboxed: true,
      allowUnsandboxedCommands: false,
      filesystem: {
        denyRead: [home],
        denyWrite: [home, pluginPath],
      },
      network: { allowedDomains: [] },
    },
  };

  return {
    workingDirectory: projectPath,
    output: "messages",
    timeout: Number(process.env.SKILLS_EVAL_TURN_TIMEOUT_MS ?? 180_000),
    replayOnLostSession: false,
    model: process.env.SKILLS_EVAL_MODEL,
    env: isolatedClaudeEnvironment(),
    extraArgs: [
      "--agent",
      "skills:coordinator",
      "--plugin-dir",
      pluginPath,
      "--setting-sources",
      "",
      "--settings",
      JSON.stringify(settings),
      "--strict-mcp-config",
      "--mcp-config",
      JSON.stringify({ mcpServers: {} }),
      "--tools",
      tools.join(","),
      "--allowedTools",
      allowedTools.join(","),
      "--max-budget-usd",
      process.env.SKILLS_EVAL_MAX_BUDGET_USD ?? "1.5",
      "--max-turns",
      process.env.SKILLS_EVAL_MAX_TURNS ?? "30",
    ],
  };
}

function isolatedClaudeEnvironment(): Record<string, string | undefined> {
  const overrides: Record<string, string | undefined> = {};

  for (const key of Object.keys(process.env)) {
    if (key.startsWith("LANGWATCH_") || key.startsWith("GIT_")) {
      overrides[key] = undefined;
    }
  }

  return {
    ...overrides,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
  };
}
