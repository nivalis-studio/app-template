/**
 * Google Sheets connector as an Effect service.
 *
 * Provides readRange, writeRange, and appendRows operations using the
 * googleapis SDK. All SDK types are wrapped in domain types to avoid
 * SDK type leakage.
 *
 * Depends on the shared GoogleAuth service for OAuth2 client.
 *
 * @example
 * ```ts
 * import { GoogleSheetsService, GoogleSheetsLive, GoogleAuthLive } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const sheets = yield* GoogleSheetsService
 *   const data = yield* sheets.readRange("spreadsheet-id", "Sheet1!A1:D10")
 *   console.log(data.values)
 * })
 *
 * const runnable = Effect.provide(program, GoogleSheetsLive.pipe(Layer.provide(GoogleAuthLive)))
 * ```
 */
import { Context, Data, Effect, Layer } from 'effect';
import { google } from 'googleapis';
import { GoogleAuth } from './google-auth.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * Result of reading a range from a Google Sheet.
 */
export type SheetData = {
  /** The range that was read (e.g. "Sheet1!A1:D10"). */
  readonly range: string;
  /** The major dimension of the values (ROWS or COLUMNS). */
  readonly majorDimension: string;
  /** The values in the range as a 2D array of strings. */
  readonly values: ReadonlyArray<ReadonlyArray<string>>;
};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/**
 * Typed error for Google Sheets API failures.
 *
 * @example
 * ```ts
 * new GoogleSheetsError({ message: "Spreadsheet not found" })
 * ```
 */
export class GoogleSheetsError extends Data.TaggedError('GoogleSheetsError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Service interface for Google Sheets operations.
 */
export type GoogleSheetsServiceShape = {
  /** Read values from a range in a spreadsheet. */
  readonly readRange: (
    spreadsheetId: string,
    range: string,
  ) => Effect.Effect<SheetData, GoogleSheetsError>;

  /** Write values to a range in a spreadsheet. */
  readonly writeRange: (
    spreadsheetId: string,
    range: string,
    values: ReadonlyArray<ReadonlyArray<string>>,
  ) => Effect.Effect<void, GoogleSheetsError>;

  /** Append rows to a range in a spreadsheet. */
  readonly appendRows: (
    spreadsheetId: string,
    range: string,
    values: ReadonlyArray<ReadonlyArray<string>>,
  ) => Effect.Effect<void, GoogleSheetsError>;
};

// ---------------------------------------------------------------------------
// Service tag
// ---------------------------------------------------------------------------

/**
 * Service tag for GoogleSheetsService.
 *
 * @example
 * ```ts
 * import { GoogleSheetsService } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const sheets = yield* GoogleSheetsService
 *   const data = yield* sheets.readRange("spreadsheet-id", "Sheet1!A1:D10")
 * })
 * ```
 */
export const GoogleSheetsService = Context.GenericTag<GoogleSheetsServiceShape>(
  'GoogleSheetsService',
);

// ---------------------------------------------------------------------------
// Live layer
// ---------------------------------------------------------------------------

/**
 * Live layer for GoogleSheetsService.
 *
 * Depends on GoogleAuth service for OAuth2 client.
 * The GoogleAuth layer must be provided separately.
 */
export const GoogleSheetsLive = Layer.effect(
  GoogleSheetsService,
  Effect.gen(function* () {
    const auth = yield* GoogleAuth;
    const { client } = yield* auth.getClient;

    const sheets = google.sheets({ version: 'v4', auth: client });

    return GoogleSheetsService.of({
      readRange: (spreadsheetId: string, range: string) =>
        Effect.tryPromise({
          try: async () => {
            const res = await sheets.spreadsheets.values.get({
              spreadsheetId,
              range,
            });

            return {
              range: res.data.range ?? range,
              majorDimension: res.data.majorDimension ?? 'ROWS',
              values: (res.data.values ?? []) as Array<Array<string>>,
            } satisfies SheetData;
          },
          catch: error =>
            new GoogleSheetsError({
              message:
                error instanceof Error ? error.message : 'Failed to read range',
              cause: error,
            }),
        }),

      writeRange: (
        spreadsheetId: string,
        range: string,
        values: ReadonlyArray<ReadonlyArray<string>>,
      ) =>
        Effect.tryPromise({
          try: async () => {
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: values.map(row => [...row]),
              },
            });
          },
          catch: error =>
            new GoogleSheetsError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to write range',
              cause: error,
            }),
        }),

      appendRows: (
        spreadsheetId: string,
        range: string,
        values: ReadonlyArray<ReadonlyArray<string>>,
      ) =>
        Effect.tryPromise({
          try: async () => {
            await sheets.spreadsheets.values.append({
              spreadsheetId,
              range,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: values.map(row => [...row]),
              },
            });
          },
          catch: error =>
            new GoogleSheetsError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to append rows',
              cause: error,
            }),
        }),
    });
  }),
);
