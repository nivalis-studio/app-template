/**
 * Gemini PDF extraction connector as an Effect service.
 *
 * Provides document understanding and text extraction using the
 * Vercel AI SDK `@ai-sdk/google` provider with `gemini-2.5-flash` model.
 * Sends PDF as a file part in messages for native document processing.
 *
 * @example
 * ```ts
 * import { GeminiPdfService, GeminiPdfLive } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const pdf = yield* GeminiPdfService
 *   const result = yield* pdf.extractFromPdf(
 *     new URL("https://example.com/document.pdf")
 *   )
 *   console.log(result.text)
 * })
 *
 * const runnable = Effect.provide(program, GeminiPdfLive)
 * ```
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { Config, Context, Data, Effect, Layer } from 'effect';

// Regex to extract JSON code blocks from the response
const JSON_CODE_BLOCK_RE = /```json\n([\s\S]*?)\n```/;

// Regex to detect page boundary markers in extracted text
const PAGE_MARKER_RE = /(?:^|\n)---\s*Page\s+(\d+)\s*---/i;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * Information about a single page in the PDF extraction result.
 */
export type PdfPageInfo = {
  /** The 1-based page number. */
  readonly pageNumber: number;
  /** Whether content was detected on this page. */
  readonly hasContent: boolean;
};

/**
 * Result of PDF extraction from Gemini.
 */
export type PdfExtractionResult = {
  /** The extracted text content from the PDF. */
  readonly text: string;
  /** Structured data extracted from the document, if any. */
  readonly structuredData: Record<string, unknown> | null;
  /** Page-level information about the processed document. */
  readonly pages: ReadonlyArray<PdfPageInfo>;
  /** The model used for processing. */
  readonly model: string;
  /** Token usage information. */
  readonly usage: PdfExtractionUsage;
};

/**
 * Token usage information from PDF extraction.
 */
export type PdfExtractionUsage = {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/**
 * Typed error for Gemini PDF API failures.
 *
 * @example
 * ```ts
 * new GeminiPdfError({ message: "Failed to extract PDF content" })
 * ```
 */
export class GeminiPdfError extends Data.TaggedError('GeminiPdfError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Service interface for Gemini PDF extraction.
 */
export type GeminiPdfServiceShape = {
  /**
   * Extract text, structured data, and page information from a PDF document.
   *
   * @param input - A Buffer containing the PDF data, or a URL pointing to the PDF.
   */
  readonly extractFromPdf: (
    input: Buffer | URL,
  ) => Effect.Effect<PdfExtractionResult, GeminiPdfError>;
};

// ---------------------------------------------------------------------------
// Service tag
// ---------------------------------------------------------------------------

/**
 * Service tag for GeminiPdfService.
 *
 * @example
 * ```ts
 * import { GeminiPdfService } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const pdf = yield* GeminiPdfService
 *   const result = yield* pdf.extractFromPdf(
 *     new URL("https://example.com/document.pdf")
 *   )
 *   console.log(result.text)
 * })
 * ```
 */
export const GeminiPdfService =
  Context.GenericTag<GeminiPdfServiceShape>('GeminiPdfService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse page information from the extracted text.
 * Looks for page markers or estimates pages from content structure.
 */
function parsePageInfo(text: string): ReadonlyArray<PdfPageInfo> {
  // Attempt to detect page boundaries from common markers
  const pageMarkers = text.split(PAGE_MARKER_RE);

  if (pageMarkers.length > 1) {
    const pages: Array<PdfPageInfo> = [];
    for (let i = 1; i < pageMarkers.length; i += 2) {
      const pageNum = Number.parseInt(pageMarkers[i] ?? '0', 10);
      const content = pageMarkers[i + 1] ?? '';
      pages.push({
        pageNumber: pageNum,
        hasContent: content.trim().length > 0,
      });
    }
    return pages;
  }

  // Fallback: if text is non-empty, report at least one page
  if (text.trim().length > 0) {
    return [{ pageNumber: 1, hasContent: true }];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Live layer
// ---------------------------------------------------------------------------

/**
 * Live layer for GeminiPdfService.
 *
 * Reads `GOOGLE_GENERATIVE_AI_API_KEY` from Effect Config.
 * Uses `@ai-sdk/google` with `gemini-2.5-flash` model for PDF extraction.
 * Missing config will produce a ConfigError at layer construction time.
 */
export const GeminiPdfLive = Layer.effect(
  GeminiPdfService,
  Effect.gen(function* () {
    const apiKey = yield* Config.string('GOOGLE_GENERATIVE_AI_API_KEY');

    const google = createGoogleGenerativeAI({ apiKey });

    return GeminiPdfService.of({
      extractFromPdf: (input: Buffer | URL) =>
        Effect.tryPromise({
          try: async () => {
            const filePart = {
              type: 'file' as const,
              data: input,
              mediaType: 'application/pdf' as const,
            };

            const result = await generateText({
              model: google('gemini-2.5-flash'),
              messages: [
                {
                  role: 'user',
                  content: [
                    filePart,
                    {
                      type: 'text',
                      text: 'Extract all text from this PDF document. Preserve the structure including headings, paragraphs, tables, and lists as closely as possible. If you can identify page boundaries, separate them with "--- Page N ---" markers. Return the full extracted text.',
                    },
                  ],
                },
              ],
            });

            // Attempt to parse any JSON structured data from the response
            let structuredData: Record<string, unknown> | null = null;
            try {
              const jsonMatch = result.text.match(JSON_CODE_BLOCK_RE);
              if (jsonMatch?.[1]) {
                structuredData = JSON.parse(jsonMatch[1]) as Record<
                  string,
                  unknown
                >;
              }
            } catch {
              // Not JSON — that's fine, structured data is optional
            }

            const pages = parsePageInfo(result.text);

            return {
              text: result.text,
              structuredData,
              pages,
              model: 'gemini-2.5-flash',
              usage: {
                inputTokens: result.usage?.inputTokens ?? 0,
                outputTokens: result.usage?.outputTokens ?? 0,
                totalTokens: result.usage?.totalTokens ?? 0,
              },
            } satisfies PdfExtractionResult;
          },
          catch: error =>
            new GeminiPdfError({
              message:
                error instanceof Error
                  ? error.message
                  : 'PDF extraction failed',
              cause: error,
            }),
        }),
    });
  }),
);
