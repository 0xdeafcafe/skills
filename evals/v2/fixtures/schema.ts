import { modelMessageSchema } from "ai";
import { z } from "zod";

const nonemptyString = z.string().min(1);

const provenanceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("recorded-model"),
    capturedAt: z.iso.datetime({ offset: true }),
    cliVersion: nonemptyString,
    model: nonemptyString,
    scenarioPackageVersion: nonemptyString,
    promptDigest: nonemptyString,
    instructionDigest: nonemptyString,
    sessionId: z.string().optional(),
    normalizations: z.array(z.string()).optional(),
  }),
  z.object({
    kind: z.literal("derived-mutation"),
    sourceFixtureId: nonemptyString,
    mutation: nonemptyString,
  }),
  z.object({
    kind: z.literal("synthetic"),
    purpose: nonemptyString,
  }),
]);

export const recordedTurnSchema = z.object({
  prompt: z.string(),
  messages: z.array(modelMessageSchema),
  model: z.string().optional(),
  reportedCostUsd: z.number().nonnegative().optional(),
  bashCommands: z.array(z.string()).optional(),
  terminal: z
    .object({
      subtype: nonemptyString,
      isError: z.boolean(),
    })
    .optional(),
  error: z
    .object({
      name: nonemptyString,
      message: z.string(),
    })
    .optional(),
});

export const observationSchema = z.object({
  id: nonemptyString,
  mandatory: z.boolean(),
  disposition: z.enum(["addressed", "open-in-scope", "follow-up", "disproved"]),
  reviewed: z.boolean(),
  evidence: z.string().optional(),
});

export const outcomeCheckSchema = z.object({
  id: nonemptyString,
  kind: z.enum(["git-postcondition", "file-content", "runtime", "tool-action"]),
  required: z.boolean(),
  passed: z.boolean(),
  observed: z.unknown(),
});

export const behaviorFixtureSchema = z.object({
  schemaVersion: z.literal(1),
  id: nonemptyString.regex(/^[a-z0-9][a-z0-9._-]*$/, "Expected a stable lowercase slug"),
  provenance: provenanceSchema,
  context: z.object({
    caseId: nonemptyString,
    repoTemplate: z.string().optional(),
    notes: z.string().optional(),
  }),
  turns: z.array(recordedTurnSchema).min(1),
  evidence: z.object({
    git: z
      .object({
        headBefore: z.string(),
        headAfter: z.string(),
        mergeHeadBefore: z.string().nullable().optional(),
        mergeHeadAfter: z.string().nullable().optional(),
        unmergedPaths: z.array(z.string()).optional(),
        indexEntries: z.array(z.string()).optional(),
        files: z.record(z.string(), z.string()).optional(),
      })
      .optional(),
    observations: z.array(observationSchema).optional(),
    checks: z.array(outcomeCheckSchema),
  }),
  outcome: z.object({
    expected: z.enum(["pass", "fail"]),
    reason: z.string().optional(),
  }),
});
