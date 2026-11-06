// @langwatch/scenario resolves scenario.config.mjs only from cwd.
// Vitest imports this before tests and Scenario loads its config lazily.
process.chdir(new URL("./", import.meta.url).pathname);
