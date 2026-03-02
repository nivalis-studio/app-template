/**
 * Base error patterns for @nivalis/ai services.
 *
 * Each AI connector defines its own tagged error extending these patterns.
 * All errors use `Data.TaggedError` for typed error channels in Effect.
 */
import { Data } from 'effect';

/**
 * Error for Google authentication failures.
 *
 * Thrown when OAuth2 credentials are invalid, expired, or
 * when the Google auth client cannot be created.
 *
 * @example
 * ```ts
 * new GoogleAuthError({ message: "Invalid refresh token" })
 * ```
 */
export class GoogleAuthError extends Data.TaggedError('GoogleAuthError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
