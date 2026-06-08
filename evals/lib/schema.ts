// Schema validator for finding-format.
//
// Wraps ajv against references/finding-format.schema.json. Returns a flat
// list of validation errors per finding instead of throwing — callers want
// every problem surfaced at once, not just the first one.
//
// Why ajv: the schema is JSON Schema Draft 2020-12, ajv handles it
// correctly with `Ajv2020` and the `addFormats` plugin (we don't use any
// formats yet but the dep is cheap and worth having for future fields).

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SCHEMA_PATH = resolve(
  __dirname,
  "../../references/finding-format.schema.json",
);

export type FindingSeverity = "P0" | "P1" | "P2" | "P3";

export type FindingCategory =
  | "security"
  | "design"
  | "hygiene"
  | "test"
  | "feature"
  | "ux"
  | "perf"
  | "a11y";

export type FindingKind = "individual" | "aggregate";

export interface Finding {
  severity: FindingSeverity;
  category: FindingCategory;
  file: string;
  line: number;
  summary: string;
  why: string;
  fix: string;
  kind?: FindingKind;
  tool?: string;
  files_affected?: string[];
  files_affected_count?: number;
  violations_count?: number;
  slice?: string;
  reviewer?: string;
  evidence?: string;
  originating_reviewers?: string[];
  apply_validated?: boolean;
}

export interface ValidationError {
  path: string;
  message: string;
  raw: object;
}

let cachedValidator: ReturnType<Ajv2020["compile"]> | null = null;

function getValidator(): ReturnType<Ajv2020["compile"]> {
  if (cachedValidator !== null) return cachedValidator;

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  // `$id` on the schema confuses ajv when we compile it raw; strip it.
  // Schemas are local to this process and never referenced by URI.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (schema as any).$id;

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}

export function validateFinding(
  candidate: unknown,
): ValidationError[] {
  const validate = getValidator();
  const ok = validate(candidate);
  if (ok) return [];

  return (validate.errors ?? []).map((err) => ({
    path: err.instancePath || err.schemaPath,
    message: err.message ?? "validation failed",
    raw: err as unknown as object,
  }));
}

/** Throws if the candidate doesn't validate. Useful in test setup. */
export function assertFinding(candidate: unknown): asserts candidate is Finding {
  const errors = validateFinding(candidate);
  if (errors.length > 0) {
    const summary = errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`finding failed schema validation: ${summary}`);
  }
}
