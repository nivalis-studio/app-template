# Nivalis App Template

Monorepo template for building AI-powered tools fast. Ships with auth, database, AI connectors, and a polished UI — ready to deploy on Vercel.

## Tech Stack

- **Framework**: Next.js 16 (React 19, Turbopack)
- **Services**: Effect.ts (typed errors, layers, dependency injection)
- **AI**: Vercel AI SDK + provider packages (`@ai-sdk/google`, `@ai-sdk/mistral`, `@ai-sdk/openai`)
- **Auth**: Better-Auth (email/password, OAuth)
- **Database**: Prisma + Neon (serverless Postgres)
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Monitoring**: Sentry
- **Testing**: Vitest
- **Linting**: Biome
- **Monorepo**: pnpm workspaces + Turborepo

## Monorepo Structure

```
apps/
  web/              → Next.js app (pages, auth, API routes, UI)
packages/
  ai/               → AI connectors as Effect services
  utils/            → Shared utilities
```

## AI Connectors (`@nivalis/ai`)

All connectors are Effect services with typed errors, live layers, and a composed `AiToolkitLive` layer.

| Connector | Description |
|-----------|-------------|
| **Firecrawl** | Web scraping — scrape, crawl, and extract structured data from URLs |
| **Mistral OCR** | Document OCR via Pixtral Large — extract text from PDFs and images |
| **Gemini PDF** | PDF extraction via Gemini 2.5 Flash — text, structure, and page info |
| **Google Sheets** | Read, write, and append rows to spreadsheets |
| **Google Calendar** | List, create, update, and delete calendar events |
| **Gmail** | Send emails, list messages, get message details |

Google services share a single `GoogleAuth` layer for OAuth2.

## Getting Started

```bash
# Clone
git clone https://github.com/nivalis-studio/app-template.git
cd app-template

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Fill in your keys (see below)

# Run dev server
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (Next.js with Turbopack) |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run tests (Vitest) |
| `pnpm lint` | Lint with Biome |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm ts` | Type-check all packages |
| `pnpm knip` | Dead code detection |
| `pnpm jscpd` | Duplicate code detection |
| `pnpm syncpack:check` | Dependency version drift check |
| `pnpm test:e2e` | Playwright E2E tests |
| `pnpm test:coverage` | Vitest coverage report |
| `pnpm docs:generate` | Generate API docs (TypeDoc) |
| `pnpm todo:scan` | Scan for TODO/FIXME/HACK tech debt |
| `pnpm changeset` | Create a changeset for versioning |

## Environment Variables

Copy `.env.example` and fill in values:

```bash
# Database (required)
DATABASE_URL=

# Auth (required)
BETTER_AUTH_SECRET=

# AI Providers (optional — enable connectors as needed)
OPENAI_API_KEY=
MISTRAL_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
FIRECRAWL_API_KEY=

# Google OAuth (optional — for Sheets, Calendar, Gmail)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# Monitoring (optional)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

## Development Tools

- **[Knip](https://knip.dev)** — Dead code and unused dependency detection
- **[Syncpack](https://github.com/JamieMason/syncpack)** — Enforces consistent dependency versions across the monorepo
- **[jscpd](https://github.com/kucherenko/jscpd)** — Copy-paste / duplicate code detection
- **[Playwright](https://playwright.dev)** — End-to-end browser testing (Chromium, Firefox, WebKit)
- **[TypeDoc](https://typedoc.org)** — API documentation generation from TypeScript sources
- **[Changesets](https://github.com/changesets/changesets)** — Versioning, changelogs, and publish automation
- **[Vitest](https://vitest.dev) + `@vitest/coverage-v8`** — Unit/integration tests with V8 coverage reporting

## CI/CD

GitHub Actions workflows automate quality checks and releases:

- **CI** (`.github/workflows/ci.yml`) — Runs lint, typecheck, tests, and build on every pull request
- **Release** (`.github/workflows/release.yml`) — Automates versioning and publishing via Changesets when changes land on `main`

## Observability

- **[Pino](https://getpino.io)** — Structured JSON logging for server-side code
- **[OpenTelemetry](https://opentelemetry.io)** — Metrics and tracing instrumentation (`@opentelemetry/api`)
- **[Sentry](https://sentry.io)** — Error tracking, performance monitoring, and session replay (with PII masking)
- **[Vercel Analytics](https://vercel.com/analytics)** — Web Vitals and page-view analytics

## Feature Flags

Feature flags are powered by the [Vercel Flags SDK](https://vercel.com/docs/workflow-collaboration/feature-flags) (`flags` package). Flags are defined in `apps/web/src/flags.ts` and work standalone — no external service required.

## Key Patterns

**Effect services** — Each AI connector follows the same pattern:

```ts
import { FirecrawlService, FirecrawlLive } from "@nivalis/ai"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const firecrawl = yield* FirecrawlService
  const page = yield* firecrawl.scrape("https://example.com")
  console.log(page.markdown)
})

Effect.provide(program, FirecrawlLive)
```

- **Tagged errors** — Every service defines its own `Data.TaggedError` for typed error channels
- **Config from environment** — API keys are read via `Config.string()` at layer construction
- **Layer composition** — Use individual layers or `AiToolkitLive` for all 6 services at once

## License

Private — Nivalis Studio
