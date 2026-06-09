// Shape of one row in the `skills-eval-fixtures` LangWatch dataset.
//
// Single source of truth so the upload-dataset writer and the
// run-pipeline reader can't drift.

export type DatasetRow = {
  readonly fixture_name: string;
  readonly reviewer_skill: string;
  readonly diff_patch: string;
  /** JSON-encoded slice of expected.findings.json for this reviewer. */
  readonly expected_findings: string;
  /** JSON-encoded list of categories the fixture plants. */
  readonly planted_smells: string;
  readonly notes: string;
  readonly fixture_version: string;
};

export const DATASET_COLUMNS: readonly {
  readonly name: string;
  readonly type: string;
}[] = [
  { name: "fixture_name", type: "string" },
  { name: "reviewer_skill", type: "string" },
  { name: "diff_patch", type: "string" },
  { name: "expected_findings", type: "string" },
  { name: "planted_smells", type: "string" },
  { name: "notes", type: "string" },
  { name: "fixture_version", type: "string" },
];
