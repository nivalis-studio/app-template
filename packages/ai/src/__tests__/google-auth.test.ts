import { ConfigProvider, Effect, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import { GoogleAuthError } from '../errors.js';
import {
  GoogleAuth,
  type GoogleAuthClient,
  GoogleAuthLive,
} from '../google-auth.js';

describe('GoogleAuth service', () => {
  const testConfig = ConfigProvider.fromMap(
    new Map([
      ['GOOGLE_CLIENT_ID', 'test-client-id'],
      ['GOOGLE_CLIENT_SECRET', 'test-client-secret'],
      ['GOOGLE_REFRESH_TOKEN', 'test-refresh-token'],
    ]),
  );

  const TestLayer = GoogleAuthLive.pipe(
    Layer.provide(Layer.setConfigProvider(testConfig)),
  );

  it('creates an OAuth2 client with valid config', async () => {
    const program = Effect.gen(function* () {
      const auth = yield* GoogleAuth;
      const client = yield* auth.getClient;
      return client;
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result.client).toBeDefined();
  });

  it('auth client has refresh token set', async () => {
    const program = Effect.gen(function* () {
      const auth = yield* GoogleAuth;
      const { client } = yield* auth.getClient;
      return client.credentials;
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result.refresh_token).toBe('test-refresh-token');
  });

  it('fails with ConfigError when GOOGLE_CLIENT_ID is missing', async () => {
    const partialConfig = ConfigProvider.fromMap(
      new Map([
        ['GOOGLE_CLIENT_SECRET', 'test-client-secret'],
        ['GOOGLE_REFRESH_TOKEN', 'test-refresh-token'],
      ]),
    );

    const PartialLayer = GoogleAuthLive.pipe(
      Layer.provide(Layer.setConfigProvider(partialConfig)),
    );

    const program = Effect.gen(function* () {
      const auth = yield* GoogleAuth;
      return yield* auth.getClient;
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, PartialLayer),
    );

    expect(exit._tag).toBe('Failure');
  });

  it('fails with ConfigError when GOOGLE_CLIENT_SECRET is missing', async () => {
    const partialConfig = ConfigProvider.fromMap(
      new Map([
        ['GOOGLE_CLIENT_ID', 'test-client-id'],
        ['GOOGLE_REFRESH_TOKEN', 'test-refresh-token'],
      ]),
    );

    const PartialLayer = GoogleAuthLive.pipe(
      Layer.provide(Layer.setConfigProvider(partialConfig)),
    );

    const program = Effect.gen(function* () {
      const auth = yield* GoogleAuth;
      return yield* auth.getClient;
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, PartialLayer),
    );

    expect(exit._tag).toBe('Failure');
  });

  it('fails with ConfigError when GOOGLE_REFRESH_TOKEN is missing', async () => {
    const partialConfig = ConfigProvider.fromMap(
      new Map([
        ['GOOGLE_CLIENT_ID', 'test-client-id'],
        ['GOOGLE_CLIENT_SECRET', 'test-client-secret'],
      ]),
    );

    const PartialLayer = GoogleAuthLive.pipe(
      Layer.provide(Layer.setConfigProvider(partialConfig)),
    );

    const program = Effect.gen(function* () {
      const auth = yield* GoogleAuth;
      return yield* auth.getClient;
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, PartialLayer),
    );

    expect(exit._tag).toBe('Failure');
  });

  it('GoogleAuthError carries the correct _tag', () => {
    const error = new GoogleAuthError({
      message: 'Invalid credentials',
    });
    expect(error._tag).toBe('GoogleAuthError');
    expect(error.message).toBe('Invalid credentials');
  });

  it('GoogleAuthError supports optional cause', () => {
    const cause = new Error('network error');
    const error = new GoogleAuthError({
      message: 'Auth failed',
      cause,
    });
    expect(error._tag).toBe('GoogleAuthError');
    expect(error.cause).toBe(cause);
  });

  it('can be used with a mock implementation', async () => {
    const mockClient = {
      credentials: { refresh_token: 'mock-token' },
    } as GoogleAuthClient['client'];

    const MockGoogleAuth = Layer.succeed(GoogleAuth, {
      getClient: Effect.succeed({ client: mockClient }),
    });

    const program = Effect.gen(function* () {
      const auth = yield* GoogleAuth;
      const { client } = yield* auth.getClient;
      return client.credentials.refresh_token;
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockGoogleAuth),
    );
    expect(result).toBe('mock-token');
  });
});
