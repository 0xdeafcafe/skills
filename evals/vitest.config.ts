import { defineConfig } from "vitest/config";

// Default test run — fast unit + dry-run integration tests under lib/.
// Scenarios live under scenarios/ and need their own config (real LLM
// calls and longer timeouts). Use the explicit legacy:scenarios or scenarios:v2 script.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
