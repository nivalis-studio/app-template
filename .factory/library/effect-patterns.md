# Effect.ts Patterns

Patterns and conventions for Effect.ts usage in this project.

**What belongs here:** Effect service patterns, layer composition, error handling conventions.

---

## Service Definition Pattern

Every service follows this structure:
1. Domain types (input/output) — NOT SDK types
2. Error class via `Data.TaggedError`
3. Service interface
4. Service tag via `Context.GenericTag`
5. Live layer via `Layer.effect` that reads config from `Config`

## ManagedRuntime Singleton

Use globalThis caching for ManagedRuntime in Next.js to avoid re-creation on hot reload:

```typescript
import { ManagedRuntime, Layer } from "effect"

const globalValue = <T>(key: string, value: () => T): T => {
  const g = globalThis as Record<string, unknown>
  g[key] ??= value()
  return g[key] as T
}

export const runtime = globalValue("effect-runtime", () =>
  ManagedRuntime.make(AppLive)
)
```

## Error Handling

- All services use `Data.TaggedError` for typed errors
- API routes catch Effect failures and map to HTTP responses
- ConfigError for missing env vars — never crash on missing optional keys

## Layer Composition

- Each service has its own `Live` layer
- Google services share `GoogleAuthLive` layer
- Top-level `AiToolkitLive` merges all service layers
