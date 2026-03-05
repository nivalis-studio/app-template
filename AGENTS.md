# AGENTS.md

Comprehensive guide for AI agents and developers working in the Nivalis App Template monorepo.

---

## 1. Project Overview

This is a **pnpm monorepo** for building AI-powered tools, deployed on Vercel. The repo uses Turborepo for task orchestration.

### Monorepo Structure

```
apps/
  web/              → Next.js 16 app (App Router, React 19, Turbopack)
packages/
  ai/               → AI connectors as Effect.ts services (@nivalis/ai)
  utils/            → Shared utilities and Effect helpers (@nivalis/utils)
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (React 19, Turbopack, App Router) |
| Services | Effect.ts (typed errors, layers, dependency injection) |
| AI | Vercel AI SDK v6 (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/mistral`) |
| Auth | better-auth (email/password, OAuth, Prisma adapter) |
| Database | Prisma 7.x + Neon serverless Postgres (`@prisma/adapter-neon`) |
| Styling | Tailwind CSS v4, shadcn/ui (`@base-ui/react` primitives) |
| Monitoring | Sentry (`@sentry/nextjs`), Vercel Analytics (`@vercel/analytics`) |
| Testing | Vitest 4.x (workspace mode via `vitest.workspace.ts`) |
| Linting | Biome 2.4.4 (`@nivalis/biome-config` — Ultracite ~200+ rules) |
| Package Manager | pnpm 10.x with workspace catalog protocol |
| Task Runner | Turborepo 2.8.12 |
| Git Hooks | Lefthook (pre-commit: biome check + typecheck, commit-msg: commitlint) |

---

## 2. Commands

All commands are run from the repository root using `pnpm`.

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server with Turbopack (via `turbo dev --filter=@nivalis/web`) |
| `pnpm build` | Build all packages and apps (`turbo build`) |
| `pnpm test` | Run Vitest across all workspaces (`turbo test`) |
| `pnpm lint` | Lint all packages with Biome (`turbo lint`) |
| `pnpm lint:fix` | Auto-fix lint issues with Biome (`turbo lint:fix`) |
| `pnpm ts` | Type-check all packages (`turbo ts`) |
| `pnpm start` | Start production server (`pnpm --filter=@nivalis/web start`) |
| `pnpm prepare` | Install Lefthook git hooks (`lefthook install`) |

### Per-Package Scripts

**`apps/web`** (`@nivalis/web`):
- `pnpm --filter=@nivalis/web dev` — Next.js dev with Turbopack
- `pnpm --filter=@nivalis/web build` — Production build
- `pnpm --filter=@nivalis/web ts` — Generates Next.js types then runs `tsc --noEmit`
- `pnpm --filter=@nivalis/web test` — Vitest with `--passWithNoTests`
- `pnpm --filter=@nivalis/web postinstall` — Runs `prisma generate`

**`packages/ai`** and **`packages/utils`**:
- `build` — `tsc --noEmit`
- `test` — `vitest run --passWithNoTests`
- `lint` / `lint:fix` — Biome check

---

## 3. Development Workflow

### Initial Setup

```bash
git clone https://github.com/nivalis-studio/app-template.git
cd app-template
pnpm install          # Installs all deps, runs lefthook install, generates Prisma client
cp .env.example .env  # Fill in required keys (DATABASE_URL, BETTER_AUTH_SECRET)
pnpm dev              # Start dev server at http://localhost:3000
```

### Environment Configuration

Environment variables are validated at runtime via Zod schemas in `apps/web/src/env.ts`.

**Required:**
- `DATABASE_URL` — Neon Postgres connection string
- `BETTER_AUTH_SECRET` — Secret for auth session signing

**Optional (enable features as needed):**
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — Sentry error tracking
- `SENTRY_AUTH_TOKEN` — Sentry source map uploads (CI only)
- `OPENAI_API_KEY`, `MISTRAL_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `FIRECRAWL_API_KEY` — AI providers
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` — Google OAuth (Sheets, Calendar, Gmail)

All env vars used in build must also appear in `turbo.json` under `globalPassThroughEnv` or task-level `env`.

### Git Hooks (Lefthook)

Managed by Lefthook (`lefthook.yml`):

- **pre-commit** (parallel):
  1. Biome check with auto-fix on staged files (`biome check --write --no-errors-on-unmatched`)
  2. TypeScript check (`pnpm run ts`)
- **commit-msg**: Commitlint validates conventional commit format (`pnpm commitlint --edit`)

### Conventional Commits

Enforced by `@commitlint/config-conventional` (configured in `commitlint.config.mjs`). All commit messages must follow:

```
<type>(<scope>): <description>

Types: feat, fix, chore, docs, style, refactor, perf, test, ci, build
```

### Dependency Management

