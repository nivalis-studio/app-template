# Firecrawl SDK – Technical Reference

## Overview

Firecrawl is a web data API for AI applications. It scrapes websites into clean markdown/HTML, crawls entire sites, and extracts structured data. Handles JavaScript-heavy sites, proxies, and anti-bot measures out of the box.

---

## Two Integration Paths

### 1. Standalone SDK: `@mendable/firecrawl-js`

- **npm**: `npm install @mendable/firecrawl-js`
- **Latest version**: 4.15.0
- **Use when**: You need direct control over scraping/crawling operations (server actions, API routes, background jobs)

### 2. Vercel AI SDK Integration: `firecrawl-aisdk`

- **npm**: `npm install firecrawl-aisdk ai`
- **Latest version**: 0.10.0
- **Use when**: You want to give an LLM agent web scraping capabilities as tools via the Vercel AI SDK

---

## Environment Variables

```bash
FIRECRAWL_API_KEY=fc-your-key   # Required – get from https://firecrawl.dev/app/api-keys
```

Get an API key at [firecrawl.dev](https://firecrawl.dev). Free tier available (no credit card needed).

---

## Path 1: Standalone SDK (`@mendable/firecrawl-js`)

### Initialization

```typescript
import Firecrawl from "@mendable/firecrawl-js";

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
});
```

If `FIRECRAWL_API_KEY` env var is set, you can omit the `apiKey` parameter.

### Scrape a Single URL

```typescript
const result = await firecrawl.scrape("https://example.com", {
  formats: ["markdown", "html"],
});

console.log(result.markdown); // Clean markdown content
console.log(result.html); // Raw HTML
console.log(result.metadata); // Title, description, etc.
```

### Crawl an Entire Website

```typescript
// Synchronous (waits for completion, auto-paginates)
const crawlResult = await firecrawl.crawl("https://example.com", {
  limit: 100, // Max pages
  scrapeOptions: {
    formats: ["markdown", "html"],
  },
});

console.log(crawlResult.status); // "completed"
console.log(crawlResult.data); // Array of scraped pages
```

### Async Crawl (for large sites)

```typescript
// Start without waiting
const { id } = await firecrawl.startCrawl("https://example.com", {
  limit: 500,
});

// Check status later
const status = await firecrawl.getCrawlStatus(id);
console.log(status.status); // "scraping" | "completed" | "failed"

// Cancel if needed
await firecrawl.cancelCrawl(id);
```

### Map a Website (discover URLs)

```typescript
const mapResult = await firecrawl.map("https://example.com", { limit: 100 });
console.log(mapResult.links); // Array of discovered URLs
```

### Extract Structured Data

```typescript
const result = await firecrawl.extract({
  urls: ["https://example.com/*"], // Supports wildcards
  prompt: "Extract product names, prices, and descriptions",
  schema: {
    type: "object",
    properties: {
      products: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            price: { type: "string" },
            description: { type: "string" },
          },
          required: ["name", "price"],
        },
      },
    },
    required: ["products"],
  },
});

console.log(result.data.products);
```

Extract can also work **without URLs** – just provide a prompt and Firecrawl's AI will find the data:

```typescript
const result = await firecrawl.extract({
  prompt: "Find the pricing plans for Firecrawl",
});
```

### Batch Scrape

```typescript
const batch = await firecrawl.batchScrape(
  ["https://example.com/page1", "https://example.com/page2"],
  { options: { formats: ["markdown"] } }
);
```

### WebSocket Crawl (real-time updates)

```typescript
const { id } = await firecrawl.startCrawl("https://example.com", {
  limit: 50,
});

const watcher = firecrawl.watcher(id, {
  kind: "crawl",
  pollInterval: 2,
  timeout: 120,
});

watcher.on("document", (doc) => console.log("Got:", doc.metadata?.title));
watcher.on("done", (state) => console.log("Finished:", state.status));
watcher.on("error", (err) => console.error(err));

await watcher.start();
```

---

## Path 2: Vercel AI SDK Tools (`firecrawl-aisdk`)

This package provides pre-built AI SDK tools that LLMs can call directly.

### Available Tools

```typescript
import {
  scrapeTool, // Scrape single URL
  searchTool, // Search the web
  mapTool, // Discover URLs on a site
  crawlTool, // Crawl multiple pages (async, needs pollTool)
  batchScrapeTool, // Scrape multiple URLs (async, needs pollTool)
  agentTool, // AI agent that finds and extracts data
  extractTool, // Extract structured data
  pollTool, // Poll async jobs
  statusTool, // Check job status
  cancelTool, // Cancel jobs
  browserTool, // Browser automation
} from "firecrawl-aisdk";
```

### Scrape Example

```typescript
import { generateText } from "ai";
import { scrapeTool } from "firecrawl-aisdk";

const { text } = await generateText({
  model: "openai/gpt-4o",
  prompt: "Scrape https://example.com and summarize what it does",
  tools: { scrape: scrapeTool },
});
```

### Search + Scrape

```typescript
import { generateText } from "ai";
import { searchTool, scrapeTool } from "firecrawl-aisdk";

const { text } = await generateText({
  model: "openai/gpt-4o",
  prompt: "Search for Firecrawl, scrape the top result, and explain what it does",
  tools: { search: searchTool, scrape: scrapeTool },
});
```

### Crawl (async with polling)

```typescript
import { generateText } from "ai";
import { crawlTool, pollTool } from "firecrawl-aisdk";

const { text } = await generateText({
  model: "openai/gpt-4o",
  prompt: "Crawl https://docs.firecrawl.dev (limit 3 pages) and summarize",
  tools: { crawl: crawlTool, poll: pollTool },
});
```

### Streaming

```typescript
import { streamText } from "ai";
import { scrapeTool } from "firecrawl-aisdk";

const result = streamText({
  model: "openai/gpt-4o",
  prompt: "Scrape https://example.com and explain what it does",
  tools: { scrape: scrapeTool },
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

---

## Key Gotchas & Limitations

1. **API key required** – Firecrawl is a hosted service. Free tier exists but has rate limits.
2. **Crawl is async** – Large crawls return a job ID; you must poll for results. The SDK's `crawl()` method handles this automatically, but `startCrawl()` does not.
3. **Extract is in beta** – May have inconsistent results across runs on very large/dynamic sites. Full coverage of massive sites in a single request is not yet supported.
4. **Rate limits** – Check [docs.firecrawl.dev/rate-limits](https://docs.firecrawl.dev/rate-limits) for current limits per plan.
5. **Credits-based billing** – Extract uses credits (1 credit = 15 tokens). Scrape/crawl have their own credit costs.
6. **Self-hosting available** – Firecrawl is open source and can be self-hosted, but the managed service is recommended for most use cases.
7. **`firecrawl-aisdk` requires `ai` package** – It's designed specifically for Vercel AI SDK v6+. Install both: `npm install firecrawl-aisdk ai`.
8. **Results expire** – Extract job results are available via API for 24 hours after completion.

---

## Which Package to Use?

| Use Case | Package |
|---|---|
| Server action that scrapes a URL and returns data | `@mendable/firecrawl-js` |
| AI chatbot that can browse the web | `firecrawl-aisdk` |
| Background job crawling a site | `@mendable/firecrawl-js` |
| LLM agent with tool-calling | `firecrawl-aisdk` |
| Extract structured data programmatically | `@mendable/firecrawl-js` |
| Both AI tools + direct API access | Install both |

---

## Links

- **Docs**: https://docs.firecrawl.dev
- **Node SDK docs**: https://docs.firecrawl.dev/sdks/node
- **AI SDK integration**: https://ai-sdk.dev/tools-registry/firecrawl
- **GitHub**: https://github.com/firecrawl/firecrawl
- **API keys**: https://firecrawl.dev/app/api-keys
- **Pricing**: https://www.firecrawl.dev/pricing
