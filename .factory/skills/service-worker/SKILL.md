---
name: service-worker
description: Builds Effect.ts services for AI connectors in the @nivalis/ai package with typed errors, layers, and unit tests.
---

# Service Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features involving:
- Creating AI connector services (Firecrawl, Mistral OCR, Gemini PDF, Google APIs)
- Building Effect services with typed errors and layers
- Implementing the @nivalis/ai package internals
- Creating shared Google Auth service

## Work Procedure

1. **Read the feature description carefully.** Understand which connector to build, what methods are needed, and what the expected behavior is.

2. **Read research files.** Check `.factory/research/` for the relevant technology:
   - `firecrawl.md` — Firecrawl SDK patterns
   - `mistral-ocr.md` — Mistral OCR API patterns
   - `gemini-pdf.md` — Gemini PDF extraction patterns
   - `google-apis.md` — Google Sheets/Calendar/Gmail patterns
   - `effect-nextjs.md` — Effect.ts integration patterns

3. **Read existing service code.** Check what's already in `packages/ai/src/` to follow established patterns. Every service MUST follow the same structure:
   - Service tag via `Context.GenericTag`
   - Typed error class via `Data.TaggedError`
   - Domain input/output types (NOT SDK types)
   - Live layer that reads config from Effect `Config`
   - Barrel export from `index.ts`

4. **Write tests first (TDD).** For each service:
   - Create `packages/ai/src/__tests__/{service}.test.ts`
   - Write tests that:
     a. Test the service with a mock layer (happy path)
     b. Test that missing API key produces ConfigError
     c. Test error handling (API failure → typed error)
   - All external API calls MUST be mocked — no real HTTP calls in tests

5. **Implement the service:**
   - Define the service interface with typed methods
   - Define domain types for inputs/outputs (e.g., `ScrapedPage`, `OcrResult`)
   - Define the error type with `Data.TaggedError`
   - Implement the live layer that:
     a. Reads API key from `Config.string("PROVIDER_API_KEY")`
     b. Creates the SDK client
     c. Wraps SDK calls in Effect.tryPromise with error mapping
     d. Returns domain types, not raw SDK responses
   - Export everything from the barrel `index.ts`

6. **Verify your work:**
   - Run `turbo test --filter=@nivalis/ai` — all tests pass
   - Run `turbo ts` — no type errors
   - Run `turbo lint` — no lint issues
   - Verify the service is exported from `@nivalis/ai` barrel
   - Verify error types appear in the Effect error channel (check type signatures)

7. **Check composability:**
   - Verify the service layer can be merged with other service layers
   - If this is a Google service, verify it depends on the shared GoogleAuth service

## Effect Service Pattern Reference

```typescript
import { Context, Data, Effect, Layer, Config } from "effect"

// 1. Domain types
export interface ScrapedPage {
  readonly url: string
  readonly content: string
  readonly metadata: Record<string, string>
}

// 2. Error type
export class FirecrawlError extends Data.TaggedError("FirecrawlError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// 3. Service interface
export interface FirecrawlService {
  readonly scrape: (url: string) => Effect.Effect<ScrapedPage, FirecrawlError>
}

// 4. Service tag
export const FirecrawlService = Context.GenericTag<FirecrawlService>("FirecrawlService")

// 5. Live layer
export const FirecrawlLive = Layer.effect(
  FirecrawlService,
  Effect.gen(function* () {
    const apiKey = yield* Config.string("FIRECRAWL_API_KEY")
    // Create client, return service implementation
    return FirecrawlService.of({
      scrape: (url) => Effect.tryPromise({
        try: () => client.scrape(url),
        catch: (error) => new FirecrawlError({ message: String(error), cause: error })
      })
    })
  })
)
```

## Example Handoff

```json
{
  "salientSummary": "Implemented Firecrawl service as Effect service in @nivalis/ai with scrape, crawl, and extract methods. All 6 tests pass including happy path, ConfigError on missing key, and error handling. Service exported from barrel.",
  "whatWasImplemented": "packages/ai/src/firecrawl.ts — FirecrawlService with Context.GenericTag, FirecrawlError with Data.TaggedError, domain types (ScrapedPage, CrawlResult, ExtractedData), FirecrawlLive layer reading FIRECRAWL_API_KEY from Config. Barrel export updated in index.ts.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "turbo test --filter=@nivalis/ai", "exitCode": 0, "observation": "6 tests passed for firecrawl service" },
      { "command": "turbo ts", "exitCode": 0, "observation": "No type errors" },
      { "command": "turbo lint", "exitCode": 0, "observation": "No lint issues" }
    ],
    "interactiveChecks": [
      { "action": "Verified FirecrawlService is importable from @nivalis/ai", "observed": "Import resolves, TypeScript shows correct type signatures with FirecrawlError in error channel" },
      { "action": "Verified FirecrawlLive can be merged with other layers", "observed": "Layer.merge(FirecrawlLive, MistralOcrLive) compiles without errors" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "packages/ai/src/__tests__/firecrawl.test.ts",
        "cases": [
          { "name": "scrapes a URL with mock implementation", "verifies": "Happy path returns ScrapedPage with correct fields" },
          { "name": "returns ConfigError when FIRECRAWL_API_KEY is missing", "verifies": "Missing config produces ConfigError, not crash" },
          { "name": "wraps API errors in FirecrawlError", "verifies": "SDK failures become typed FirecrawlError" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The @nivalis/ai package structure doesn't exist yet (infra-worker should create it first)
- Effect patterns from existing services are inconsistent
- SDK API has changed from what research documents describe
- Google Auth service doesn't exist when building a Google connector
