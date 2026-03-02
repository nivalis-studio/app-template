/**
 * Layer composition utilities for Effect services.
 *
 * Provides helpers to compose and wire Effect layers following a
 * layered architecture: Infrastructure → Repositories → Services.
 */
import { type Context, type Effect, Layer } from 'effect';

/**
 * Creates a service layer from a simple implementation object.
 *
 * This is a convenience wrapper around `Layer.succeed` for services
 * that don't need async initialization or dependencies.
 *
 * @example
 * ```ts
 * import { Context } from "effect"
 * import { makeServiceLayer } from "@nivalis/utils"
 *
 * interface Logger {
 *   readonly log: (message: string) => void
 * }
 * const Logger = Context.GenericTag<Logger>("Logger")
 *
 * const LoggerLive = makeServiceLayer(Logger, {
 *   log: (message) => console.log(message),
 * })
 * ```
 */
export const makeServiceLayer = <Id, S>(
  tag: Context.Tag<Id, S>,
  implementation: S,
): Layer.Layer<Id> => Layer.succeed(tag, implementation);

/**
 * Creates a service layer from an Effect that produces the service.
 *
 * Use this when the service needs async initialization or
 * depends on other services via the Effect context.
 *
 * @example
 * ```ts
 * import { Context, Config, Effect } from "effect"
 * import { makeEffectServiceLayer } from "@nivalis/utils"
 *
 * interface ApiClient {
 *   readonly fetch: (url: string) => Effect.Effect<string>
 * }
 * const ApiClient = Context.GenericTag<ApiClient>("ApiClient")
 *
 * const ApiClientLive = makeEffectServiceLayer(
 *   ApiClient,
 *   Effect.gen(function* () {
 *     const baseUrl = yield* Config.string("API_BASE_URL")
 *     return { fetch: (url) => Effect.succeed(`${baseUrl}/${url}`) }
 *   }),
 * )
 * ```
 */
export const makeEffectServiceLayer = <Id, S, E, R>(
  tag: Context.Tag<Id, S>,
  effect: Effect.Effect<S, E, R>,
): Layer.Layer<Id, E, R> => Layer.effect(tag, effect);

/**
 * Merges multiple layers into a single composed layer.
 *
 * All input layers run concurrently. The resulting layer provides
 * all services from all input layers.
 *
 * @example
 * ```ts
 * import { composeLayers } from "@nivalis/utils"
 *
 * const InfrastructureLive = composeLayers(
 *   DatabaseLive,
 *   CacheLive,
 *   EmailClientLive,
 * )
 * ```
 */
export const composeLayers: typeof Layer.mergeAll = Layer.mergeAll;
