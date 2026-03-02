import { Cause, ConfigProvider, Effect, Exit, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  MistralOcrError,
  MistralOcrLive,
  MistralOcrService,
  type OcrResult,
} from '../mistral-ocr.js';

describe('MistralOcrService', () => {
  // ---------------------------------------------------------------------------
  // Happy path tests with mock implementation
  // ---------------------------------------------------------------------------

  it('processes a document from URL with mock implementation', async () => {
    const mockResult: OcrResult = {
      text: '# Invoice\n\nTotal: $100.00\nDate: 2024-01-15',
      structuredData: null,
      model: 'pixtral-large-latest',
      usage: {
        inputTokens: 150,
        outputTokens: 50,
        totalTokens: 200,
      },
    };

    const MockMistralOcr = Layer.succeed(MistralOcrService, {
      processDocument: (_input: Buffer | URL, _mediaType?: string) =>
        Effect.succeed(mockResult),
    });

    const program = Effect.gen(function* () {
      const ocr = yield* MistralOcrService;
      return yield* ocr.processDocument(
        new URL('https://example.com/document.pdf'),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockMistralOcr),
    );

    expect(result.text).toBe('# Invoice\n\nTotal: $100.00\nDate: 2024-01-15');
    expect(result.structuredData).toBeNull();
    expect(result.model).toBe('pixtral-large-latest');
    expect(result.usage.inputTokens).toBe(mockResult.usage.inputTokens);
    expect(result.usage.outputTokens).toBe(mockResult.usage.outputTokens);
    expect(result.usage.totalTokens).toBe(mockResult.usage.totalTokens);
  });

  it('processes a document from Buffer with mock implementation', async () => {
    const mockResult: OcrResult = {
      text: 'Extracted text from buffer image.',
      structuredData: { title: 'Test Document' },
      model: 'pixtral-large-latest',
      usage: {
        inputTokens: 100,
        outputTokens: 30,
        totalTokens: 130,
      },
    };

    const MockMistralOcr = Layer.succeed(MistralOcrService, {
      processDocument: (_input: Buffer | URL, _mediaType?: string) =>
        Effect.succeed(mockResult),
    });

    const program = Effect.gen(function* () {
      const ocr = yield* MistralOcrService;
      return yield* ocr.processDocument(
        Buffer.from('fake-pdf-data'),
        'application/pdf',
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockMistralOcr),
    );

    expect(result.text).toBe('Extracted text from buffer image.');
    expect(result.structuredData).toEqual({ title: 'Test Document' });
    expect(result.model).toBe('pixtral-large-latest');
    expect(result.usage.totalTokens).toBe(mockResult.usage.totalTokens);
  });

  it('processes an image with custom mediaType', async () => {
    const mockResult: OcrResult = {
      text: 'Text from a PNG image',
      structuredData: null,
      model: 'pixtral-large-latest',
      usage: {
        inputTokens: 80,
        outputTokens: 20,
        totalTokens: 100,
      },
    };

    let receivedMediaType: string | undefined;

    const MockMistralOcr = Layer.succeed(MistralOcrService, {
      processDocument: (_input: Buffer | URL, mediaType?: string) => {
        receivedMediaType = mediaType;
        return Effect.succeed(mockResult);
      },
    });

    const program = Effect.gen(function* () {
      const ocr = yield* MistralOcrService;
      return yield* ocr.processDocument(
        new URL('https://example.com/image.png'),
        'image/png',
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockMistralOcr),
    );

    expect(result.text).toBe('Text from a PNG image');
    expect(receivedMediaType).toBe('image/png');
  });

  // ---------------------------------------------------------------------------
  // Missing API key → ConfigError
  // ---------------------------------------------------------------------------

  it('fails with ConfigError when MISTRAL_API_KEY is missing', async () => {
    const emptyConfig = ConfigProvider.fromMap(new Map());

    const TestLayer = MistralOcrLive.pipe(
      Layer.provide(Layer.setConfigProvider(emptyConfig)),
    );

    const program = Effect.gen(function* () {
      const ocr = yield* MistralOcrService;
      return yield* ocr.processDocument(
        new URL('https://example.com/document.pdf'),
      );
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, TestLayer),
    );

    expect(exit._tag).toBe('Failure');
  });

  // ---------------------------------------------------------------------------
  // API error → MistralOcrError
  // ---------------------------------------------------------------------------

  it('wraps API errors in MistralOcrError', async () => {
    const MockMistralOcr = Layer.succeed(MistralOcrService, {
      processDocument: (_input: Buffer | URL, _mediaType?: string) =>
        Effect.fail(
          new MistralOcrError({
            message: 'Model not available',
            cause: new Error('503 Service Unavailable'),
          }),
        ),
    });

    const program = Effect.gen(function* () {
      const ocr = yield* MistralOcrService;
      return yield* ocr.processDocument(
        new URL('https://example.com/document.pdf'),
      );
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, MockMistralOcr),
    );

    expect(exit._tag).toBe('Failure');
    if (Exit.isFailure(exit)) {
      const failures = Cause.failures(exit.cause);
      const failArray = Array.from(failures);
      expect(failArray.length).toBeGreaterThan(0);
      expect(failArray[0]).toBeInstanceOf(MistralOcrError);
      expect((failArray[0] as MistralOcrError).message).toBe(
        'Model not available',
      );
    }
  });

  // ---------------------------------------------------------------------------
  // Error type validation
  // ---------------------------------------------------------------------------

  it('MistralOcrError carries the correct _tag', () => {
    const error = new MistralOcrError({
      message: 'Something went wrong',
    });
    expect(error._tag).toBe('MistralOcrError');
    expect(error.message).toBe('Something went wrong');
  });

  it('MistralOcrError supports optional cause', () => {
    const cause = new Error('network timeout');
    const error = new MistralOcrError({
      message: 'Processing failed',
      cause,
    });
    expect(error._tag).toBe('MistralOcrError');
    expect(error.cause).toBe(cause);
  });

  // ---------------------------------------------------------------------------
  // Live layer with valid config (tests SDK client creation)
  // ---------------------------------------------------------------------------

  it('creates a service with valid config', async () => {
    const testConfig = ConfigProvider.fromMap(
      new Map([['MISTRAL_API_KEY', 'test-mistral-key']]),
    );

    const TestLayer = MistralOcrLive.pipe(
      Layer.provide(Layer.setConfigProvider(testConfig)),
    );

    // Build the layer — this verifies the service can be constructed
    // without making real API calls
    const program = Effect.gen(function* () {
      const ocr = yield* MistralOcrService;
      // Just verify the service is available (don't call methods
      // as that would require a real API key)
      return ocr;
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));

    expect(result).toBeDefined();
    expect(result.processDocument).toBeTypeOf('function');
  });
});
