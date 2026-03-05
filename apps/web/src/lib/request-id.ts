import { logger } from '@/lib/logger';

/**
 * Extract an existing `X-Request-ID` header or generate a new one.
 *
 * @param headers - Incoming request headers.
 * @returns The request ID string (either forwarded or freshly generated).
 */
export const getRequestId = (headers: Headers): string =>
  headers.get('x-request-id') ?? crypto.randomUUID();

/**
 * Create a pino child logger bound to a specific request ID.
 *
 * Usage in an API route handler:
 * ```ts
 * const log = createRequestLogger(request.headers);
 * log.info('handling request');
 * ```
 *
 * Every log entry produced by the child logger will include the
 * `requestId` field automatically.
 */
export const createRequestLogger = (headers: Headers) => {
  const requestId = getRequestId(headers);

  return logger.child({ requestId });
};
