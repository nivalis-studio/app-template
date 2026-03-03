/**
 * @nivalis/ai - AI toolkit with connectors as Effect services
 */

// Errors
export { GoogleAuthError } from './errors.js';
// Firecrawl (web scraping)
export {
  type CrawledPage,
  type CrawlOptions,
  type CrawlResult,
  type ExtractedData,
  type ExtractOptions,
  FirecrawlError,
  FirecrawlLive,
  FirecrawlService,
  type FirecrawlServiceShape,
  type ScrapedPage,
  type ScrapedPageMetadata,
} from './firecrawl.js';
// Gemini PDF (document extraction)
export {
  GeminiPdfError,
  GeminiPdfLive,
  GeminiPdfService,
  type GeminiPdfServiceShape,
  type PdfExtractionResult,
  type PdfExtractionUsage,
  type PdfPageInfo,
} from './gemini-pdf.js';
// Gmail (email operations)
export {
  type EmailMessage,
  GmailError,
  GmailLive,
  GmailService,
  type GmailServiceShape,
  type SendEmailOptions,
  type SentEmail,
} from './gmail.js';
// Google Auth (shared dependency for Google services)
export {
  GoogleAuth,
  type GoogleAuthClient,
  GoogleAuthLive,
  type GoogleAuthService,
} from './google-auth.js';
// Google Calendar (calendar operations)
export {
  type CalendarEvent,
  type EventDateTime,
  type EventInput,
  GoogleCalendarError,
  GoogleCalendarLive,
  GoogleCalendarService,
  type GoogleCalendarServiceShape,
  type TimeRange,
} from './google-calendar.js';
// Google Sheets (spreadsheet operations)
export {
  GoogleSheetsError,
  GoogleSheetsLive,
  GoogleSheetsService,
  type GoogleSheetsServiceShape,
  type SheetData,
} from './google-sheets.js';
// Mistral OCR (document processing)
export {
  MistralOcrError,
  MistralOcrLive,
  MistralOcrService,
  type MistralOcrServiceShape,
  type OcrResult,
  type OcrUsage,
} from './mistral-ocr.js';
// Composed layer (all 6 services)
export { AiToolkitLive } from './toolkit.js';
