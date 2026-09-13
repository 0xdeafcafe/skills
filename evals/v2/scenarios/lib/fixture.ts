import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { onTestFinished } from "vitest";

const execute = promisify(execFile);
const pluginSource = fileURLToPath(new URL("../../../../", import.meta.url));
const pluginComponents = ["agents", "skills", "references", ".claude-plugin"];

export type Fixture = {
  readonly id: string;
  readonly path: string;
  readonly pluginDir: string;
  git(...args: string[]): Promise<string>;
  exec(command: string, ...args: string[]): Promise<string>;
  read(path: string): Promise<string>;
  write(path: string, contents: string): Promise<void>;
};

export type GitSnapshot = {
  head: string;
  mergeHead: string | null;
  indexEntries: string[];
  unmergedPaths: string[];
  status: string;
};

/** A disposable project and plugin copy, cleaned up even when test setup fails. */
export async function makeFixture(id: string): Promise<Fixture> {
  const parent = await realpath(await mkdtemp(join(tmpdir(), `skills-v2-${id}-`)));
  onTestFinished(() => rm(parent, { recursive: true, force: true }));

  const path = join(parent, "project");
  const pluginDir = join(parent, "plugin");
  await mkdir(path);

  for (const component of pluginComponents) {
    await cp(join(pluginSource, component), join(pluginDir, component), { recursive: true });
  }

  const exec = async (command: string, ...args: string[]) => {
    const { stdout } = await execute(command, args, { cwd: path, env: isolatedGitEnvironment() });
    return stdout.trim();
  };

  const fixture: Fixture = {
    id,
    path,
    pluginDir,
    exec,
    git: (...args) => exec("git", ...args),
    read: (relative) => readFile(projectFile(path, relative), "utf8"),
    async write(relative, contents) {
      const target = projectFile(path, relative);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents, "utf8");
    },
  };

  await fixture.git("init", "-q", "-b", "main");
  await fixture.git("config", "user.name", "Skills Eval");
  await fixture.git("config", "user.email", "skills-eval@example.invalid");
  await fixture.git("config", "commit.gpgsign", "false");
  await fixture.git("config", "core.hooksPath", "/dev/null");

  await fixture.write("README.md", `# ${id}\n`);
  await fixture.write("CLAUDE.md", projectInstructions(path));
  await fixture.git("add", "README.md", "CLAUDE.md");
  await fixture.git("commit", "-qm", "initial fixture");

  return fixture;
}

export async function snapshot(fixture: Fixture): Promise<GitSnapshot> {
  const [head, mergeHead, index, unmerged, status] = await Promise.all([
    fixture.git("rev-parse", "HEAD"),
    fixture.git("rev-parse", "--verify", "--quiet", "MERGE_HEAD").catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === 1) return null;
      throw error;
    }),
    fixture.git("ls-files", "--stage"),
    fixture.git("diff", "--name-only", "--diff-filter=U"),
    fixture.git("status", "--porcelain"),
  ]);

  return {
    head,
    mergeHead,
    indexEntries: index.split("\n").filter(Boolean),
    unmergedPaths: unmerged.split("\n").filter(Boolean),
    status,
  };
}

function projectFile(projectPath: string, relative: string): string {
  const target = resolve(projectPath, relative);
  if (!target.startsWith(`${projectPath}${sep}`)) {
    throw new Error(`Fixture path escapes the project: ${relative}`);
  }
  return target;
}

function isolatedGitEnvironment(): NodeJS.ProcessEnv {
  const inherited = Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"));
  return {
    ...Object.fromEntries(inherited),
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
  };
}

function projectInstructions(path: string): string {
  return `# Project boundary

The project for this request is exactly ${path}.
This temporary Git repository is intentional and complete for the task.
Save requested artifacts here. The sibling plugin contains read-only instructions.
Do not inspect home directories or shell history, look for another project,
or modify files outside this repository.
`;
}
