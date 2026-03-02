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

## Deployment

- Vercel (region: cdg1 Paris)
- React Compiler enabled
- Typed routes enabled
