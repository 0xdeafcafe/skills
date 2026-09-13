import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["v2/unit/**/*.test.ts"],
    testTimeout: 10_000,
  },
});
