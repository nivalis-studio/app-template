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
// Google Auth (shared dependency for Google services)
export {
  GoogleAuth,
  type GoogleAuthClient,
  GoogleAuthLive,
  type GoogleAuthService,
} from './google-auth.js';
// Mistral OCR (document processing)
export {
  MistralOcrError,
  MistralOcrLive,
  MistralOcrService,
  type MistralOcrServiceShape,
  type OcrResult,
  type OcrUsage,
} from './mistral-ocr.js';
