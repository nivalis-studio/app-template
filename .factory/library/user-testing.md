# User Testing

Testing surface, tools, URLs, setup steps, and known quirks.

**What belongs here:** How to manually test the application, what surfaces to test, setup needed.

---

## Testing Surface

- **URL**: http://localhost:3000
- **Tool**: agent-browser for UI verification
- **Dev server**: `pnpm dev` (Next.js Turbopack on port 3000)

## Setup Steps

1. Ensure `.env` has `DATABASE_URL` and `BETTER_AUTH_SECRET`
2. Run `pnpm install`
3. Run `pnpm dev`
4. Wait for server to be ready at http://localhost:3000

## Pages to Test

- `/` — Landing page (hero, features, CTA)
- `/sign-in` — Login form
- `/sign-up` — Registration form
- `/dashboard` — Protected dashboard (requires auth)
- `/dashboard/chat` — AI chat interface

## Auth Testing

- Better-Auth with email/password
- Sign up creates user in Neon DB
- Session stored via cookies
- Protected routes redirect to /sign-in

## Known Quirks

- Neon DB credentials in .env may expire (check DATE_URL comment)
- BETTER_AUTH_SECRET must be set or app crashes on startup
- AI chat requires OPENAI_API_KEY to actually generate responses

## Flow Validator Guidance: Foundation Infrastructure

Foundation milestone assertions are all code/infrastructure checks — no browser testing needed.

### Isolation Rules
- Subagents are read-only: they inspect files, run builds/tests, and check configurations
- No shared mutable state — each subagent checks different aspects of the codebase
- Dev server is already running on port 3000 (for VAL-CROSS-001 healthcheck)
- Do NOT restart the dev server or modify any source files during validation

### Testing Approach
- Use file reads (Read, Grep tools) to verify file existence and content
- Use shell commands (turbo build, turbo test, turbo ts, turbo lint) for build verification
- Use curl for healthcheck assertions (VAL-CROSS-001)
- All assertions are verifiable through deterministic commands — no flaky tests

### Build Environment
- BETTER_AUTH_SECRET=dev-secret must be set for any build/dev commands
- DATABASE_URL needs placeholder for build: postgresql://placeholder:placeholder@localhost/placeholder
- Run turbo commands from repo root: /Users/pnodet/git/nivalis/app-template

## Flow Validator Guidance: AI Toolkit

AI Toolkit milestone assertions are all code/infrastructure checks — no browser testing needed.

### Isolation Rules
- Subagents are read-only: they inspect files, run builds/tests, and check configurations
- No shared mutable state — each subagent checks different aspects of the codebase
- Do NOT restart the dev server or modify any source files during validation
- Each subagent may run `turbo test --filter=@nivalis/ai` independently (reads only)

### Testing Approach
- Use file reads (Read, Grep tools) to verify service definitions, exports, types, error channels
- Use shell commands (turbo build, turbo test, turbo ts) for build/test verification
- Check barrel exports at `packages/ai/src/index.ts`
- Check individual service files at `packages/ai/src/<service-name>.ts`
- Check test files at `packages/ai/src/__tests__/<service-name>.test.ts`
- Check composed layer at `packages/ai/src/toolkit.ts`

### Package Structure
```
packages/ai/src/
├── index.ts           # Barrel exports all services
├── toolkit.ts         # AiToolkitLive composed layer
├── errors.ts          # Shared error types
├── google-auth.ts     # GoogleAuth shared dependency
├── firecrawl.ts       # Firecrawl service
├── mistral-ocr.ts     # Mistral OCR service
├── gemini-pdf.ts      # Gemini PDF service
├── google-sheets.ts   # Google Sheets service
├── google-calendar.ts # Google Calendar service
├── gmail.ts           # Gmail service
└── __tests__/         # Test files for each service
```

### Build Environment
- Run turbo commands from: /Users/pnodet/git/nivalis/app-template
- `BETTER_AUTH_SECRET=dev-secret` needed for build commands involving apps/web
- `DATABASE_URL=postgresql://placeholder:placeholder@localhost/placeholder` for build placeholders
