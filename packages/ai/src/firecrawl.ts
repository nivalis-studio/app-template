/**
 * Firecrawl web scraping connector as an Effect service.
 *
 * Provides scrape, crawl, and extract operations using the
 * @mendable/firecrawl-js SDK. All SDK types are wrapped in
 * domain types to avoid SDK type leakage.
 *
 * @example
 * ```ts
 * import { FirecrawlService, FirecrawlLive } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const firecrawl = yield* FirecrawlService
 *   const page = yield* firecrawl.scrape("https://example.com")
 *   console.log(page.markdown)
 * })
 *
 * const runnable = Effect.provide(program, FirecrawlLive)
 * ```
 */
import Firecrawl from '@mendable/firecrawl-js';
import { Config, Context, Data, Effect, Layer } from 'effect';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * Metadata for a scraped page.
 */
export type ScrapedPageMetadata = {
  readonly title?: string;
  readonly description?: string;
  readonly language?: string;
  readonly sourceURL?: string;
  readonly statusCode?: number;
  readonly [key: string]: unknown;
};

/**
 * Result of scraping a single URL.
 */
export type ScrapedPage = {
  readonly url: string;
  readonly markdown?: string;
  readonly html?: string;
  readonly metadata?: ScrapedPageMetadata;
  readonly links?: ReadonlyArray<string>;
};

/**
 * A single page within a crawl result.
 */
export type CrawledPage = {
  readonly url?: string;
  readonly markdown?: string;
  readonly html?: string;
  readonly metadata?: ScrapedPageMetadata;
};

/**
 * Options for crawling a website.
 */
export type CrawlOptions = {
  readonly limit?: number;
  readonly maxDepth?: number;
  readonly includePaths?: ReadonlyArray<string>;
  readonly excludePaths?: ReadonlyArray<string>;
};

/**
 * Result of crawling a website.
 */
export type CrawlResult = {
  readonly status: string;
  readonly total: number;
  readonly completed: number;
  readonly pages: ReadonlyArray<CrawledPage>;
};

/**
 * Options for extracting structured data.
 */
export type ExtractOptions = {
  readonly prompt?: string;
  readonly schema?: Record<string, unknown>;
};

/**
 * Result of extracting structured data from URLs.
 */
export type ExtractedData = {
  readonly success: boolean;
  readonly data: unknown;
  readonly warning?: string;
};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/**
 * Typed error for Firecrawl API failures.
 *
 * @example
 * ```ts
 * new FirecrawlError({ message: "Rate limit exceeded" })
 * ```
 */
export class FirecrawlError extends Data.TaggedError('FirecrawlError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Service interface for Firecrawl web scraping.
 */
export type FirecrawlServiceShape = {
  /** Scrape a single URL and return the page content. */
  readonly scrape: (url: string) => Effect.Effect<ScrapedPage, FirecrawlError>;

  /** Crawl a website starting from a URL and return all discovered pages. */
  readonly crawl: (
    url: string,
    options?: CrawlOptions,
  ) => Effect.Effect<CrawlResult, FirecrawlError>;

  /** Extract structured data from a URL using a prompt and/or schema. */
  readonly extract: (
    url: string,
    options?: ExtractOptions,
  ) => Effect.Effect<ExtractedData, FirecrawlError>;
};

// ---------------------------------------------------------------------------
// Service tag
// ---------------------------------------------------------------------------

/**
 * Service tag for FirecrawlService.
 *
 * @example
 * ```ts
 * import { FirecrawlService } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const firecrawl = yield* FirecrawlService
 *   const page = yield* firecrawl.scrape("https://example.com")
 * })
 * ```
 */
export const FirecrawlService =
  Context.GenericTag<FirecrawlServiceShape>('FirecrawlService');

// ---------------------------------------------------------------------------
// Live layer
// ---------------------------------------------------------------------------

/**
 * Live layer for FirecrawlService.
 *
 * Reads `FIRECRAWL_API_KEY` from Effect Config.
 * Missing config will produce a ConfigError at layer construction time.
 */
export const FirecrawlLive = Layer.effect(
  FirecrawlService,
  Effect.gen(function* () {
    const apiKey = yield* Config.string('FIRECRAWL_API_KEY');

    const client = new Firecrawl({ apiKey });

    return FirecrawlService.of({
      scrape: (url: string) =>
        Effect.tryPromise({
          try: async () => {
            const doc = await client.scrape(url, {
              formats: ['markdown', 'html'],
            });

            return {
              url,
              markdown: doc.markdown,
              html: doc.html,
              metadata: doc.metadata as ScrapedPageMetadata | undefined,
              links: doc.links,
            } satisfies ScrapedPage;
          },
          catch: error =>
            new FirecrawlError({
              message: error instanceof Error ? error.message : 'Scrape failed',
              cause: error,
            }),
        }),

      crawl: (url: string, options?: CrawlOptions) =>
        Effect.tryPromise({
          try: async () => {
            const job = await client.crawl(url, {
              limit: options?.limit,
              maxDiscoveryDepth: options?.maxDepth,
              includePaths: options?.includePaths
                ? [...options.includePaths]
                : undefined,
              excludePaths: options?.excludePaths
                ? [...options.excludePaths]
                : undefined,
              scrapeOptions: {
                formats: ['markdown', 'html'],
              },
            });

            return {
              status: job.status,
              total: job.total,
              completed: job.completed,
              pages: (job.data ?? []).map(doc => ({
                url: doc.metadata?.sourceURL ?? doc.metadata?.url,
                markdown: doc.markdown,
                html: doc.html,
                metadata: doc.metadata as ScrapedPageMetadata | undefined,
              })),
            } satisfies CrawlResult;
          },
          catch: error =>
            new FirecrawlError({
              message: error instanceof Error ? error.message : 'Crawl failed',
              cause: error,
            }),
        }),

      extract: (url: string, options?: ExtractOptions) =>
        Effect.tryPromise({
          try: async () => {
            const doc = await client.scrape(url, {
              formats: [
                {
                  type: 'json' as const,
                  schema: options?.schema,
                  prompt: options?.prompt,
                },
              ],
            });

            return {
              success: true,
              data: doc.json,
              warning: doc.warning,
            } satisfies ExtractedData;
          },
          catch: error =>
            new FirecrawlError({
              message:
                error instanceof Error ? error.message : 'Extract failed',
              cause: error,
            }),
        }),
    });
  }),
);
