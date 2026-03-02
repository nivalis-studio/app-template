# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Required Environment Variables

- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Secret for Better-Auth session signing

## AI Provider Keys (optional, template uses placeholders)

- `OPENAI_API_KEY` — OpenAI API key for chat/completions
- `MISTRAL_API_KEY` — Mistral API key for OCR
- `GOOGLE_GENERATIVE_AI_API_KEY` — Google Gemini API key for PDF extraction
- `FIRECRAWL_API_KEY` — Firecrawl API key for web scraping

## Google APIs OAuth (optional)

- `GOOGLE_CLIENT_ID` — OAuth client ID
- `GOOGLE_CLIENT_SECRET` — OAuth client secret
- `GOOGLE_REFRESH_TOKEN` — OAuth refresh token

## Monitoring

- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — Sentry project DSN
- `SENTRY_AUTH_TOKEN` — CI only, for source maps upload
