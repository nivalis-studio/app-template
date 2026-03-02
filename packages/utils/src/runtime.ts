/**
 * ManagedRuntime singleton with globalThis caching for Next.js hot-reload safety.
 *
 * In development, Next.js hot-reloads modules frequently. Without caching,
 * each reload would create a new ManagedRuntime, leaking resources.
 * Using `globalValue` ensures the runtime persists across hot-reloads.
 */
import { type Layer, ManagedRuntime } from 'effect';
import { globalValue } from 'effect/GlobalValue';

/**
 * Creates a ManagedRuntime singleton cached on `globalThis`.
 *
 * The runtime is created once and reused across hot-reloads in development.
 * Each unique `id` gets its own cached runtime instance.
 *
 * @example
 * ```ts
 * import { Layer } from "effect"
 * import { makeRuntime } from "@nivalis/utils"
 *
 * const AppLive = Layer.empty
 * const runtime = makeRuntime("app-runtime", AppLive)
 * ```
 */
export const makeRuntime = <R, E>(
  id: string,
  layer: Layer.Layer<R, E, never>,
): ManagedRuntime.ManagedRuntime<R, E> =>
  globalValue(Symbol.for(`@nivalis/runtime/${id}`), () =>
    ManagedRuntime.make(layer),
  );
