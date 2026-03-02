# Effect.ts + Next.js App Router Integration Research

## Overview

Effect.ts can be deeply integrated with Next.js App Router for type-safe server components, API routes, server actions, and pages. The main patterns involve creating a `ManagedRuntime` singleton and using services/layers for dependency injection.

---

## Key Libraries

### 1. `@mcrovero/effect-nextjs` (⭐131, actively maintained — last commit Jan 2026)
- **Best choice for deep App Router integration**
- Typed helpers for pages, layouts, server components, actions
- Composable middleware system
- Works with `redirect`, `notFound`, and other Next.js control-flow
- Safe routing with Effect Schema for params/searchParams
- npm: `@mcrovero/effect-nextjs`
- GitHub: https://github.com/mcrovero/effect-nextjs
- Requires Next.js 15+

### 2. `@useflytrap/next-effect` (JSR package, smaller)
- Effect for Route Handlers, Server Actions, Pages, Forms
- Full type-safety for server-side responses
- OpenTelemetry tracing
- JSR: `@useflytrap/next-effect`
- GitHub: https://github.com/useflytrap/next-effect

### 3. `@prb/effect-next` (part of prb-effect monorepo)
- Effect integration for Next.js (web3-focused monorepo)
- npm: `@prb/effect-next`
- GitHub: https://github.com/PaulRBerg/prb-effect/tree/main/next
- Newer, smaller, beta — primarily for web3 projects

### 4. DIY with `@effect/platform` (no extra library)
- Use `HttpApp.toWebHandlerRuntime` for raw API handlers
- Use `ManagedRuntime` + `Effect.gen` for server components
- Most flexible, most boilerplate

---

## Architecture Pattern (Recommended)

Based on the production-tested architecture from Kevin Courbet's gist and `@mcrovero/effect-nextjs`:

### Directory Structure
```
app/
├── (app)/(dashboard)/invoices/
│   ├── page.tsx              # SSR entry point
│   ├── server.ts             # Effect queries (SSR source of truth)
│   ├── queries.ts            # "use server" wrappers for React Query
│   ├── actions.ts            # "use server" mutations
│   └── use-invoices.ts       # React Query hooks
│
├── server/features/invoice/
│   ├── invoice.models.ts     # Pure TypeScript types
│   ├── invoice.schemas.ts    # Effect.Schema (validation)
│   ├── invoice.service.ts    # Business logic (Effect.Tag + Layer)
│   └── invoice.repository.ts # Data access (yields Database)
│
├── server/runtime.ts         # ManagedRuntime composition
└── lib/
    ├── page-builder.tsx      # SSR page/layout fluent builder
    ├── actions.ts            # Server action builder
    └── errors.ts             # Shared error types
```

### Runtime Singleton Pattern

```typescript
// server/runtime.ts
import { Layer, ManagedRuntime } from "effect";

// Layer 1: Infrastructure
const InfrastructureLive = Layer.mergeAll(
  EmailClientLive,
  OpenAIServiceLive,
).pipe(Layer.provide(ConfigLive));

// Layer 2: Repositories
const RepositoriesLive = Layer.mergeAll(
  InvoiceRepositoryLive,
  ContactRepositoryLive,
).pipe(Layer.provide(DatabaseLive));

// Layer 3: Services
const ServicesLive = Layer.mergeAll(
  InvoiceServiceLive,
  ContactServiceLive,
).pipe(
  Layer.provide(Layer.mergeAll(
    RepositoriesLive,
    InfrastructureLive,
    ConfigLive,
  ))
);

// Runtime singleton
export const runtime = ManagedRuntime.make(ServicesLive);
```

### For Stateful Layers (DB connections, etc.) — use `globalValue`

```typescript
import { Next } from "@mcrovero/effect-nextjs"
import { Effect, ManagedRuntime } from "effect"
import { globalValue } from "effect/GlobalValue"

export const statefulRuntime = globalValue("BasePage", () => {
  const managedRuntime = ManagedRuntime.make(StatefulService.Default)
  process.on("SIGINT", () => managedRuntime.dispose())
  process.on("SIGTERM", () => managedRuntime.dispose())
  return managedRuntime
})
```

---

## Pattern: Services in API Routes (Route Handlers)

### Option A: Using `@mcrovero/effect-nextjs` (not for routes, but for pages)
This library focuses on pages/layouts/actions, not API routes. For API routes, use raw Effect patterns.

### Option B: Raw Effect with `@effect/platform`

```typescript
// app/api/example/route.ts
import {
  HttpApp,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Effect, Layer, ManagedRuntime, Schema } from "effect";

const mainLive = Layer.empty; // your services layer
const managedRuntime = ManagedRuntime.make(mainLive);
const runtime = await managedRuntime.runtime();

const handler = Effect.gen(function* () {
  const { name } = yield* HttpServerRequest.schemaBodyJson(
    Schema.Struct({ name: Schema.String })
  );
  return yield* HttpServerResponse.json({ message: `Hello, ${name}` });
});

const webHandler = HttpApp.toWebHandlerRuntime(runtime)(handler);

type Handler = (req: Request) => Promise<Response>;
export const POST: Handler = webHandler;
```

