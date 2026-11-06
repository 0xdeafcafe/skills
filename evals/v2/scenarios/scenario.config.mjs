import { defineConfig } from "@langwatch/scenario";

// The v2 suite uses scripted turns and deterministic assertions, so it has no
// simulator/judge model. Keeping this local config prevents the legacy v1
// credential-dependent config in evals/ from being imported.
export default defineConfig({});
