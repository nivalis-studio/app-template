import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  NotFoundError,
  ServiceError,
  UnauthorizedError,
  ValidationError,
} from '../errors.js';

describe('typed error helpers', () => {
  it('NotFoundError carries the correct _tag', () => {
    const error = new NotFoundError({ message: 'User not found' });
    expect(error._tag).toBe('NotFoundError');
    expect(error.message).toBe('User not found');
  });

  it('UnauthorizedError carries the correct _tag', () => {
    const error = new UnauthorizedError({ message: 'Missing session' });
    expect(error._tag).toBe('UnauthorizedError');
    expect(error.message).toBe('Missing session');
  });

  it('ValidationError carries the correct _tag and optional field', () => {
    const error = new ValidationError({
      message: 'Invalid email',
      field: 'email',
    });
    expect(error._tag).toBe('ValidationError');
    expect(error.message).toBe('Invalid email');
    expect(error.field).toBe('email');
  });

  it('ServiceError carries the correct _tag and optional cause', () => {
    const cause = new Error('network timeout');
    const error = new ServiceError({
      message: 'API call failed',
      cause,
    });
    expect(error._tag).toBe('ServiceError');
    expect(error.message).toBe('API call failed');
    expect(error.cause).toBe(cause);
  });

  it('errors can be used in Effect error channel with catchTag', async () => {
    const program = Effect.gen(function* () {
      return yield* Effect.fail(
        new NotFoundError({ message: 'Invoice not found' }),
      );
    }).pipe(
      Effect.catchTag('NotFoundError', error =>
        Effect.succeed(`caught: ${error.message}`),
      ),
    );

    const result = await Effect.runPromise(program);
    expect(result).toBe('caught: Invoice not found');
  });
});
