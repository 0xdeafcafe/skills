import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["v2/scenarios/**/*.scenario.test.ts"],
    setupFiles: [new URL("./setup.ts", import.meta.url).pathname],
    testTimeout: Number(process.env.SKILLS_EVAL_TEST_TIMEOUT_MS ?? 240_000),
    hookTimeout: 30_000,
    sequence: { concurrent: false },
  },
});
