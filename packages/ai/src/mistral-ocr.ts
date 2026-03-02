/**
 * Mistral OCR connector as an Effect service.
 *
 * Provides document OCR using the Vercel AI SDK `@ai-sdk/mistral` provider
 * with the `pixtral-large-latest` model. Sends PDF/image as a file part
 * in messages and extracts text content from documents.
 *
 * @example
 * ```ts
 * import { MistralOcrService, MistralOcrLive } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const ocr = yield* MistralOcrService
 *   const result = yield* ocr.processDocument(
 *     new URL("https://example.com/document.pdf")
 *   )
 *   console.log(result.text)
 * })
 *
 * const runnable = Effect.provide(program, MistralOcrLive)
 * ```
 */
import { createMistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import { Config, Context, Data, Effect, Layer } from 'effect';

// Regex to extract JSON code blocks from the response
const JSON_CODE_BLOCK_RE = /```json\n([\s\S]*?)\n```/;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * Result of OCR processing on a document.
 */
export type OcrResult = {
  /** The extracted text content from the document. */
  readonly text: string;
  /** Structured data extracted from the document, if any. */
  readonly structuredData: Record<string, unknown> | null;
  /** The model used for processing. */
  readonly model: string;
  /** Token usage information. */
  readonly usage: OcrUsage;
};

/**
 * Token usage information from OCR processing.
 */
export type OcrUsage = {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/**
 * Typed error for Mistral OCR API failures.
 *
 * @example
 * ```ts
 * new MistralOcrError({ message: "Failed to process document" })
 * ```
 */
export class MistralOcrError extends Data.TaggedError('MistralOcrError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Service interface for Mistral OCR.
 */
export type MistralOcrServiceShape = {
  /**
   * Process a document (PDF or image) and extract text and structured data.
   *
   * @param input - A Buffer containing the document data, or a URL pointing to the document.
   * @param mediaType - The MIME type of the document (e.g., 'application/pdf', 'image/png').
   *                    Defaults to 'application/pdf'.
   */
  readonly processDocument: (
    input: Buffer | URL,
    mediaType?: string,
  ) => Effect.Effect<OcrResult, MistralOcrError>;
};

// ---------------------------------------------------------------------------
// Service tag
// ---------------------------------------------------------------------------

/**
 * Service tag for MistralOcrService.
 *
 * @example
 * ```ts
 * import { MistralOcrService } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const ocr = yield* MistralOcrService
 *   const result = yield* ocr.processDocument(
 *     new URL("https://example.com/doc.pdf")
 *   )
 *   console.log(result.text)
 * })
 * ```
 */
export const MistralOcrService =
  Context.GenericTag<MistralOcrServiceShape>('MistralOcrService');

// ---------------------------------------------------------------------------
// Live layer
// ---------------------------------------------------------------------------

/**
 * Live layer for MistralOcrService.
 *
 * Reads `MISTRAL_API_KEY` from Effect Config.
 * Uses `@ai-sdk/mistral` with `pixtral-large-latest` model for vision-based OCR.
 * Missing config will produce a ConfigError at layer construction time.
 */
export const MistralOcrLive = Layer.effect(
  MistralOcrService,
  Effect.gen(function* () {
    const apiKey = yield* Config.string('MISTRAL_API_KEY');

    const mistral = createMistral({ apiKey });

    return MistralOcrService.of({
      processDocument: (input: Buffer | URL, mediaType = 'application/pdf') =>
        Effect.tryPromise({
          try: async () => {
            const filePart =
              input instanceof URL
                ? { type: 'file' as const, data: input, mediaType }
                : { type: 'file' as const, data: input, mediaType };

            const result = await generateText({
              model: mistral('pixtral-large-latest'),
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Extract all text from this document. Preserve the structure, headings, paragraphs, tables, and lists as closely as possible. Return the full extracted text.',
                    },
                    filePart,
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

            return {
              text: result.text,
              structuredData,
              model: 'pixtral-large-latest',
              usage: {
                inputTokens: result.usage?.inputTokens ?? 0,
                outputTokens: result.usage?.outputTokens ?? 0,
                totalTokens: result.usage?.totalTokens ?? 0,
              },
            } satisfies OcrResult;
          },
          catch: error =>
            new MistralOcrError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Document processing failed',
              cause: error,
            }),
        }),
    });
  }),
);
