/**
 * Shared Google OAuth2 authentication service.
 *
 * This service manages OAuth2 credentials for Google API access.
 * It is the shared dependency for GoogleSheets, GoogleCalendar, and Gmail.
 *
 * Reads GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN
 * from Effect Config. The OAuth2 client automatically refreshes access
 * tokens when they expire.
 */
import { Config, Context, Effect, Layer } from 'effect';
import { google } from 'googleapis';
import { GoogleAuthError } from './errors.ts';

/**
 * The Google auth client type derived from the googleapis library.
 */
type GoogleOAuthClient = InstanceType<typeof google.auth.OAuth2>;

/**
 * Domain type representing the authenticated Google client.
 */
export type GoogleAuthClient = {
  /** The underlying auth client for use with googleapis. */
  readonly client: GoogleOAuthClient;
};

/**
 * Service interface for Google authentication.
 */
export type GoogleAuthService = {
  /** Returns the authenticated OAuth2 client. */
  readonly getClient: Effect.Effect<GoogleAuthClient, GoogleAuthError>;
};

/**
 * Service tag for GoogleAuth.
 *
 * @example
 * ```ts
 * import { GoogleAuth } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const auth = yield* GoogleAuth
 *   const { client } = yield* auth.getClient
 *   // Use client with googleapis
 * })
 * ```
 */
export const GoogleAuth = Context.GenericTag<GoogleAuthService>('GoogleAuth');

/**
 * Live layer for GoogleAuth service.
 *
 * Reads credentials from Effect Config:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REFRESH_TOKEN
 *
 * Missing config values will produce a ConfigError at layer construction time.
 */
export const GoogleAuthLive = Layer.effect(
  GoogleAuth,
  Effect.gen(function* () {
    const clientId = yield* Config.string('GOOGLE_CLIENT_ID');
    const clientSecret = yield* Config.string('GOOGLE_CLIENT_SECRET');
    const refreshToken = yield* Config.string('GOOGLE_REFRESH_TOKEN');

    const authClient = new google.auth.OAuth2(clientId, clientSecret);

    authClient.setCredentials({
      refresh_token: refreshToken,
    });

    return GoogleAuth.of({
      getClient: Effect.try({
        try: () => ({ client: authClient }),
        catch: error =>
          new GoogleAuthError({
            message: 'Failed to get Google auth client',
            cause: error,
          }),
      }),
    });
  }),
);
