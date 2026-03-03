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
- **CRITICAL**: turbo dev does not pass env vars through to Next.js properly. Must start Next.js directly: `cd apps/web && DATABASE_URL=... BETTER_AUTH_SECRET=dev-secret npx next dev`
- **RESOLVED**: Better-Auth config in `apps/web/src/lib/auth.ts` now has `emailAndPassword: { enabled: true }`. This was fixed in commit 41ecc53.
- **CRITICAL**: Neon PostgreSQL cloud database credentials in .env have expired or are invalid. Prisma returns P1000 ("Authentication failed against the database server, the provided database credentials are not valid"). All auth-dependent flows (sign-up, sign-in, dashboard access, sign-out) will fail until valid Neon DB credentials are provided. This is NOT an application code issue — the auth code is correct.
- The root .env has DATABASE_URL and DATABASE_URL_POOLER but NOT BETTER_AUTH_SECRET — that must be provided explicitly

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

## Flow Validator Guidance: App Shell Browser Testing

App Shell milestone assertions require browser-based testing via `agent-browser` skill.

### Environment
- Dev server is running at http://localhost:3000 with BETTER_AUTH_SECRET=dev-secret
- Database: Neon PostgreSQL (cloud) — .env has DATABASE_URL
- OPENAI_API_KEY may not be set — AI chat testing should verify structure renders, not expect real AI responses

### Isolation Rules
- Each subagent gets a **unique browser session** (use --session flag)
- Each subagent gets a **unique test account** (different email addresses)
- Do NOT create accounts using another subagent's email
- Do NOT sign out of another subagent's session
- Do NOT restart the dev server or modify any source files
- For sign-up testing: create a fresh account with the assigned email, then verify redirect
- For login testing: use a pre-created account with the assigned email

### Browser Session Naming
- Group 1 (Landing): `--session "d1ab075ff926__landing"`
- Group 2 (Auth Forms): `--session "d1ab075ff926__auth"`
- Group 3 (Dashboard): `--session "d1ab075ff926__dash"`
- Group 4 (AI Chat): `--session "d1ab075ff926__chat"`

### Test Account Assignments
- Group 2 (Auth Forms): testuser1@example.com / TestPassword123!
- Group 3 (Dashboard): testuser2@example.com / TestPassword123!
- Group 4 (AI Chat): testuser3@example.com / TestPassword123!

### Testing Approach
- Use `agent-browser` skill for all browser-based assertions
- Invoke `agent-browser` via the Skill tool at session start
- Navigate to URLs, take screenshots, check DOM elements
- For API checks, use curl commands directly
- For code structure checks (VAL-CROSS-007, VAL-CROSS-008, VAL-SHELL-012), use Read/Grep tools

### Known Behavior
- Protected routes (/dashboard, /dashboard/chat) redirect to /sign-in when unauthenticated
- Sign-up: POST /api/auth/sign-up/email with JSON body {name, email, password}
- Sign-in: POST /api/auth/sign-in/email with JSON body {email, password}
- Sign-out: POST /api/auth/sign-out
- Auth uses cookies for session management
- If OPENAI_API_KEY is missing, the chat API route should return a helpful error message, not crash
- The 404 page is Next.js's default or custom not-found.tsx

### Build Verification
- For VAL-CROSS-002 (production build): run `BETTER_AUTH_SECRET=dev-secret DATABASE_URL=postgresql://placeholder:placeholder@localhost/placeholder pnpm build` from repo root
- Build command should exit 0
