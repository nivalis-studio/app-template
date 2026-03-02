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
// Google Auth (shared dependency for Google services)
export {
  GoogleAuth,
  type GoogleAuthClient,
  GoogleAuthLive,
  type GoogleAuthService,
} from './google-auth.js';