- All dependencies use the **catalog protocol**: versions are centralized in `pnpm-workspace.yaml` under the `catalog:` section
- Package.json files reference `"catalog:"` instead of version numbers
- Internal packages use `"workspace:*"`
- After adding a new dependency: add version to `pnpm-workspace.yaml` catalog, add `"catalog:"` to package.json, then run `pnpm install`

---

## 4. Naming Conventions

The project enforces the following naming conventions:

| Context | Convention | Examples |
|---------|-----------|----------|
| Variables and functions | **camelCase** | `getUserData`, `isAuthenticated`, `tracesSampleRate` |
| React components, types, interfaces, classes | **PascalCase** | `ChatMessage`, `FirecrawlService`, `NextConfig` |
| File and directory names | **kebab-case** | `instrumentation-client.ts`, `google-calendar.ts`, `sentry.server.config.ts` |
| Environment variables and constants | **UPPER_SNAKE_CASE** | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `OPENAI_API_KEY` |
| CSS classes | **Tailwind utility classes** | Use Tailwind CSS v4 utilities, `tailwind-merge` for conditional merging |
| Package names | **@scope/kebab-case** | `@nivalis/web`, `@nivalis/ai`, `@nivalis/utils` |

### File Organization

- Source files in `src/` directories
- Tests in `__tests__/` directories or `*.test.ts` files
- Configuration files at package root (e.g., `vitest.config.ts`, `biome.jsonc`)
- The `@/*` import alias maps to `./src/*` in `apps/web`

---

## 5. PII Handling

### Data Classification

**Personally Identifiable Information (PII)** includes:
- User email addresses and names (stored in the database via better-auth)
- Authentication tokens and session data
- IP addresses and geolocation data
- Any user-submitted content that could identify an individual

### Sentry Configuration

PII protection is configured in `apps/web/src/instrumentation-client.ts`:

```ts
init({
  sendDefaultPii: false,  // Do NOT send cookies, headers, or user IP to Sentry
  integrations: [
    replayIntegration({
      maskAllText: true,     // Mask all text content in session replays
      maskAllInputs: true,   // Mask all form input values in session replays
      blockAllMedia: true,   // Block all media elements in session replays
    }),
  ],
});
```

- **`sendDefaultPii: false`** — Prevents Sentry from automatically collecting cookies, authorization headers, user IP addresses, and other browser-level PII
- **`maskAllText: true`** — All text in Sentry Session Replay is replaced with asterisks to prevent accidental PII capture in recordings
- **`maskAllInputs: true`** — All form inputs (passwords, emails, search queries) are masked in replay recordings
- **`blockAllMedia: true`** — Images and media (which may contain user content) are blocked from replay captures

### Developer Guidelines

1. **Never log PII** — Do not log email addresses, names, tokens, or any identifiable data to console or external services
2. **Sentry breadcrumbs** — Avoid attaching user-identifying data to Sentry breadcrumbs or custom events
3. **API responses** — Strip unnecessary PII from API responses; return only what the client needs
4. **Database queries** — Use Prisma's `select` to limit returned fields; avoid `SELECT *` patterns that may expose PII
5. **Environment variables** — Never commit `.env` files; they contain secrets and connection strings with credentials

### GDPR Compliance Approach

- Sentry's data scrubbing and PII-free configuration align with GDPR data minimization principles
- Session replay masking ensures no user content is transmitted to third-party services
- The `tunnelRoute: '/monitoring'` configuration in `apps/web/next.config.ts` routes Sentry data through the app server, keeping the Sentry DSN and data flow within the application boundary

---

## 6. Alerting & Incident Response

### Sentry Alerting

Sentry is the primary error tracking and alerting platform for this project.

