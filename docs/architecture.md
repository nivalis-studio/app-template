# Architecture

This document describes the high-level architecture of the Nivalis App Template monorepo, including its structure, request flow, and authentication system.

## Monorepo Structure

The repository is organized as a pnpm monorepo with Turborepo for task orchestration. The `apps/web` application depends on two shared packages: `@nivalis/ai` for AI service connectors and `@nivalis/utils` for shared utilities and Effect helpers.

```mermaid
flowchart TD
    subgraph Monorepo["Nivalis App Template Monorepo"]
        direction TB
        Web["apps/web<br/><i>Next.js 16 App Router</i><br/>React 19 · Turbopack"]
        AI["packages/ai<br/><i>@nivalis/ai</i><br/>AI connectors as Effect.ts services"]
        Utils["packages/utils<br/><i>@nivalis/utils</i><br/>Shared utilities & Effect helpers"]
    end

    Web --> AI
    Web --> Utils

    subgraph Tools["Tooling"]
        Turbo["Turborepo<br/>Task orchestration"]
        Biome["Biome<br/>Linting & formatting"]
        Vitest["Vitest<br/>Testing"]
        Lefthook["Lefthook<br/>Git hooks"]
    end

    Tools -.->|manages| Monorepo
```

**Key relationships:**

- **`apps/web`** — The Next.js 16 application using App Router with React 19 and Turbopack. Handles routing, rendering, authentication, and API endpoints.
- **`packages/ai`** — Contains AI service connectors built as Effect.ts services: Firecrawl (web scraping), Mistral OCR (document processing), Gemini PDF (PDF extraction), Google Sheets, Google Calendar, and Gmail.
- **`packages/utils`** — Provides shared utilities including Effect error types (`NotFoundError`, `ServiceError`, `ValidationError`, `UnauthorizedError`), layer composition helpers (`composeLayers`, `makeServiceLayer`), and a runtime factory (`makeRuntime`).

## Request Flow

When a user interacts with the application, requests flow from the browser through Next.js to the API routes, which use Effect.ts services to communicate with external APIs.

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js<br/>App Router
    participant API as API Routes
    participant Effect as Effect.ts<br/>Services
    participant Firecrawl as Firecrawl API
    participant Google as Google APIs<br/>(Sheets, Calendar, Gmail)
    participant Mistral as Mistral API
    participant Gemini as Gemini API

    Browser->>NextJS: HTTP Request
    NextJS->>NextJS: Middleware (proxy.ts)<br/>Cookie check

    alt Static Page
        NextJS-->>Browser: Server-rendered HTML
    else API Request
        NextJS->>API: Route handler
        API->>Effect: Run Effect program
        Effect->>Effect: Resolve service layers

        alt Web Scraping
            Effect->>Firecrawl: Scrape / Crawl / Extract
            Firecrawl-->>Effect: Scraped data
        else Document OCR
            Effect->>Mistral: OCR document
            Mistral-->>Effect: OCR result
        else PDF Extraction
            Effect->>Gemini: Extract PDF content
            Gemini-->>Effect: Extracted text
        else Google Services
            Effect->>Google: Sheets / Calendar / Gmail
            Google-->>Effect: API response
        end

        Effect-->>API: Effect result (success or typed error)
        API-->>NextJS: JSON response
        NextJS-->>Browser: HTTP Response
    end
```

**Key points:**

- **Middleware** (`proxy.ts`) performs a fast cookie existence check for `better-auth.session_token` before protected routes.
- **Effect.ts services** provide typed error handling — each connector defines its own `Data.TaggedError` (e.g., `FirecrawlError`, `GmailError`), enabling exhaustive error matching.
- **Layer composition** — Individual service layers (e.g., `FirecrawlLive`, `GmailLive`) can be composed into `AiToolkitLive` for providing all services at once. Google services share a single `GoogleAuth` layer for OAuth2 token management.
- **Environment config** — API keys are read via `Config.string()` at layer construction time and validated at runtime via Zod schemas in `env.ts`.

## Authentication Flow

Authentication is handled by `better-auth` with a Prisma adapter connected to a Neon PostgreSQL database. The system provides dual-layer route protection for security.

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js<br/>App Router
    participant Middleware as Middleware<br/>(proxy.ts)
    participant Layout as Dashboard Layout
    participant Auth as better-auth
    participant Prisma as Prisma ORM
    participant Neon as Neon PostgreSQL

    Browser->>NextJS: Request to /dashboard/*

    rect rgb(240, 240, 255)
        Note over Middleware: Layer 1: Fast Cookie Check
        NextJS->>Middleware: Check request
        Middleware->>Middleware: Check session_token cookie exists
        alt No Cookie
            Middleware-->>Browser: Redirect to /sign-in
        else Cookie Present
            Middleware->>NextJS: Continue
        end
    end

    rect rgb(240, 255, 240)
        Note over Layout: Layer 2: Full Session Validation
        NextJS->>Layout: Render dashboard layout
        Layout->>Auth: auth.api.getSession()
        Auth->>Prisma: Query session
        Prisma->>Neon: SELECT session + user
        Neon-->>Prisma: Session data
        Prisma-->>Auth: Session record
        alt Invalid / Expired Session
            Auth-->>Layout: null session
            Layout-->>Browser: Redirect to /sign-in
        else Valid Session
            Auth-->>Layout: User session
            Layout-->>Browser: Render dashboard
        end
    end
```

**Dual-layer protection:**

1. **Layer 1 — Middleware** (`proxy.ts`): A fast, lightweight check that verifies the `better-auth.session_token` cookie exists. This catches unauthenticated users early without a database query.
2. **Layer 2 — Dashboard Layout** (`app/dashboard/layout.tsx`): A full server-side session validation via `auth.api.getSession()`, which queries the database through Prisma to verify the session is valid and not expired.

**Infrastructure:**

- **better-auth** — Handles email/password and OAuth authentication flows with session management.
- **Prisma ORM** — Provides the database adapter for better-auth, using the Neon serverless adapter (`@prisma/adapter-neon`).
- **Neon PostgreSQL** — Serverless Postgres database that stores user accounts, sessions, and related auth data.