### Option C: Using Effect `HttpApi` framework (full type-safe API)

```typescript
// Define typed API schema
class FooApi extends HttpApiGroup.make("foo")
  .add(
    HttpApiEndpoint.get("bar", "/bar")
      .setHeaders(Schema.Struct({ page: Schema.NumberFromString }))
      .addSuccess(Schema.String),
  )
  .add(
    HttpApiEndpoint.post("baz", "/baz/:id")
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .setPayload(Schema.Struct({ name: Schema.String }))
      .addSuccess(Schema.Struct({ ok: Schema.Boolean }))
      .addError(FooError),
  ) {}

class MyApi extends HttpApi.make("api").add(FooApi).prefix("/api") {}

// Implement handlers
const FooLive = HttpApiBuilder.group(MyApi, "foo", (handlers) =>
  handlers
    .handle("bar", (_) => Effect.succeed(`page: ${_.headers.page}`))
    .handle("baz", (_) => Effect.gen(function* () { /* ... */ }))
);

// Export Next.js handlers
const { handler } = Layer.empty.pipe(
  Layer.provideMerge(ApiLive),
  Layer.merge(HttpServer.layerContext),
  HttpApiBuilder.toWebHandler,
);

export const GET: Handler = handler;
export const POST: Handler = handler;
```

---

## Pattern: Services in Server Components

### Using `@mcrovero/effect-nextjs`

```typescript
// lib/runtime.ts
import { Next } from "@mcrovero/effect-nextjs"
import { Layer } from "effect"

const AppLive = Layer.empty // Your stateless layers
export const BasePage = Next.make("BasePage", AppLive)

// app/page.tsx
import { BasePage } from "@/lib/runtime"
import { Effect } from "effect"

const HomePage = Effect.fn("HomePage")(function* () {
  const service = yield* InvoiceService;
  const invoices = yield* service.getAll();
  return <div>{invoices.map(i => <p key={i.id}>{i.name}</p>)}</div>
})

export default BasePage.build(HomePage)
```

### With middleware (auth, etc.)

```typescript
import { Next, NextMiddleware } from "@mcrovero/effect-nextjs"
import { Layer, Schema } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"

export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  { id: string; name: string }
>() {}

export class AuthMiddleware extends NextMiddleware.Tag<AuthMiddleware>()(
  "AuthMiddleware",
  { provides: CurrentUser, failure: Schema.String }
) {}

export const AuthLive = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of(() => Effect.succeed({ id: "123", name: "Ada" }))
)

export const AuthenticatedPage = Next.make("BasePage", AuthLive)
  .middleware(AuthMiddleware)
```

---

## Pattern: Server Actions

### Using `@mcrovero/effect-nextjs` (pages + Effect.fn)

Server actions can be run via the Effect runtime inside `"use server"` files:

```typescript
// app/actions.ts
"use server";
import { runtime } from "@/server/runtime";
import { Effect } from "effect";
import { InvoiceService } from "@/server/features/invoice/invoice.service";

export async function createInvoice(data: CreateInvoiceInput) {
  return runtime.runPromise(
    Effect.gen(function* () {
      const service = yield* InvoiceService;
      return yield* service.create(data);
    })
  );
}
```

### Using `@useflytrap/next-effect`

```typescript
import { makeServerActionHandler } from "next-effect"

const makeServerAction = makeServerActionHandler({
  errors: {
    invalidPayload: ({ error, schema, payload }) => invalidPayload,
    unexpected: (cause) => internalServerError,
  },
})

export const createTeam = makeServerAction(
  CreateTeamPayload,
  async (payload) => Effect.gen(function* () {
    // business logic
    return CreateTeamSuccess.make({ success: true, message: "Done" })
  })
)
```

---

## Pattern: Service Definition (Tag + Layer)

```typescript
// server/features/invoice/invoice.service.ts
import { Effect, Layer } from "effect";

type InvoiceServiceInterface = {
  readonly getAll: (userId: string) => Effect.Effect<Invoice[], DatabaseError>;
  readonly getBySlug: (userId: string, slug: string) =>
    Effect.Effect<Invoice, NotFoundError | DatabaseError>;
  readonly create: (userId: string, data: CreateInvoiceInput) =>
    Effect.Effect<Invoice, ValidationError | DatabaseError>;
};

export class InvoiceService extends Effect.Tag("@app/InvoiceService")<
  InvoiceService,
  InvoiceServiceInterface
>() {}

export const InvoiceServiceLive = Layer.effect(
  InvoiceService,
  Effect.gen(function* () {
    const repo = yield* InvoiceRepository;
    return InvoiceService.of({
      getAll: (userId) => repo.findAll(userId),
      getBySlug: (userId, slug) =>
        Effect.gen(function* () {
          const invoice = yield* repo.findBySlug(userId, slug);
          if (!invoice) {
            return yield* Effect.fail(
              new InvoiceNotFoundError({ message: `Not found: ${slug}` })
            );
          }
          return invoice;
        }),
      create: (userId, data) => repo.create(userId, data),
    });
  })
);
```

