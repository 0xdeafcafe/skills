import { describe, expect, it } from "vitest";

import { buildSubprocessEnv } from "../claude-invoke.ts";

describe("buildSubprocessEnv — credential precedence", () => {
  it("prefers gateway routing (LANGWATCH_GATEWAY_URL + LANGWATCH_VIRTUAL_AI_KEY) over everything else", () => {
    // Note the seam: scenarios + claude-code subprocess both consume the
    // *gateway* URL, not LANGWATCH_ENDPOINT (which is the dashboard origin).
    // Mixing them up silently 200s the dashboard SPA back at JSON parsers.
    const env = buildSubprocessEnv({
      LANGWATCH_GATEWAY_URL: "https://gateway.example/v1",
      LANGWATCH_VIRTUAL_AI_KEY: "vk-lw-test",
      LOCAL_ANTHROPIC_API_KEY: "sk-local",
      ANTHROPIC_API_KEY: "sk-bare",
    });
    expect(env.ANTHROPIC_BASE_URL).toBe("https://gateway.example/v1");
    expect(env.ANTHROPIC_AUTH_TOKEN).toBe("vk-lw-test");
  });

  it("accepts ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN as direct gateway override", () => {
    const env = buildSubprocessEnv({
      ANTHROPIC_BASE_URL: "https://gw.example/v1",
      ANTHROPIC_AUTH_TOKEN: "direct-token",
    });
    expect(env.ANTHROPIC_BASE_URL).toBe("https://gw.example/v1");
    expect(env.ANTHROPIC_AUTH_TOKEN).toBe("direct-token");
  });

  it("falls back to LOCAL_ANTHROPIC_API_KEY when gateway vars are missing", () => {
    const env = buildSubprocessEnv({
      LOCAL_ANTHROPIC_API_KEY: "sk-bypass",
    });
    expect(env.ANTHROPIC_API_KEY).toBe("sk-bypass");
    // The bypass should *not* keep any gateway URL set — claude must talk
    // directly to Anthropic, not whatever stale URL was lying around.
    expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
    expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
  });

  it("strips an inherited ANTHROPIC_BASE_URL when falling back to the local bypass", () => {
    // Edge case: the user has the gateway URL set in their shell, but no key,
    // and they're using the local bypass. The fallback must reset the URL or
    // claude will keep dialling the (unreachable) gateway with the wrong auth.
    const env = buildSubprocessEnv({
      ANTHROPIC_BASE_URL: "https://stale.example/v1",
      LOCAL_ANTHROPIC_API_KEY: "sk-bypass",
    });
    expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
    expect(env.ANTHROPIC_API_KEY).toBe("sk-bypass");
  });

  it("throws when no credentials are configured at all", () => {
    expect(() => buildSubprocessEnv({})).toThrow(/no Claude credentials/);
  });

  it("throws when the gateway URL is set but the auth token isn't", () => {
    expect(() =>
      buildSubprocessEnv({ LANGWATCH_GATEWAY_URL: "https://gw.example/v1" }),
    ).toThrow(/no Claude credentials/);
  });

  it("preserves unrelated env vars verbatim", () => {
    const env = buildSubprocessEnv({
      LOCAL_ANTHROPIC_API_KEY: "sk-bypass",
      PATH: "/usr/bin:/bin",
      HOME: "/Users/test",
    });
    expect(env.PATH).toBe("/usr/bin:/bin");
    expect(env.HOME).toBe("/Users/test");
  });
});
