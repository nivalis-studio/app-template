import { type Counter, type Histogram, metrics } from '@opentelemetry/api';

/**
 * Application metrics helpers built on OpenTelemetry.
 *
 * The `@vercel/otel` package (registered in `instrumentation.ts`) bootstraps
 * the SDK and exporters automatically on Vercel.  These helpers give the rest
 * of the codebase a thin, typed wrapper for recording custom metrics.
 *
 * Sentry already captures distributed traces (`tracesSampleRate: 1.0` in
 * `sentry.server.config.ts`), so we only need OpenTelemetry for *metrics*
 * that fall outside Sentry's built-in instrumentation.
 */

const meter = metrics.getMeter('nivalis-web');

// ── Counters ─────────────────────────────────────────────

/** Counts every inbound HTTP request (increment in middleware / route). */
export const httpRequestCounter: Counter = meter.createCounter(
  'http.requests.total',
  { description: 'Total number of HTTP requests received' },
);

/** Counts authentication events (sign-in, sign-out, failures). */
export const authEventCounter: Counter = meter.createCounter(
  'auth.events.total',
  { description: 'Total authentication events' },
);

/** Counts AI model invocations across all providers. */
export const aiInvocationCounter: Counter = meter.createCounter(
  'ai.invocations.total',
  { description: 'Total AI model invocations' },
);

// ── Histograms ───────────────────────────────────────────

/** Records HTTP response latency in milliseconds. */
export const httpLatencyHistogram: Histogram = meter.createHistogram(
  'http.request.duration_ms',
  {
    description: 'HTTP request duration in milliseconds',
    unit: 'ms',
  },
);

/** Records AI model response latency in milliseconds. */
export const aiLatencyHistogram: Histogram = meter.createHistogram(
  'ai.request.duration_ms',
  {
    description: 'AI model request duration in milliseconds',
    unit: 'ms',
  },
);

// ── Convenience helpers ──────────────────────────────────

/**
 * Record an HTTP request metric with common attributes.
 *
 * @example
 * ```ts
 * recordHttpRequest({ method: 'GET', route: '/api/chat', status: 200, durationMs: 42 });
 * ```
 */
export function recordHttpRequest(attrs: {
  method: string;
  route: string;
  status: number;
  durationMs: number;
}) {
  const { method, route, status, durationMs } = attrs;

  httpRequestCounter.add(1, {
    'http.method': method,
    'http.route': route,
    'http.status_code': status,
  });

  httpLatencyHistogram.record(durationMs, {
    'http.method': method,
    'http.route': route,
  });
}

/**
 * Record an AI invocation metric.
 *
 * @example
 * ```ts
 * recordAiInvocation({ provider: 'openai', model: 'gpt-4o', durationMs: 1200 });
 * ```
 */
export function recordAiInvocation(attrs: {
  provider: string;
  model: string;
  durationMs: number;
}) {
  const { provider, model, durationMs } = attrs;

  aiInvocationCounter.add(1, {
    'ai.provider': provider,
    'ai.model': model,
  });

  aiLatencyHistogram.record(durationMs, {
    'ai.provider': provider,
    'ai.model': model,
  });
}
