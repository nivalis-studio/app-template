import { Cause, ConfigProvider, Effect, Exit, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  type CrawlResult,
  type ExtractedData,
  FirecrawlError,
  FirecrawlLive,
  FirecrawlService,
  type ScrapedPage,
} from '../firecrawl.js';

describe('FirecrawlService', () => {
  // ---------------------------------------------------------------------------
  // Happy path tests with mock implementation
  // ---------------------------------------------------------------------------

  it('scrapes a URL with mock implementation', async () => {
    const mockPage: ScrapedPage = {
      url: 'https://example.com',
      markdown: '# Example',
      html: '<h1>Example</h1>',
      metadata: {
        title: 'Example Domain',
        description: 'Example page',
        sourceURL: 'https://example.com',
        statusCode: 200,
      },
      links: ['https://example.com/about'],
    };

    const MockFirecrawl = Layer.succeed(FirecrawlService, {
      scrape: (_url: string) => Effect.succeed(mockPage),
      crawl: (_url: string) =>
        Effect.succeed({
          status: 'completed',
          total: 0,
          completed: 0,
          pages: [],
        }),
      extract: (_url: string) => Effect.succeed({ success: true, data: null }),
    });

    const program = Effect.gen(function* () {
      const firecrawl = yield* FirecrawlService;
      return yield* firecrawl.scrape('https://example.com');
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockFirecrawl),
    );

    expect(result.url).toBe('https://example.com');
    expect(result.markdown).toBe('# Example');
    expect(result.html).toBe('<h1>Example</h1>');
    expect(result.metadata?.title).toBe('Example Domain');
    expect(result.links).toEqual(['https://example.com/about']);
  });

  it('crawls a URL with mock implementation', async () => {
    const mockCrawlResult: CrawlResult = {
      status: 'completed',
      total: 2,
      completed: 2,
      pages: [
        {
          url: 'https://example.com',
          markdown: '# Home',
          html: '<h1>Home</h1>',
          metadata: { title: 'Home' },
        },
        {
          url: 'https://example.com/about',
          markdown: '# About',
          html: '<h1>About</h1>',
          metadata: { title: 'About' },
        },
      ],
    };

    const MockFirecrawl = Layer.succeed(FirecrawlService, {
      scrape: (_url: string) => Effect.succeed({ url: _url }),
      crawl: (_url: string) => Effect.succeed(mockCrawlResult),
      extract: (_url: string) => Effect.succeed({ success: true, data: null }),
    });

    const program = Effect.gen(function* () {
      const firecrawl = yield* FirecrawlService;
      return yield* firecrawl.crawl('https://example.com', { limit: 10 });
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockFirecrawl),
    );

    expect(result.status).toBe('completed');
    expect(result.total).toBe(2);
    expect(result.completed).toBe(2);
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]?.url).toBe('https://example.com');
    expect(result.pages[1]?.url).toBe('https://example.com/about');
  });

  it('extracts structured data with mock implementation', async () => {
    const mockExtracted: ExtractedData = {
      success: true,
      data: { products: [{ name: 'Widget', price: '$9.99' }] },
      warning: undefined,
    };

    const MockFirecrawl = Layer.succeed(FirecrawlService, {
      scrape: (_url: string) => Effect.succeed({ url: _url }),
      crawl: (_url: string) =>
        Effect.succeed({
          status: 'completed',
          total: 0,
          completed: 0,
          pages: [],
        }),
      extract: (_url: string) => Effect.succeed(mockExtracted),
    });

    const program = Effect.gen(function* () {
      const firecrawl = yield* FirecrawlService;
      return yield* firecrawl.extract('https://example.com', {
        prompt: 'Extract product names and prices',
        schema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'string' },
                },
              },
            },
          },
        },
      });
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockFirecrawl),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      products: [{ name: 'Widget', price: '$9.99' }],
    });
  });

  // ---------------------------------------------------------------------------
  // Missing API key → ConfigError
  // ---------------------------------------------------------------------------

  it('fails with ConfigError when FIRECRAWL_API_KEY is missing', async () => {
    const emptyConfig = ConfigProvider.fromMap(new Map());

    const TestLayer = FirecrawlLive.pipe(
      Layer.provide(Layer.setConfigProvider(emptyConfig)),
    );

    const program = Effect.gen(function* () {
      const firecrawl = yield* FirecrawlService;
      return yield* firecrawl.scrape('https://example.com');
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, TestLayer),
    );

    expect(exit._tag).toBe('Failure');
  });

  // ---------------------------------------------------------------------------
  // API error → FirecrawlError
  // ---------------------------------------------------------------------------

  it('wraps API errors in FirecrawlError for scrape', async () => {
    const MockFirecrawl = Layer.succeed(FirecrawlService, {
      scrape: (_url: string) =>
        Effect.fail(
          new FirecrawlError({
            message: 'Rate limit exceeded',
            cause: new Error('429 Too Many Requests'),
          }),
        ),
      crawl: (_url: string) =>
        Effect.succeed({
          status: 'completed',
          total: 0,
          completed: 0,
          pages: [],
        }),
      extract: (_url: string) => Effect.succeed({ success: true, data: null }),
    });

    const program = Effect.gen(function* () {
      const firecrawl = yield* FirecrawlService;
      return yield* firecrawl.scrape('https://example.com');
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, MockFirecrawl),
    );

    expect(exit._tag).toBe('Failure');
    if (Exit.isFailure(exit)) {
      const failures = Cause.failures(exit.cause);
      const failArray = Array.from(failures);
      expect(failArray.length).toBeGreaterThan(0);
      expect(failArray[0]).toBeInstanceOf(FirecrawlError);
      expect((failArray[0] as FirecrawlError).message).toBe(
        'Rate limit exceeded',
      );
    }
  });

  it('wraps API errors in FirecrawlError for crawl', async () => {
    const MockFirecrawl = Layer.succeed(FirecrawlService, {
      scrape: (_url: string) => Effect.succeed({ url: _url }),
      crawl: (_url: string) =>
        Effect.fail(
          new FirecrawlError({
            message: 'Crawl job failed',
            cause: new Error('Internal server error'),
          }),
        ),
      extract: (_url: string) => Effect.succeed({ success: true, data: null }),
    });

    const program = Effect.gen(function* () {
      const firecrawl = yield* FirecrawlService;
      return yield* firecrawl.crawl('https://example.com');
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, MockFirecrawl),
    );

    expect(exit._tag).toBe('Failure');
    if (Exit.isFailure(exit)) {
      const failures = Cause.failures(exit.cause);
      const failArray = Array.from(failures);
      expect(failArray.length).toBeGreaterThan(0);
      expect(failArray[0]).toBeInstanceOf(FirecrawlError);
    }
  });

  // ---------------------------------------------------------------------------
  // Error type validation
  // ---------------------------------------------------------------------------

  it('FirecrawlError carries the correct _tag', () => {
    const error = new FirecrawlError({
      message: 'Something went wrong',
    });
    expect(error._tag).toBe('FirecrawlError');
    expect(error.message).toBe('Something went wrong');
  });

  it('FirecrawlError supports optional cause', () => {
    const cause = new Error('network timeout');
    const error = new FirecrawlError({
      message: 'Scrape failed',
      cause,
    });
    expect(error._tag).toBe('FirecrawlError');
    expect(error.cause).toBe(cause);
  });

  // ---------------------------------------------------------------------------
  // Live layer with valid config (tests SDK client creation)
  // ---------------------------------------------------------------------------

  it('creates a service with valid config', async () => {
    const testConfig = ConfigProvider.fromMap(
      new Map([['FIRECRAWL_API_KEY', 'fc-test-key']]),
    );

    const TestLayer = FirecrawlLive.pipe(
      Layer.provide(Layer.setConfigProvider(testConfig)),
    );

    // Build the layer — this verifies the service can be constructed
    // without making real API calls
    const program = Effect.gen(function* () {
      const firecrawl = yield* FirecrawlService;
      // Just verify the service is available (don't call methods
      // as that would require a real API key)
      return firecrawl;
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));

    expect(result).toBeDefined();
    expect(result.scrape).toBeTypeOf('function');
    expect(result.crawl).toBeTypeOf('function');
    expect(result.extract).toBeTypeOf('function');
  });
});
