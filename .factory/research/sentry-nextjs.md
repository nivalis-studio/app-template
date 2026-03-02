# Sentry + Next.js 16 Setup Research

## Overview

`@sentry/nextjs` is the official Sentry SDK for Next.js. It supports Next.js 13.2.0+, App Router, Pages Router, Turbopack, React 19, and server components. The latest major version is v10.x (as of early 2026).

---

## Installation

```bash
# Option 1: Wizard (recommended for first-time setup)
npx @sentry/wizard@latest -i nextjs

# Option 2: Manual
npm install @sentry/nextjs --save
# or
pnpm add @sentry/nextjs
```

The wizard creates all necessary config files automatically.

---

## Required Files

After setup, you need these files in your project root (or `src/` if applicable):

### 1. `next.config.ts` — Wrap with `withSentryConfig`

```typescript
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Your existing Next.js configuration
};

export default withSentryConfig(nextConfig, {
  org: "your-org",
  project: "your-project",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Auth token for source map uploads (keep secret!)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Route Sentry events through your server to avoid ad blockers
  tunnelRoute: "/monitoring",
});
```

### 2. `instrumentation-client.ts` — Client-side SDK init

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adds request headers and IP for users
  sendDefaultPii: true,

  // Performance: 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  integrations: [
    // Session Replay
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
    // User Feedback widget
    Sentry.feedbackIntegration({
      colorScheme: "system",
    }),
  ],

  // Session Replay sample rates
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable structured logs
  enableLogs: true,
});

// Instrument router navigations for performance tracing
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

### 3. `sentry.server.config.ts` — Server-side SDK init

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Enable structured logs
  enableLogs: true,
});
```

### 4. `sentry.edge.config.ts` — Edge runtime SDK init

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,
});
```

### 5. `instrumentation.ts` — Register server-side SDK (Next.js instrumentation hook)

```typescript
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture errors from Server Components, middleware, and proxies
// Requires @sentry/nextjs >= 8.28.0 and Next.js 15+
export const onRequestError = Sentry.captureRequestError;
```

### 6. `app/global-error.tsx` — Capture React render errors

```tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
```

---

## Environment Variables

| Variable | Required | Public? | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Yes (client) | Sentry DSN for client-side. Safe to expose publicly. |
| `SENTRY_DSN` | Optional | No (server) | Server-side DSN. Falls back to `NEXT_PUBLIC_SENTRY_DSN` if not set. |
| `SENTRY_AUTH_TOKEN` | Yes (CI/CD) | **No** | Auth token for source map uploads. Keep secret! Set in CI only. |
| `SENTRY_ORG` | Optional | No | Can be set as env var instead of in `withSentryConfig`. |
| `SENTRY_PROJECT` | Optional | No | Can be set as env var instead of in `withSentryConfig`. |

### `.env.local` example

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_AUTH_TOKEN=sntrys_xxx  # Only needed for source map uploads (CI/CD)
```

---

## Server Actions Instrumentation

Wrap server actions with `Sentry.withServerActionInstrumentation()`:

```typescript
"use server";
import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";

export async function submitForm(formData: FormData) {
  return Sentry.withServerActionInstrumentation(
    "submitForm",
    {
      headers: await headers(),
      formData,
      recordResponse: true,
    },
    async () => {
      const result = await processForm(formData);
      return { success: true, data: result };
    },
  );
}
```

---

## Middleware Configuration

If using `tunnelRoute` and Next.js middleware, exclude the tunnel route:

```typescript
// middleware.ts
export const config = {
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## Custom Spans (Performance Tracing)

```typescript
import * as Sentry from "@sentry/nextjs";

const result = await Sentry.startSpan(
  { name: "expensive-operation", op: "function" },
  async () => {
    return await fetchDataFromAPI();
  },
);
```

---

## Structured Logging (New in v10+)

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.logger.info("User clicked checkout button");
Sentry.logger.info("Order completed", { orderId: "12345", total: 99.99 });
Sentry.logger.warn("Warning message");
Sentry.logger.error("Error occurred");
```

---

## React 19 Compatibility

- ✅ `@sentry/nextjs` v10.x is **fully compatible** with React 19
- ✅ Works with React Server Components
- ✅ `onRequestError` hook captures Server Component errors
- ✅ `global-error.tsx` captures client-side React render errors
- ✅ `replayIntegration` works with React 19 streaming
- ✅ `onRouterTransitionStart` export works with the new React 19 router

---

## withSentryConfig Options

```typescript
withSentryConfig(nextConfig, {
  // Required
  org: "your-org",
  project: "your-project",

  // Source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,  // Upload more source maps

  // Tunnel (bypass ad blockers)
  tunnelRoute: "/monitoring",

  // Logging
  silent: !process.env.CI,  // Only log in CI

  // Build options
  disableLogger: true,  // Remove Sentry logger in production for smaller bundle
  hideSourceMaps: true,  // Don't expose source maps publicly

  // Auto-instrumentation (Webpack only, not Turbopack)
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,

  // Exclude routes from instrumentation
  excludeServerRoutes: ["/api/health"],
});
```

---

## Turbopack vs Webpack

- **Next.js 15+ default is Turbopack** for development
- Sentry works with both Turbopack and Webpack
- Auto-instrumentation features (route exclusion, etc.) are **Webpack-only**
- With Turbopack, use the manual setup (instrumentation.ts + onRequestError)
- Source map upload works with both

---

## Gotchas

1. **Don't put `SENTRY_AUTH_TOKEN` in `.env.local`**: It's only needed at build time for source maps. Set it in CI/CD environment variables.
2. **`tunnelRoute` increases server load**: It routes all Sentry events through your Next.js server. Consider if this is appropriate for your traffic.
3. **`instrumentation.ts`**: Must be in project root (or `src/`). This is a Next.js feature, not Sentry-specific.
4. **`instrumentation-client.ts`**: This is the new (v10+) file for client-side init. Previously it was `sentry.client.config.ts`.
5. **`onRequestError`**: Requires `@sentry/nextjs >= 8.28.0` and Next.js 15+.
6. **Deprecated**: Setting a `sentry` property on the Next.js config is no longer supported. Use `withSentryConfig` options instead.
7. **Pages Router + App Router hybrid**: Both share the same Sentry config files. Add `pages/_error.tsx` for Pages Router errors.
8. **Sample rates in production**: Don't use `tracesSampleRate: 1.0` in production — adjust based on traffic.

---

## Summary of Files Needed

```
project-root/
├── next.config.ts                 # withSentryConfig wrapper
├── instrumentation.ts             # Server + Edge SDK registration
├── instrumentation-client.ts      # Client SDK init (replaces sentry.client.config.ts)
├── sentry.server.config.ts        # Server SDK init
├── sentry.edge.config.ts          # Edge SDK init
├── app/
│   └── global-error.tsx           # React error boundary for App Router
├── .env.local
│   ├── NEXT_PUBLIC_SENTRY_DSN=... # Public DSN
│   └── SENTRY_AUTH_TOKEN=...      # Only for local source map testing
└── .env.production (or CI)
    └── SENTRY_AUTH_TOKEN=...      # Source map upload token
```

---

## Sources

- https://docs.sentry.io/platforms/javascript/guides/nextjs/ (official docs)
- https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/ (manual setup)
- https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/ (extended config)
- https://www.npmjs.com/package/@sentry/nextjs (npm package)
- https://sentry.io/for/nextjs (marketing page with feature overview)
