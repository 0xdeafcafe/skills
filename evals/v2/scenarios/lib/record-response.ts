import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENARIO_SDK_VERSION } from "@langwatch/scenario";
import type { BehaviorFixture, OutcomeCheck } from "../../fixtures/format.ts";
import { validateFixture, writeFixture } from "../../fixtures/io.ts";
import type { ClaudeCoordinator } from "./claude-coordinator.ts";
import { snapshot, type Fixture, type GitSnapshot } from "./fixture.ts";

const captureDirectory = fileURLToPath(new URL("../../../.captures/", import.meta.url));

export type Recording = {
  fixture: Fixture;
  coordinator: ClaudeCoordinator;
  before: GitSnapshot;
  digest: string;
  source: string;
  artifacts: readonly string[];
  kind: OutcomeCheck["kind"];
  passed: boolean;
  reason?: string;
};

/** Fingerprint the installed instructions, independently of their temporary path. */
export async function instructionDigest(pluginDir: string): Promise<string> {
  const parts: string[] = [];

  async function visit(relative: string): Promise<void> {
    const entries = await readdir(join(pluginDir, relative), { withFileTypes: true });

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const path = join(relative, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (/\.(md|py|json)$/.test(entry.name)) {
        parts.push(`${path}\n${await readFile(join(pluginDir, path), "utf8")}`);
      }
    }
  }

  for (const directory of ["agents", "skills", "references", ".claude-plugin"]) {
    await visit(directory);
  }

  return sha256(parts.join("\n"));
}

export async function recordResponse(recording: Recording): Promise<void> {
  if (process.env.SKILLS_EVAL_RECORD !== "1") return;

  const { fixture, coordinator, before, digest, source, artifacts, kind, passed, reason } =
    recording;
  if (!coordinator.model || coordinator.turns.length === 0) {
    console.warn(`[skills-v2] No recording for ${fixture.id}: model identity or turns unavailable`);
    return;
  }

  const after = await snapshot(fixture);
  const files = await readArtifacts(fixture, artifacts);
  const captured: BehaviorFixture = {
    schemaVersion: 1,
    id: fixture.id,
    provenance: {
      kind: "recorded-model",
      capturedAt: new Date().toISOString(),
      cliVersion: await fixture.exec("claude", "--version"),
      model: coordinator.model,
      sessionId: coordinator.sessionId,
      scenarioPackageVersion: SCENARIO_SDK_VERSION,
      promptDigest: sha256(coordinator.turns.map((turn) => turn.prompt).join("\n")),
      instructionDigest: digest,
      normalizations: [
        "Known worktree, plugin and home paths replaced with <WORKTREE>, <PLUGIN_ROOT> and <HOME>.",
        "Thinking excluded by the official adapter; tool results use its default 8000-character cap.",
      ],
    },
    context: { caseId: fixture.id, repoTemplate: source },
    turns: coordinator.turns,
    evidence: {
      git: {
        headBefore: before.head,
        headAfter: after.head,
        mergeHeadBefore: before.mergeHead,
        mergeHeadAfter: after.mergeHead,
        unmergedPaths: after.unmergedPaths,
        indexEntries: after.indexEntries,
        files,
      },
      checks: [
        {
          id: `${fixture.id}-postconditions`,
          kind,
          required: true,
          passed,
          observed: { before, after, reason: reason ?? "Scenario assertions passed" },
        },
      ],
    },
    outcome: { expected: passed ? "pass" : "fail", reason },
  };

  const normalized: unknown = JSON.parse(normalizePaths(JSON.stringify(captured), fixture));
  validateFixture(normalized);
  const destination = await writeFixture(captureDirectory, normalized);
  console.info(`[skills-v2] Captured ${fixture.id} for review: ${destination}`);
}

async function readArtifacts(
  fixture: Fixture,
  paths: readonly string[],
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  for (const path of paths) {
    try {
      files[path] = await fixture.read(path);
    } catch (error) {
      // Missing output is expected evidence when a turn fails before writing it.
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }

  return files;
}

function normalizePaths(value: string, fixture: Fixture): string {
  return value
    .replaceAll(fixture.path, "<WORKTREE>")
    .replaceAll(fixture.pluginDir, "<PLUGIN_ROOT>")
    .replaceAll(homedir(), "<HOME>");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
