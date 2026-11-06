import type { ModelMessage } from "ai";
import type { z } from "zod";
import type {
  behaviorFixtureSchema,
  observationSchema,
  outcomeCheckSchema,
  recordedTurnSchema,
} from "./schema.ts";

// Storage types and runtime validation share one definition. Message validation
// follows the same AI SDK contract as Scenario's official Claude adapter.
export type StoredModelMessage = ModelMessage;
export type BehaviorFixture = z.infer<typeof behaviorFixtureSchema>;
export type FixtureProvenance = BehaviorFixture["provenance"];
export type RecordedTurn = z.infer<typeof recordedTurnSchema>;
export type ObservationEvidence = z.infer<typeof observationSchema>;
export type OutcomeCheck = z.infer<typeof outcomeCheckSchema>;