---

## Pattern: Error Handling

```typescript
// lib/errors.ts
import { Data } from "effect";

// Base class for 404 errors — page builder catches _tag: "NotFoundError" → 404
export abstract class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string;
}> {}

// Domain errors extend base
export class InvoiceNotFoundError extends NotFoundError {}
export class ContactNotFoundError extends NotFoundError {}
```

---

## Pattern: Schema Validation at Boundaries

```typescript
// server/features/invoice/invoice.schemas.ts
import { Schema } from "effect";

export class CreateInvoiceInput extends Schema.Class<CreateInvoiceInput>(
  "CreateInvoiceInput"
)({
  clientId: Schema.Number,
  items: Schema.Array(InvoiceItemSchema).pipe(
    Schema.filter((items) => items.length >= 1, {
      message: () => "At least one item required",
    })
  ),
  dueDate: Schema.Date,
}) {}
```

---

## Pattern: Params and Search Params (with `@mcrovero/effect-nextjs`)

```typescript
import { BasePage } from "@/lib/runtime"
import { decodeParamsUnknown, decodeSearchParamsUnknown } from "@mcrovero/effect-nextjs/Params"
import { Effect, Schema } from "effect"

const HomePage = Effect.fn("HomePage")((props) =>
  Effect.all([
    decodeParamsUnknown(Schema.Struct({ id: Schema.optional(Schema.String) }))(props.params),
    decodeSearchParamsUnknown(Schema.Struct({ q: Schema.optional(Schema.String) }))(props.searchParams)
  ]).pipe(
    Effect.map(([params, searchParams]) => (
      <div>Id: {params.id}, Query: {searchParams.q}</div>
    )),
    Effect.catchTag("ParseError", () => Effect.succeed(<div>Invalid params</div>))
  )
)

export default BasePage.build(HomePage)
```

---

## Pattern: `waitUntil` for Background Tasks (Vercel / Cloudflare)

```typescript
import { Effect, Runtime, Context, Layer } from "effect";

class WaitUntil extends Context.Tag("WaitUntil")<
  WaitUntil,
  (promise: Promise<unknown>) => void
>() {}

// Vercel
import { waitUntil } from "@vercel/functions";
const VercelWaitUntil = Layer.succeed(WaitUntil, waitUntil);
```

---

## OpenTelemetry Integration

```typescript
import { Tracer as OtelTracer, Resource } from "@effect/opentelemetry"
import { Effect, Layer, Option } from "effect"

export const layerTracer = OtelTracer.layerGlobal.pipe(
  Layer.provide(
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const resource = yield* Effect.serviceOption(Resource.Resource)
        if (Option.isSome(resource)) {
          return Layer.succeed(Resource.Resource, resource.value)
        }
        return Resource.layerFromEnv()
      })
    )
  )
)

// Provide to runtime
export const AppLiveWithTracer = AppLive.pipe(Layer.provideMerge(layerTracer))
export const BasePage = Next.make("BasePage", AppLiveWithTracer)
```

---

## Testing with `@effect/vitest`

```typescript
import { it, layer } from "@effect/vitest";

const InvoiceServiceTestLayer = Layer.succeed(
  InvoiceService,
  InvoiceService.of({
    getAll: () => Effect.succeed([mockInvoice]),
    getBySlug: () => Effect.succeed(mockInvoice),
  })
);

layer(InvoiceServiceTestLayer);

it.effect("returns invoices", () =>
  Effect.gen(function* () {
    const service = yield* InvoiceService;
    const invoices = yield* service.getAll(mockUserId);
    expect(invoices).toHaveLength(1);
  })
);
```

---

## Key Gotchas

1. **Stateful layers (DB connections)**: Use `globalValue` from `effect/GlobalValue` to prevent HMR recreation in dev
2. **`ManagedRuntime`**: Must be a module-level singleton — do NOT create per-request
3. **Server Components return JSX**: The Effect must return `JSX.Element`, not a Response object
4. **`"use server"` directive**: Server actions must be in files with `"use server"` at the top
5. **Layer composition order matters**: Infrastructure → Repositories → Services
6. **Don't leak server code**: Use `import "server-only"` in server.ts files
7. **Next.js control flow**: `redirect()` and `notFound()` throw internally — wrap in `Effect.sync()` or use the `@mcrovero/effect-nextjs/Navigation` wrappers

---

## Sources

- https://github.com/mcrovero/effect-nextjs (⭐131, actively maintained)
- https://github.com/useflytrap/next-effect
- https://github.com/PaulRBerg/prb-effect
- https://gist.github.com/kevin-courbet/4bebb17f5f2509667e6c6a20cbe72812
- https://effectbyexample.com/nextjs-api-handler
- https://www.typeonce.dev/course/effect-react-19-project-template
- https://effect.website/docs/guides/context-management/layers
