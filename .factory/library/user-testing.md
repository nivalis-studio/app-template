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