- **Sentry Dashboard**: [https://sentry.io](https://sentry.io) — Access the project dashboard to view errors, performance data, and session replays
- **Configuration files**:
  - `apps/web/src/instrumentation-client.ts` — Client-side Sentry init (browser errors, replay, transitions)
  - `apps/web/src/sentry.server.config.ts` — Server-side Sentry init (Node.js errors)
  - `apps/web/src/sentry.edge.config.ts` — Edge runtime Sentry init
  - `apps/web/src/instrumentation.ts` — Next.js instrumentation hook that loads the appropriate Sentry config
  - `apps/web/next.config.ts` — `withSentryConfig` wrapper with source map uploads and tunnel route

### Configuring Alert Rules

In the Sentry dashboard, configure alerts for:

1. **Error rate spikes** — Create an alert rule that triggers when the error count exceeds a threshold (e.g., >10 errors in 5 minutes) for the project. Use "Issue Alerts" → "New Alert Rule" → condition: "The issue is seen more than X times in Y minutes."
2. **Performance degradation** — Set up "Metric Alerts" for transaction duration. Trigger when p95 response time exceeds acceptable thresholds (e.g., >2s for API routes, >4s for page loads).
3. **New issue notifications** — Enable alerts for first-seen issues to catch regressions early after deploys.

### Alert → Triage → Fix Workflow

1. **Alert fires** — A Sentry alert notification is sent (email, Slack, or other configured integration)
2. **Triage** — Check the Sentry issue page for:
   - Stack trace and source map (uploaded in CI via `SENTRY_AUTH_TOKEN`)
   - Affected users count and frequency
   - Session replay (if available) to see user actions leading to the error
   - Breadcrumbs for request/navigation context
3. **Fix** — Create a fix branch, reproduce locally, apply the fix, and deploy
4. **Verify** — After deploy, confirm the error rate returns to baseline in the Sentry dashboard

---

## 7. Deployment Observability

### Monitoring Surfaces

After every deployment, check the following dashboards to verify application health:

| Surface | URL | What to Check |
|---------|-----|---------------|
| **Vercel Analytics** | [https://vercel.com/analytics](https://vercel.com/analytics) | Page views, unique visitors, top pages, geographic distribution, Web Vitals (LCP, FID, CLS) |
| **Sentry Performance** | [https://sentry.io](https://sentry.io) | Transaction durations (p50, p75, p95), throughput, error rates per route, slow API endpoints |
| **Sentry Errors** | [https://sentry.io](https://sentry.io) | New issues since deploy, error frequency trends, regression detection |

### Post-Deploy Checklist

1. **Error rate** — Check Sentry for any spike in errors within the first 15 minutes after deploy. Compare with the pre-deploy baseline.
2. **Performance metrics** — Review Sentry Performance for transaction duration regressions. Pay attention to p95 latency for API routes.
3. **User analytics** — Check Vercel Analytics for any drop in page views or increase in bounce rate that might indicate broken flows.
4. **Web Vitals** — Monitor Core Web Vitals (LCP, FID, CLS) via Vercel Analytics to ensure no rendering performance regressions.
5. **Session replays** — Review recent Sentry session replays for unexpected user friction or errors.

### Ad-Blocker Bypass (Tunnel Route)

Sentry events are routed through the application server via `tunnelRoute: '/monitoring'` (configured in `apps/web/next.config.ts`). This ensures error tracking data reaches Sentry even when users have ad blockers that would normally block requests to `sentry.io`.

```ts
// apps/web/next.config.ts
export default withSentryConfig(nextConfig, {
  tunnelRoute: '/monitoring',
  // ...
});
```

The `/monitoring` route proxies Sentry event envelopes through the Next.js server, bypassing client-side ad-blocker restrictions.

---

## 8. Architecture

### Effect.ts Services

All AI connectors in `packages/ai/` are built as Effect.ts services with:
- **Tagged errors** — Each service defines its own `Data.TaggedError` for typed error channels
- **Config from environment** — API keys read via `Config.string()` at layer construction time
- **Layer composition** — Individual layers (`FirecrawlLive`, `GmailLive`, etc.) or composed `AiToolkitLive` for all services
- **Google services** share a single `GoogleAuth` layer for OAuth2

Available connectors: Firecrawl (web scraping), Mistral OCR (document OCR), Gemini PDF (PDF extraction), Google Sheets, Google Calendar, Gmail.

### Next.js App Router

- `apps/web/` uses Next.js 16 with App Router and React 19
- React Compiler and typed routes are enabled (`reactCompiler: true`, `typedRoutes: true`)
- `@/*` import alias maps to `./src/*`
- Instrumentation hook in `apps/web/src/instrumentation.ts` loads Sentry configs at startup
- Environment validation via Zod in `apps/web/src/env.ts`

### Prisma + Neon

- Prisma 7.x with Neon serverless adapter (`@prisma/adapter-neon`)
- Schema at `apps/web/src/prisma/schema`
- Config at `apps/web/prisma.config.ts`
- Generated client at `apps/web/src/prisma/client/` (auto-generated on `postinstall`)

### better-auth

- Authentication via `better-auth` with Prisma adapter
- Supports email/password and OAuth flows
- Dual-layer route protection:
  1. Middleware (`apps/web/src/proxy.ts`) — Fast cookie existence check for `better-auth.session_token`
  2. Layout (`apps/web/src/app/dashboard/layout.tsx`) — Full server-side session validation via `auth.api.getSession()`

### Module System

- ESM throughout (`"type": "module"` in all `package.json` files)
- TypeScript 5.9.x with `allowImportingTsExtensions: true` for internal `.ts` imports
- Workspace protocol (`"workspace:*"`) for internal packages
- Catalog protocol (`"catalog:"`) for all external dependencies with versions in `pnpm-workspace.yaml`
