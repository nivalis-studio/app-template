import { Context, Effect, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  composeLayers,
  makeEffectServiceLayer,
  makeServiceLayer,
} from '../layers.js';

// Test services
type Logger = {
  readonly log: (message: string) => string;
};
const Logger = Context.GenericTag<Logger>('Logger');

type Counter = {
  readonly count: () => number;
};
const Counter = Context.GenericTag<Counter>('Counter');

const COUNTER_VALUE = 42;
const FORMATTER_INPUT = 123;

describe('makeServiceLayer', () => {
  it('creates a layer from a simple implementation', async () => {
    const LoggerLive = makeServiceLayer(Logger, {
      log: (message: string) => `logged: ${message}`,
    });

    const program = Effect.gen(function* () {
      const logger = yield* Logger;
      return logger.log('hello');
    });

    const result = await Effect.runPromise(Effect.provide(program, LoggerLive));
    expect(result).toBe('logged: hello');
  });
});

describe('makeEffectServiceLayer', () => {
  it('creates a layer from an Effect that produces a service', async () => {
    const CounterLive = makeEffectServiceLayer(
      Counter,
      Effect.succeed({ count: () => COUNTER_VALUE }),
    );

    const program = Effect.gen(function* () {
      const counter = yield* Counter;
      return counter.count();
    });

    const result = await Effect.runPromise(
      Effect.provide(program, CounterLive),
    );
    expect(result).toBe(COUNTER_VALUE);
  });
});

describe('composeLayers', () => {
  it('merges multiple layers into a single composed layer', async () => {
    const LoggerLive = makeServiceLayer(Logger, {
      log: (message: string) => `logged: ${message}`,
    });

    const CounterLive = makeServiceLayer(Counter, {
      count: () => COUNTER_VALUE,
    });

    const ComposedLive = composeLayers(LoggerLive, CounterLive);

    const program = Effect.gen(function* () {
      const logger = yield* Logger;
      const counter = yield* Counter;
      return `${logger.log('test')} - count: ${counter.count()}`;
    });

    const result = await Effect.runPromise(
      Effect.provide(program, ComposedLive),
    );
    expect(result).toBe(`logged: test - count: ${COUNTER_VALUE}`);
  });

  it('composed layers can be further composed with provide', async () => {
    // Service that depends on Logger
    type Formatter = {
      readonly format: (value: number) => string;
    };
    const Formatter = Context.GenericTag<Formatter>('Formatter');

    const LoggerLive = makeServiceLayer(Logger, {
      log: (message: string) => `logged: ${message}`,
    });

    const FormatterLive = makeEffectServiceLayer(
      Formatter,
      Effect.gen(function* () {
        const logger = yield* Logger;
        return {
          format: (value: number) => logger.log(`formatted: ${value}`),
        };
      }),
    );

    // Compose: FormatterLive depends on Logger, wire via Layer.provide
    const AppLive = Layer.provide(FormatterLive, LoggerLive);

    const program = Effect.gen(function* () {
      const formatter = yield* Formatter;
      return formatter.format(FORMATTER_INPUT);
    });

    const result = await Effect.runPromise(Effect.provide(program, AppLive));
    expect(result).toBe(`logged: formatted: ${FORMATTER_INPUT}`);
  });
});
