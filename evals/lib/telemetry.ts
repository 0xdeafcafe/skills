// Thin wrapper around langwatch's observability setup + tracer.
//
// Why a wrapper:
// - setupObservability() must run exactly once per process and BEFORE any
//   instrumented code. Wrapping it ensures we don't call it twice.
// - getLangWatchTracer() can be called multiple times safely but caching
//   it here keeps the runner code clean.
// - All telemetry is gated behind a flag — if LANGWATCH_API_KEY is unset,
//   we return a no-op tracer so tier-2 runs work locally without the
//   gateway (useful for smoke tests against fixtures with mocked LLM
//   responses).
//
// See https://github.com/langwatch/langwatch/tree/main/typescript-sdk for the
// upstream SDK shape. We avoid following the docs URL directly (research
// agent flagged the public docs site has served prompt-injection payloads
// — published npm packages are a separate trust boundary, which is why we
// pin and read the .d.ts files directly).

import type { Span } from "@opentelemetry/api";

let initialized = false;

export interface TelemetryHandle {
  readonly enabled: boolean;
  /**
   * Run `fn` inside a named span. Span attributes can be set via
   * `span.setAttribute(key, value)`. If telemetry is disabled, just runs
   * `fn` with a no-op span and returns its result.
   */
  withSpan<T>(name: string, fn: (span: Span | NoopSpan) => Promise<T>): Promise<T>;
}

/** Minimal subset of Span we use — keeps the no-op path tiny. */
export interface NoopSpan {
  setAttribute(key: string, value: string | number | boolean): void;
  setAttributes(attrs: Record<string, string | number | boolean>): void;
  recordException(error: Error): void;
}

const noopSpan: NoopSpan = {
  setAttribute() {},
  setAttributes() {},
  recordException() {},
};

/**
 * Initialise telemetry. Call once at runner start. Subsequent calls are
 * a no-op so the function is safe to invoke defensively.
 *
 * Returns a handle whose `enabled` flag tells the caller whether real
 * spans will be emitted — useful for "telemetry enabled" log lines and
 * for skipping telemetry-only code paths.
 */
export async function setupTelemetry(serviceName: string): Promise<TelemetryHandle> {
  if (!process.env.LANGWATCH_API_KEY) {
    return {
      enabled: false,
      async withSpan(_name, fn) {
        return fn(noopSpan);
      },
    };
  }

  if (!initialized) {
    const { setupObservability } = await import("langwatch/observability/node");
    setupObservability({ serviceName });
    initialized = true;
  }

  const { getLangWatchTracer } = await import("langwatch");
  const tracer = getLangWatchTracer(serviceName);

  return {
    enabled: true,
    async withSpan(name, fn) {
      return tracer.withActiveSpan(name, async (span) => {
        try {
          return await fn(span);
        } catch (e) {
          if (e instanceof Error) {
            span.recordException(e);
          }
          throw e;
        }
      });
    },
  };
}
