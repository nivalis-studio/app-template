# Architecture

Architectural decisions, patterns, and conventions for the Nivalis app template.

**What belongs here:** Architecture decisions, module boundaries, service patterns, coding conventions.

---

## Monorepo Structure

- `apps/web` — Next.js 16 App Router application
- `packages/utils` — Shared utilities and Effect helpers (@nivalis/utils)
- `packages/ai` — AI toolkit with connectors as Effect services (@nivalis/ai)

## Key Patterns

- **Effect.ts** is the core service layer. All backend services use Effect services, layers, and typed errors.
- **Prisma + Neon** for database via `@prisma/adapter-neon`
- **Better-Auth** for authentication with Prisma adapter
- **Vercel AI SDK** for chat/streaming (`ai` + `@ai-sdk/openai` + `@ai-sdk/react`)
- **Biome** for linting/formatting (not ESLint)
- **Tailwind CSS v4** via PostCSS
- **shadcn/ui** with `base-nova` style and `@base-ui/react` primitives
- **pnpm catalog** for shared dependency versions across workspace

## Module System

- ESM throughout (`"type": "module"`)
- Import alias: `@/*` → `./src/*` in apps/web
- Workspace protocol: `"workspace:*"` for internal packages
- **TypeScript extensions**: Internal package imports use `.ts` extensions with `allowImportingTsExtensions: true` in tsconfig. Use `.ts` (not `.js`) for all internal imports in `packages/ai/src/` and `packages/utils/src/`.

## Authentication Architecture

- **Dual-layer auth for protected routes**:
  1. `apps/web/src/proxy.ts` (middleware): Fast cookie existence check for `better-auth.session_token`. Redirects to `/sign-in` if cookie is absent. This is a performance optimization — no server-side session validation.
  2. `apps/web/src/app/dashboard/layout.tsx`: Full server-side session validation via `auth.api.getSession()`. Redirects to `/sign-in` if session is invalid/expired.
- Both layers are necessary: middleware prevents unauthenticated requests from reaching React rendering; layout catches expired/invalid sessions.
- **Redirect patterns**: Use `router.push()` for post-login redirects (SPA navigation). Use `window.location.href` for post-signout (full page reload clears client-side auth state/caches).
- **Cookie name**: Better-Auth default session cookie is `better-auth.session_token` (hardcoded in proxy.ts).

## shadcn/ui Conventions

- **Post-install lint fixes**: shadcn-generated components often need Biome lint fixes after installation (namespace imports → named imports, variable shadowing, magic numbers as named constants, a11y suppressions). Always run `pnpm lint:fix` after installing new components.
- **biome-ignore comments**: When suppressing Biome rules in generated code, always provide a justification comment explaining why (e.g., `// biome-ignore lint/a11y/noLabelWithoutControl: shadcn Label uses htmlFor via composition`).
- **`use client` boundary**: shadcn `buttonVariants` is exported from a `'use client'` module (`button.tsx`). It cannot be imported in server components. For styled Links in server components, either inline the Tailwind classes matching the variant or use a thin client wrapper component.

## Vercel AI SDK (v6)

- Project uses `ai@6.x` and `@ai-sdk/react@3.x` — the v6 API.
- **useChat**: Use `sendMessage({text: "..."})` (not `handleSubmit`). Messages use `message.parts` array (not `message.content` string). Filter parts by `p.type === 'text'` for text content.
- **streamText tools**: Use `inputSchema` (not `parameters`) for Zod schema in `tool()` definitions. Use `stopWhen: stepCountIs(N)` (not the deprecated `maxSteps`) to enable automatic follow-up after tool execution. Import `stepCountIs` from `'ai'`.
- **shadcn data-slot targeting**: shadcn/ui components expose internal sub-elements via `data-slot` attributes (e.g., `[data-slot="scroll-area-viewport"]` for ScrollArea's viewport). Use `querySelector('[data-slot="..."]')` when you need to programmatically access component internals.
- **Streaming response**: Use `result.toUIMessageStreamResponse()` to return streaming responses from API routes.

## Observability Infrastructure

- **Structured logging**: `apps/web/src/lib/logger.ts` — pino logger with configurable `LOG_LEVEL` env var (defaults to `'info'`). Use `logger.child({requestId})` for request-correlated logs.
- **Request tracing**: `apps/web/src/lib/request-id.ts` — `getRequestId(headers)` extracts `X-Request-ID` header or generates one via `crypto.randomUUID()`. Creates child pino loggers with request context.
- **Metrics**: `apps/web/src/lib/metrics.ts` — OpenTelemetry-based metrics using `@opentelemetry/api`. Provides counters (`incrementCounter`), histograms (`recordDuration`), and a `measureAsync` helper. **Note:** `@vercel/otel` is installed but `registerOTel()` is NOT called in `instrumentation.ts` — the meter currently operates as a no-op. To activate real metric emission, add `import { registerOTel } from '@vercel/otel'` and call `registerOTel({serviceName: 'nivalis-web'})` in `apps/web/src/instrumentation.ts`.
- **Feature flags**: `apps/web/src/flags.ts` — Vercel Flags SDK (`flags/next`). Standalone flags with inline `decide()` functions. Current flags: `showNewDashboard` (env-based) and `enableAiChat` (default true).

## E2E Testing

- **Playwright** is configured at root (`playwright.config.ts`) with a `webServer` directive that starts `pnpm dev` on port 3000.
- Smoke tests live in `e2e/` directory (e.g., `e2e/smoke.test.ts`).
- Run with `pnpm test:e2e` (not part of `pnpm test` which runs Vitest only).
- Only chromium project is configured; add `firefox`/`webkit` as needed.

## Deployment

- Vercel (region: cdg1 Paris)
- React Compiler enabled
- Typed routes enabled
