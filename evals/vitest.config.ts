import { defineConfig } from "vitest/config";

// Default test run — fast unit + dry-run integration tests under lib/.
// Scenarios live under scenarios/ and need their own config (real LLM
// calls, longer timeouts, Scenario's reporter). Run via `pnpm scenarios`.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
