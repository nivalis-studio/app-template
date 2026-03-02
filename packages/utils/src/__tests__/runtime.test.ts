import { Context, Effect, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import { makeRuntime } from '../runtime.js';

// Test service
type TestService = {
  readonly getValue: () => Effect.Effect<string>;
};
const TestService = Context.GenericTag<TestService>('TestService');

const TestServiceLive = Layer.succeed(TestService, {
  getValue: () => Effect.succeed('hello from test service'),
});

describe('makeRuntime', () => {
  it('creates a ManagedRuntime that can run effects', async () => {
    const runtime = makeRuntime('test-runtime-1', TestServiceLive);

    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* TestService;
        return yield* service.getValue();
      }),
    );

    expect(result).toBe('hello from test service');
  });

  it('returns the same runtime instance for the same id', () => {
    const layer = Layer.empty;
    const runtime1 = makeRuntime('test-singleton-check', layer);
    const runtime2 = makeRuntime('test-singleton-check', layer);

    expect(runtime1).toBe(runtime2);
  });

  it('returns different runtime instances for different ids', () => {
    const layer = Layer.empty;
    const runtime1 = makeRuntime('test-different-a', layer);
    const runtime2 = makeRuntime('test-different-b', layer);

    expect(runtime1).not.toBe(runtime2);
  });
});
