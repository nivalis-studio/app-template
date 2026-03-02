# AI Connectors

Reference for AI connector implementations in @nivalis/ai.

**What belongs here:** SDK specifics, API patterns, gotchas for each connector.

---

## Firecrawl (Web Scraping)
- Package: `@mendable/firecrawl-js` for direct API, `firecrawl-aisdk` for Vercel AI SDK tools
- Env: `FIRECRAWL_API_KEY`
- Methods: scrape(url), crawl(url), extract(url, schema)
- Research: `.factory/research/firecrawl.md`

## Mistral OCR
- Package: `@ai-sdk/mistral` for AI SDK integration
- Env: `MISTRAL_API_KEY`
- Model: `mistral-small-latest` or `pixtral-large-latest` for vision
- Send PDF as `{ type: 'file', mediaType: 'application/pdf' }` in messages
- Research: `.factory/research/mistral-ocr.md`

## Gemini PDF
- Package: `@ai-sdk/google`
- Env: `GOOGLE_GENERATIVE_AI_API_KEY`
- Model: `gemini-2.5-flash` or `gemini-2.5-pro`
- Send PDF as file part in messages for document understanding
- Research: `.factory/research/gemini-pdf.md`

## Google Sheets / Calendar / Gmail
- Package: `googleapis`
- Auth: Shared GoogleAuth service with OAuth2 client
- Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- All three share the same auth dependency
- Research: `.factory/research/google-apis.md`
