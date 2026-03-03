/**
 * Composed layer that merges all 6 AI service live layers.
 *
 * Google services (Sheets, Calendar, Gmail) share the GoogleAuth layer.
 * Standalone services (Firecrawl, MistralOcr, GeminiPdf) are self-contained.
 *
 * This layer requires all necessary API keys and credentials to be set
 * in the environment or Effect ConfigProvider:
 *
 * - FIRECRAWL_API_KEY
 * - MISTRAL_API_KEY
 * - GOOGLE_GENERATIVE_AI_API_KEY
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REFRESH_TOKEN
 *
 * Missing keys will produce a ConfigError at layer construction time.
 *
 * @example
 * ```ts
 * import { AiToolkitLive, FirecrawlService, GmailService } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const firecrawl = yield* FirecrawlService
 *   const gmail = yield* GmailService
 *   const page = yield* firecrawl.scrape("https://example.com")
 *   yield* gmail.send("user@example.com", "Scraped", page.markdown ?? "")
 * })
 *
 * const runnable = Effect.provide(program, AiToolkitLive)
 * ```
 */
import { Layer } from 'effect';
import { FirecrawlLive } from './firecrawl.ts';
import { GeminiPdfLive } from './gemini-pdf.ts';
import { GmailLive } from './gmail.ts';
import { GoogleAuthLive } from './google-auth.ts';
import { GoogleCalendarLive } from './google-calendar.ts';
import { GoogleSheetsLive } from './google-sheets.ts';
import { MistralOcrLive } from './mistral-ocr.ts';

/**
 * Google services composed with their shared GoogleAuth dependency.
 */
const GoogleServicesLive = Layer.mergeAll(
  GoogleSheetsLive,
  GoogleCalendarLive,
  GmailLive,
).pipe(Layer.provideMerge(GoogleAuthLive));

/**
 * All 6 AI service live layers merged into a single composite layer.
 *
 * Provides: FirecrawlService, MistralOcrService, GeminiPdfService,
 * GoogleSheetsService, GoogleCalendarService, GmailService, and GoogleAuth.
 */
export const AiToolkitLive = Layer.mergeAll(
  FirecrawlLive,
  MistralOcrLive,
  GeminiPdfLive,
  GoogleServicesLive,
);
