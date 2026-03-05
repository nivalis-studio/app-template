# Vercel Flags SDK Research

## Key Package: `flags` (not `@vercel/flags`)

The current package is `flags` (npm), imported as `flags/next` for Next.js.
`@vercel/flags` is the legacy v3 package.

## Installation
```bash
pnpm add flags
```

## Defining Flags
```ts
import { flag } from 'flags/next';

export const showBanner = flag({
  key: 'show-banner',
  decide() {
    return process.env.ENABLE_BANNER === 'true';
  },
});
```

## Using in Server Components
```tsx
import { showBanner } from '../flags';

export default async function Page() {
  const banner = await showBanner();
  return <div>{banner ? 'Banner visible' : 'Hidden'}</div>;
}
```

## Works Standalone
No external service needed. `decide()` is inline logic (env vars, config, etc.).
FLAGS_SECRET only needed for Vercel Toolbar Flags Explorer (optional).

## Docs
- https://flags-sdk.dev/docs
- https://github.com/vercel/flags
