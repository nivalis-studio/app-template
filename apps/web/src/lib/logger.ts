import pino from 'pino';

/**
 * Configured pino logger instance.
 *
 * - Reads `LOG_LEVEL` from environment (defaults to `'info'`).
 * - In development, outputs newline-delimited JSON to stdout via `pino/file`.
 * - In production, uses pino's default (high-throughput) destination.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
});
