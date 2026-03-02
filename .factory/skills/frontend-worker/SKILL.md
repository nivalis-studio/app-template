---
name: frontend-worker
description: Builds Next.js pages, components, and UI for the app shell (landing, auth, dashboard) with Tailwind and shadcn.
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features involving:
- Creating/modifying Next.js pages (landing, auth, dashboard)
- Installing and using shadcn/ui components
- Building layouts (sidebar, navigation)
- Implementing the AI chat interface with Vercel AI SDK
- Creating API routes for chat/AI functionality
- Auth flow UI (login, signup, signout)

## Work Procedure

1. **Read the feature description carefully.** Understand what pages/components to build and what the expected behavior is.

2. **Check existing patterns.** Before building:
   - Read `apps/web/src/app/layout.tsx` for root layout patterns
   - Read `apps/web/components.json` for shadcn/ui configuration
   - Read `apps/web/src/lib/auth.ts` and `apps/web/src/lib/auth-client.ts` for auth patterns
   - Read `apps/web/src/styles/globals.css` for theme variables
   - Check what shadcn components are already installed in `apps/web/src/components/ui/`

3. **Install needed shadcn components.** Before building UI:
   - Run `cd apps/web && npx shadcn@latest add <component>` for each needed component
   - Common components: button, input, card, label, separator, sheet, avatar, dropdown-menu
   - These install into `apps/web/src/components/ui/`

4. **Write tests first (TDD).** For pages and components:
   - Create test files for utility functions and hooks
   - For React components: test rendering, user interactions, form validation
   - Mock auth hooks and API calls
   - Use Vitest with `@testing-library/react` if available, otherwise test logic separately

5. **Implement the UI:**
   - Use Next.js App Router conventions (page.tsx, layout.tsx, loading.tsx)
   - Use server components by default, `"use client"` only when needed
   - Use Tailwind CSS classes for styling (dark mode by default)
   - Use shadcn/ui components — never build custom UI when shadcn has it
   - Use the `cn()` utility from `@/lib/classnames` for class merging
   - Follow existing import alias `@/*` → `./src/*`
   - Keep landing page minimal and clean — no bloat

6. **For auth pages:**
   - Use `authClient` from `@/lib/auth-client` for client-side auth operations
   - Use `auth` from `@/lib/auth` for server-side session checks
   - Sign-up: `authClient.signUp.email()`
   - Sign-in: `authClient.signIn.email()`
   - Sign-out: `authClient.signOut()`
   - Redirect to `/dashboard` after successful auth
   - Redirect to `/sign-in` from protected routes when unauthenticated

7. **For the AI chat:**
   - Use `useChat` from `@ai-sdk/react` in the client component
   - Create API route at `apps/web/src/app/api/chat/route.ts`
   - Use `streamText` from `ai` package with `openai` provider from `@ai-sdk/openai`
   - Protect the API route with session check
   - Handle missing OPENAI_API_KEY gracefully (return helpful error message)

8. **Verify your work:**
   - Run `turbo build` — must exit 0
   - Run `turbo ts` — must exit 0
   - Run `turbo lint` — must exit 0
   - Run `turbo test` — must exit 0
   - Start dev server: `cd /Users/pnodet/git/nivalis/app-template && BETTER_AUTH_SECRET=dev-secret pnpm dev`
   - Use agent-browser to verify pages render correctly:
     a. Visit http://localhost:3000 — landing page renders
     b. Visit http://localhost:3000/sign-in — login form renders
     c. Visit http://localhost:3000/sign-up — signup form renders
     d. Visit http://localhost:3000/dashboard — redirects to /sign-in (if no session)
   - Kill the dev server when done

9. **Each browser check = one interactiveChecks entry** with the URL visited, what was observed, and whether it matches expected behavior.

## Example Handoff

```json
{
  "salientSummary": "Built the landing page with hero section, features grid, and CTA buttons linking to /sign-up. Installed button, card shadcn components. Verified with agent-browser: page renders at localhost:3000, all links navigate correctly. turbo build/ts/lint pass.",
  "whatWasImplemented": "apps/web/src/app/page.tsx — Redesigned landing with Hero component (heading, description, CTA buttons), Features section (3 cards), and footer. Installed shadcn button and card components. All links point to /sign-in and /sign-up.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "turbo build", "exitCode": 0, "observation": "Build successful, all routes compiled" },
      { "command": "turbo ts", "exitCode": 0, "observation": "No type errors" },
      { "command": "turbo lint", "exitCode": 0, "observation": "Clean" },
      { "command": "turbo test", "exitCode": 0, "observation": "All tests pass" }
    ],
    "interactiveChecks": [
      { "action": "Visited http://localhost:3000 with agent-browser", "observed": "Landing page renders with hero heading 'Build AI-Powered Tools Fast', 3 feature cards visible, CTA buttons present. Dark theme applied." },
      { "action": "Clicked 'Get Started' CTA button", "observed": "Navigated to /sign-up page without errors" },
      { "action": "Clicked 'Sign In' nav link", "observed": "Navigated to /sign-in page without errors" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/web/src/__tests__/landing.test.ts",
        "cases": [
          { "name": "SEO constants are defined", "verifies": "Title and description are non-empty strings" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- shadcn/ui component installation fails or components.json is misconfigured
- Better-Auth API behavior doesn't match expected patterns
- Auth middleware (proxy.ts) needs changes beyond the feature scope
- Missing shared packages that should have been created by infra-worker
