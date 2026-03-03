import { ConfigProvider, Effect, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import { FirecrawlService } from '../firecrawl.js';
import { GeminiPdfService } from '../gemini-pdf.js';
import { GmailService } from '../gmail.js';
import { GoogleCalendarService } from '../google-calendar.js';
import { GoogleSheetsService } from '../google-sheets.js';
import { MistralOcrService } from '../mistral-ocr.js';
import { AiToolkitLive } from '../toolkit.js';

describe('AiToolkitLive', () => {
  /**
   * Full config provider with all required API keys.
   */
  const fullConfig = ConfigProvider.fromMap(
    new Map([
      ['FIRECRAWL_API_KEY', 'fc-test-key'],
      ['MISTRAL_API_KEY', 'test-mistral-key'],
      ['GOOGLE_GENERATIVE_AI_API_KEY', 'test-gemini-key'],
      ['GOOGLE_CLIENT_ID', 'test-client-id'],
      ['GOOGLE_CLIENT_SECRET', 'test-client-secret'],
      ['GOOGLE_REFRESH_TOKEN', 'test-refresh-token'],
    ]),
  );

  const TestLayer = AiToolkitLive.pipe(
    Layer.provide(Layer.setConfigProvider(fullConfig)),
  );

  // ---------------------------------------------------------------------------
  // AiToolkitLive compiles and can be provided to Effect
  // ---------------------------------------------------------------------------

  it('provides all 6 services when all config is present', async () => {
    const program = Effect.gen(function* () {
      const firecrawl = yield* FirecrawlService;
      const mistralOcr = yield* MistralOcrService;
      const geminiPdf = yield* GeminiPdfService;
      const sheets = yield* GoogleSheetsService;
      const calendar = yield* GoogleCalendarService;
      const gmail = yield* GmailService;

      return {
        hasFirecrawl: typeof firecrawl.scrape === 'function',
        hasMistralOcr: typeof mistralOcr.processDocument === 'function',
        hasGeminiPdf: typeof geminiPdf.extractFromPdf === 'function',
        hasSheets: typeof sheets.readRange === 'function',
        hasCalendar: typeof calendar.listEvents === 'function',
        hasGmail: typeof gmail.send === 'function',
      };
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));

    expect(result.hasFirecrawl).toBe(true);
    expect(result.hasMistralOcr).toBe(true);
    expect(result.hasGeminiPdf).toBe(true);
    expect(result.hasSheets).toBe(true);
    expect(result.hasCalendar).toBe(true);
    expect(result.hasGmail).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Missing API key → ConfigError
  // ---------------------------------------------------------------------------

  it('fails with ConfigError when FIRECRAWL_API_KEY is missing', async () => {
    const partialConfig = ConfigProvider.fromMap(
      new Map([
        // FIRECRAWL_API_KEY intentionally omitted
        ['MISTRAL_API_KEY', 'test-mistral-key'],
        ['GOOGLE_GENERATIVE_AI_API_KEY', 'test-gemini-key'],
        ['GOOGLE_CLIENT_ID', 'test-client-id'],
        ['GOOGLE_CLIENT_SECRET', 'test-client-secret'],
        ['GOOGLE_REFRESH_TOKEN', 'test-refresh-token'],
      ]),
    );

    const PartialLayer = AiToolkitLive.pipe(
      Layer.provide(Layer.setConfigProvider(partialConfig)),
    );

    const program = Effect.gen(function* () {
      const firecrawl = yield* FirecrawlService;
      return yield* firecrawl.scrape('https://example.com');
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, PartialLayer),
    );

    expect(exit._tag).toBe('Failure');
  });

  it('fails with ConfigError when MISTRAL_API_KEY is missing', async () => {
    const partialConfig = ConfigProvider.fromMap(
      new Map([
        ['FIRECRAWL_API_KEY', 'fc-test-key'],
        // MISTRAL_API_KEY intentionally omitted
        ['GOOGLE_GENERATIVE_AI_API_KEY', 'test-gemini-key'],
        ['GOOGLE_CLIENT_ID', 'test-client-id'],
        ['GOOGLE_CLIENT_SECRET', 'test-client-secret'],
        ['GOOGLE_REFRESH_TOKEN', 'test-refresh-token'],
      ]),
    );

    const PartialLayer = AiToolkitLive.pipe(
      Layer.provide(Layer.setConfigProvider(partialConfig)),
    );

    const program = Effect.gen(function* () {
      const ocr = yield* MistralOcrService;
      return yield* ocr.processDocument(new URL('https://example.com/doc.pdf'));
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, PartialLayer),
    );

    expect(exit._tag).toBe('Failure');
  });

  it('fails with ConfigError when GOOGLE_CLIENT_ID is missing', async () => {
    const partialConfig = ConfigProvider.fromMap(
      new Map([
        ['FIRECRAWL_API_KEY', 'fc-test-key'],
        ['MISTRAL_API_KEY', 'test-mistral-key'],
        ['GOOGLE_GENERATIVE_AI_API_KEY', 'test-gemini-key'],
        // GOOGLE_CLIENT_ID intentionally omitted
        ['GOOGLE_CLIENT_SECRET', 'test-client-secret'],
        ['GOOGLE_REFRESH_TOKEN', 'test-refresh-token'],
      ]),
    );

    const PartialLayer = AiToolkitLive.pipe(
      Layer.provide(Layer.setConfigProvider(partialConfig)),
    );

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.list();
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, PartialLayer),
    );

    expect(exit._tag).toBe('Failure');
  });
});
