import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { BehaviorFixture } from "./format.ts";
import { behaviorFixtureSchema } from "./schema.ts";

const FIXTURE_SUFFIX = ".fixture.json";

export function validateFixture(value: unknown): asserts value is BehaviorFixture {
  const result = behaviorFixtureSchema.safeParse(value);
  if (result.success) return;

  const details = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid fixture:\n${details.join("\n")}`);
}

/** Preserve the reviewed payload exactly; capture performs explicit normalization. */
export async function writeFixture(directory: string, fixture: BehaviorFixture): Promise<string> {
  validateFixture(fixture);

  // The validated slug contains no path separators or traversal segments.
  const target = join(directory, `${fixture.id}${FIXTURE_SUFFIX}`);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await mkdir(directory, { recursive: true });

  try {
    await writeFile(temporary, `${JSON.stringify(fixture, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }

  return target;
}

export async function loadFixture(path: string): Promise<BehaviorFixture> {
  if (!basename(path).endsWith(FIXTURE_SUFFIX)) {
    throw new Error(`Fixture filename must end in ${FIXTURE_SUFFIX}`);
  }

  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  validateFixture(value);
  return value;
}

export async function loadRecordedCorpus(directory: string): Promise<BehaviorFixture[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  });
  const paths = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(FIXTURE_SUFFIX))
    .map((entry) => join(directory, entry.name))
    .sort();

  const fixtures = await Promise.all(paths.map(loadFixture));
  const recorded = fixtures.filter((fixture) => fixture.provenance.kind === "recorded-model");

  if (recorded.length === 0) {
    throw new Error(
      `No recorded-model fixtures found in ${relative(process.cwd(), directory) || directory}`,
    );
  }

  return recorded;
}
