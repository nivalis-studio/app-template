import { Cause, ConfigProvider, Effect, Exit, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  GeminiPdfError,
  GeminiPdfLive,
  GeminiPdfService,
  type PdfExtractionResult,
} from '../gemini-pdf.js';

describe('GeminiPdfService', () => {
  // ---------------------------------------------------------------------------
  // Happy path tests with mock implementation
  // ---------------------------------------------------------------------------

  it('extracts text from a PDF URL with mock implementation', async () => {
    const mockResult: PdfExtractionResult = {
      text: '# Report\n\nRevenue: $1,000,000\nDate: 2024-01-15',
      structuredData: null,
      pages: [{ pageNumber: 1, hasContent: true }],
      model: 'gemini-2.5-flash',
      usage: {
        inputTokens: 200,
        outputTokens: 60,
        totalTokens: 260,
      },
    };

    const MockGeminiPdf = Layer.succeed(GeminiPdfService, {
      extractFromPdf: (_input: Buffer | URL) => Effect.succeed(mockResult),
    });

    const program = Effect.gen(function* () {
      const pdf = yield* GeminiPdfService;
      return yield* pdf.extractFromPdf(
        new URL('https://example.com/report.pdf'),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockGeminiPdf),
    );

    expect(result.text).toBe(
      '# Report\n\nRevenue: $1,000,000\nDate: 2024-01-15',
    );
    expect(result.structuredData).toBeNull();
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]?.pageNumber).toBe(1);
    expect(result.pages[0]?.hasContent).toBe(true);
    expect(result.model).toBe('gemini-2.5-flash');
    expect(result.usage.inputTokens).toBe(mockResult.usage.inputTokens);
    expect(result.usage.outputTokens).toBe(mockResult.usage.outputTokens);
    expect(result.usage.totalTokens).toBe(mockResult.usage.totalTokens);
  });

  it('extracts text from a PDF Buffer with mock implementation', async () => {
    const mockResult: PdfExtractionResult = {
      text: 'Contract Terms\n\n1. The parties agree to...',
      structuredData: { title: 'Service Agreement', parties: 2 },
      pages: [
        { pageNumber: 1, hasContent: true },
        { pageNumber: 2, hasContent: true },
      ],
      model: 'gemini-2.5-flash',
      usage: {
        inputTokens: 500,
        outputTokens: 120,
        totalTokens: 620,
      },
    };

    const MockGeminiPdf = Layer.succeed(GeminiPdfService, {
      extractFromPdf: (_input: Buffer | URL) => Effect.succeed(mockResult),
    });

    const program = Effect.gen(function* () {
      const pdf = yield* GeminiPdfService;
      return yield* pdf.extractFromPdf(Buffer.from('fake-pdf-data'));
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockGeminiPdf),
    );

    expect(result.text).toBe('Contract Terms\n\n1. The parties agree to...');
    expect(result.structuredData).toEqual({
      title: 'Service Agreement',
      parties: 2,
    });
    expect(result.pages).toHaveLength(2);
    expect(result.pages[1]?.pageNumber).toBe(2);
    expect(result.model).toBe('gemini-2.5-flash');
    expect(result.usage.totalTokens).toBe(mockResult.usage.totalTokens);
  });

  it('returns multi-page info from mock implementation', async () => {
    const mockResult: PdfExtractionResult = {
      text: 'Multi-page document content',
      structuredData: null,
      pages: [
        { pageNumber: 1, hasContent: true },
        { pageNumber: 2, hasContent: true },
        { pageNumber: 3, hasContent: false },
      ],
      model: 'gemini-2.5-flash',
      usage: {
        inputTokens: 800,
        outputTokens: 200,
        totalTokens: 1000,
      },
    };

    const MockGeminiPdf = Layer.succeed(GeminiPdfService, {
      extractFromPdf: (_input: Buffer | URL) => Effect.succeed(mockResult),
    });

    const program = Effect.gen(function* () {
      const pdf = yield* GeminiPdfService;
      return yield* pdf.extractFromPdf(
        new URL('https://example.com/multipage.pdf'),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockGeminiPdf),
    );

    expect(result.pages).toHaveLength(mockResult.pages.length);
    expect(result.pages[0]?.hasContent).toBe(true);
    expect(result.pages[2]?.hasContent).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Missing API key → ConfigError
  // ---------------------------------------------------------------------------

  it('fails with ConfigError when GOOGLE_GENERATIVE_AI_API_KEY is missing', async () => {
    const emptyConfig = ConfigProvider.fromMap(new Map());

    const TestLayer = GeminiPdfLive.pipe(
      Layer.provide(Layer.setConfigProvider(emptyConfig)),
    );

    const program = Effect.gen(function* () {
      const pdf = yield* GeminiPdfService;
      return yield* pdf.extractFromPdf(
        new URL('https://example.com/document.pdf'),
      );
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, TestLayer),
    );

    expect(exit._tag).toBe('Failure');
  });

  // ---------------------------------------------------------------------------
  // API error → GeminiPdfError
  // ---------------------------------------------------------------------------

  it('wraps API errors in GeminiPdfError', async () => {
    const MockGeminiPdf = Layer.succeed(GeminiPdfService, {
      extractFromPdf: (_input: Buffer | URL) =>
        Effect.fail(
          new GeminiPdfError({
            message: 'Rate limit exceeded',
            cause: new Error('429 Too Many Requests'),
          }),
        ),
    });

    const program = Effect.gen(function* () {
      const pdf = yield* GeminiPdfService;
      return yield* pdf.extractFromPdf(
        new URL('https://example.com/document.pdf'),
      );
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, MockGeminiPdf),
    );

    expect(exit._tag).toBe('Failure');
    if (Exit.isFailure(exit)) {
      const failures = Cause.failures(exit.cause);
      const failArray = Array.from(failures);
      expect(failArray.length).toBeGreaterThan(0);
      expect(failArray[0]).toBeInstanceOf(GeminiPdfError);
      expect((failArray[0] as GeminiPdfError).message).toBe(
        'Rate limit exceeded',
      );
    }
  });

  // ---------------------------------------------------------------------------
  // Error type validation
  // ---------------------------------------------------------------------------

  it('GeminiPdfError carries the correct _tag', () => {
    const error = new GeminiPdfError({
      message: 'Something went wrong',
    });
    expect(error._tag).toBe('GeminiPdfError');
    expect(error.message).toBe('Something went wrong');
  });

  it('GeminiPdfError supports optional cause', () => {
    const cause = new Error('network timeout');
    const error = new GeminiPdfError({
      message: 'Extraction failed',
      cause,
    });
    expect(error._tag).toBe('GeminiPdfError');
    expect(error.cause).toBe(cause);
  });

  // ---------------------------------------------------------------------------
  // Live layer with valid config (tests SDK client creation)
  // ---------------------------------------------------------------------------

  it('creates a service with valid config', async () => {
    const testConfig = ConfigProvider.fromMap(
      new Map([['GOOGLE_GENERATIVE_AI_API_KEY', 'test-gemini-key']]),
    );

    const TestLayer = GeminiPdfLive.pipe(
      Layer.provide(Layer.setConfigProvider(testConfig)),
    );

    // Build the layer — this verifies the service can be constructed
    // without making real API calls
    const program = Effect.gen(function* () {
      const pdf = yield* GeminiPdfService;
      // Just verify the service is available (don't call methods
      // as that would require a real API key)
      return pdf;
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));

    expect(result).toBeDefined();
    expect(result.extractFromPdf).toBeTypeOf('function');
  });
});
