import type { ClaudeCoordinator, ToolAction } from "./claude-coordinator.ts";
import type { Fixture } from "./fixture.ts";

export function loadedSkill(actions: readonly ToolAction[], skill: string): boolean {
  return actions.some(({ name, input }) => {
    if (name !== "Skill" || typeof input !== "object" || input === null) return false;
    if (!("skill" in input) || typeof input.skill !== "string") return false;
    return input.skill.replace(/^[\w-]+:/, "") === skill;
  });
}

export function bashCommands(actions: readonly ToolAction[]): string[] {
  return actions.flatMap(({ name, input }) => {
    if (name !== "Bash" || typeof input !== "object" || input === null) return [];
    if (!("command" in input) || typeof input.command !== "string") return [];
    return [input.command];
  });
}

export function recordEntries(markdown: string): string[] {
  return markdown
    .split(/\n(?=(?:[-*+]|\d+\.) |\||#{1,6} )|\n[ \t]*\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function recordBlocks(markdown: string): string[] {
  const sections = markdown
    .split(/\n(?=#{1,6} )/)
    .map((section) => section.trim())
    .filter(Boolean);
  return [...new Set([...recordEntries(markdown), ...sections])];
}

export async function untrackedFiles(fixture: Fixture): Promise<string[]> {
  const listed = await fixture.git("ls-files", "--others", "--exclude-standard");
  return listed.split("\n").filter(Boolean);
}

export async function trackedChanges(fixture: Fixture): Promise<string[]> {
  const status = await fixture.git("status", "--porcelain", "--untracked-files=no");
  return status.split("\n").filter(Boolean);
}

export async function writtenAnswer(
  fixture: Fixture,
  coordinator: ClaudeCoordinator,
  exclude: readonly string[] = [],
): Promise<string> {
  const notes: string[] = [];
  for (const path of await untrackedFiles(fixture)) {
    if (/\.(?:md|txt)$/i.test(path) && !exclude.includes(path)) {
      notes.push(await fixture.read(path));
    }
  }
  return [...coordinator.transcript, ...notes].join("\n");
}
