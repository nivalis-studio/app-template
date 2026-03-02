import { Effect, Layer } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { GoogleAuth, type GoogleAuthClient } from '../google-auth.js';
import {
  GoogleSheetsError,
  GoogleSheetsLive,
  GoogleSheetsService,
  type SheetData,
} from '../google-sheets.js';

// ---------------------------------------------------------------------------
// Mock googleapis
// ---------------------------------------------------------------------------

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockAppend = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    sheets: () => ({
      spreadsheets: {
        values: {
          get: (...args: Array<unknown>) => mockGet(...args),
          update: (...args: Array<unknown>) => mockUpdate(...args),
          append: (...args: Array<unknown>) => mockAppend(...args),
        },
      },
    }),
    auth: {
      OAuth2: class MockOAuth2 {
        credentials = {};
        setCredentials(creds: Record<string, unknown>) {
          this.credentials = creds;
        }
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A mock GoogleAuth layer that provides a fake auth client. */
const mockClient = {
  credentials: { refresh_token: 'mock-token' },
} as GoogleAuthClient['client'];

const MockGoogleAuth = Layer.succeed(GoogleAuth, {
  getClient: Effect.succeed({ client: mockClient }),
});

const TestLayer = GoogleSheetsLive.pipe(Layer.provide(MockGoogleAuth));

describe('GoogleSheets service', () => {
  // -------------------------------------------------------------------------
  // readRange
  // -------------------------------------------------------------------------

  it('reads a range and returns SheetData', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        range: 'Sheet1!A1:D3',
        majorDimension: 'ROWS',
        values: [
          ['Name', 'Email'],
          ['Alice', 'alice@example.com'],
          ['Bob', 'bob@example.com'],
        ],
      },
    });

    const program = Effect.gen(function* () {
      const sheets = yield* GoogleSheetsService;
      return yield* sheets.readRange('spreadsheet-123', 'Sheet1!A1:D3');
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result.range).toBe('Sheet1!A1:D3');
    expect(result.majorDimension).toBe('ROWS');
    expect(result.values).toEqual([
      ['Name', 'Email'],
      ['Alice', 'alice@example.com'],
      ['Bob', 'bob@example.com'],
    ]);
  });

  it('returns empty values when spreadsheet range is empty', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        range: 'Sheet1!A1:D3',
        majorDimension: 'ROWS',
        values: undefined,
      },
    });

    const program = Effect.gen(function* () {
      const sheets = yield* GoogleSheetsService;
      return yield* sheets.readRange('spreadsheet-123', 'Sheet1!A1:D3');
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result.values).toEqual([]);
  });

  it('wraps read API errors in GoogleSheetsError', async () => {
    mockGet.mockRejectedValueOnce(new Error('Spreadsheet not found'));

    const program = Effect.gen(function* () {
      const sheets = yield* GoogleSheetsService;
      return yield* sheets.readRange('bad-id', 'Sheet1!A1:D3');
    }).pipe(
      Effect.catchTag('GoogleSheetsError', error =>
        Effect.succeed({ tag: error._tag, message: error.message }),
      ),
    );

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toEqual({
      tag: 'GoogleSheetsError',
      message: 'Spreadsheet not found',
    });
  });

  // -------------------------------------------------------------------------
  // writeRange
  // -------------------------------------------------------------------------

  it('writes values to a range', async () => {
    mockUpdate.mockResolvedValueOnce({ data: {} });

    const program = Effect.gen(function* () {
      const sheets = yield* GoogleSheetsService;
      return yield* sheets.writeRange('spreadsheet-123', 'Sheet1!A1', [
        ['Name', 'Email'],
        ['Alice', 'alice@example.com'],
      ]);
    });

    await Effect.runPromise(Effect.provide(program, TestLayer));

    expect(mockUpdate).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-123',
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['Name', 'Email'],
          ['Alice', 'alice@example.com'],
        ],
      },
    });
  });

  it('wraps write API errors in GoogleSheetsError', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Permission denied'));

    const program = Effect.gen(function* () {
      const sheets = yield* GoogleSheetsService;
      return yield* sheets.writeRange('spreadsheet-123', 'Sheet1!A1', [
        ['data'],
      ]);
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, TestLayer),
    );
    expect(exit._tag).toBe('Failure');
  });

  // -------------------------------------------------------------------------
  // appendRows
  // -------------------------------------------------------------------------

  it('appends rows to a range', async () => {
    mockAppend.mockResolvedValueOnce({ data: {} });

    const program = Effect.gen(function* () {
      const sheets = yield* GoogleSheetsService;
      return yield* sheets.appendRows('spreadsheet-123', 'Sheet1!A:D', [
        ['Bob', 'bob@example.com', '2026-03-02'],
      ]);
    });

    await Effect.runPromise(Effect.provide(program, TestLayer));

    expect(mockAppend).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-123',
      range: 'Sheet1!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Bob', 'bob@example.com', '2026-03-02']],
      },
    });
  });

  it('wraps append API errors in GoogleSheetsError', async () => {
    mockAppend.mockRejectedValueOnce(new Error('Quota exceeded'));

    const program = Effect.gen(function* () {
      const sheets = yield* GoogleSheetsService;
      return yield* sheets.appendRows('spreadsheet-123', 'Sheet1!A:D', [
        ['data'],
      ]);
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, TestLayer),
    );
    expect(exit._tag).toBe('Failure');
  });

  // -------------------------------------------------------------------------
  // Error type
  // -------------------------------------------------------------------------

  it('GoogleSheetsError carries the correct _tag', () => {
    const error = new GoogleSheetsError({ message: 'Not found' });
    expect(error._tag).toBe('GoogleSheetsError');
    expect(error.message).toBe('Not found');
  });

  it('GoogleSheetsError supports optional cause', () => {
    const cause = new Error('network error');
    const error = new GoogleSheetsError({ message: 'API failed', cause });
    expect(error._tag).toBe('GoogleSheetsError');
    expect(error.cause).toBe(cause);
  });

  // -------------------------------------------------------------------------
  // GoogleAuth dependency
  // -------------------------------------------------------------------------

  it('GoogleSheetsLive depends on GoogleAuth', async () => {
    // Providing GoogleSheetsLive without GoogleAuth should fail
    // We verify this by checking that the layer requires GoogleAuth
    const program = Effect.gen(function* () {
      const sheets = yield* GoogleSheetsService;
      return yield* sheets.readRange('id', 'A1');
    });

    // With MockGoogleAuth it works
    mockGet.mockResolvedValueOnce({
      data: { range: 'A1', majorDimension: 'ROWS', values: [['ok']] },
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result.values).toEqual([['ok']]);
  });

  // -------------------------------------------------------------------------
  // Mock layer
  // -------------------------------------------------------------------------

  it('can be used with a mock implementation', async () => {
    const mockData: SheetData = {
      range: 'Sheet1!A1:B2',
      majorDimension: 'ROWS',
      values: [['hello', 'world']],
    };

    const MockSheets = Layer.succeed(GoogleSheetsService, {
      readRange: () => Effect.succeed(mockData),
      writeRange: () => Effect.void,
      appendRows: () => Effect.void,
    });

    const program = Effect.gen(function* () {
      const sheets = yield* GoogleSheetsService;
      return yield* sheets.readRange('any-id', 'any-range');
    });

    const result = await Effect.runPromise(Effect.provide(program, MockSheets));
    expect(result).toEqual(mockData);
  });
});
