/**
 * Typed error base helpers using Data.TaggedError.
 *
 * Provides reusable error base classes for common error patterns
 * across Effect services. All errors carry a `_tag` discriminant
 * for pattern matching and typed error channels.
 */
import { Data } from 'effect';

/**
 * Base class for "not found" errors.
 *
 * Use this when an entity lookup fails. Service layers can extend
 * this to create domain-specific not-found errors.
 *
 * @example
 * ```ts
 * import { NotFoundError } from "@nivalis/utils"
 *
 * // The error is already concrete — use directly:
 * new NotFoundError({ message: "Invoice abc not found" })
 * ```
 */
export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly message: string;
}> {}

/**
 * Base class for authentication/authorization errors.
 *
 * @example
 * ```ts
 * import { UnauthorizedError } from "@nivalis/utils"
 *
 * new UnauthorizedError({ message: "Missing session" })
 * ```
 */
export class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<{
  readonly message: string;
}> {}

/**
 * Base class for validation errors.
 *
 * @example
 * ```ts
 * import { ValidationError } from "@nivalis/utils"
 *
 * new ValidationError({ message: "Invalid email format", field: "email" })
 * ```
 */
export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly message: string;
  readonly field?: string;
}> {}

/**
 * Base class for external service / network errors.
 *
 * Wrap SDK/HTTP errors in this so consumers see a typed error
 * in the Effect error channel.
 *
 * @example
 * ```ts
 * import { ServiceError } from "@nivalis/utils"
 *
 * new ServiceError({ message: "Firecrawl API returned 500", cause: rawError })
 * ```
 */
export class ServiceError extends Data.TaggedError('ServiceError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
