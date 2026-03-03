import { describe, expect, it } from 'vitest';
import { invariant, slugify } from '../invariant.ts';

describe('invariant', () => {
  it('does not throw when condition is truthy', () => {
    expect(() => invariant(true, 'should not throw')).not.toThrow();
    expect(() => invariant(1, 'should not throw')).not.toThrow();
    expect(() => invariant('yes', 'should not throw')).not.toThrow();
    expect(() => invariant({}, 'should not throw')).not.toThrow();
  });

  it('throws Error with the given message when condition is falsy', () => {
    expect(() => invariant(false, 'oops')).toThrow(new Error('oops'));
    expect(() => invariant(null, 'missing')).toThrow(new Error('missing'));
    expect(() => invariant(undefined, 'gone')).toThrow(new Error('gone'));
    expect(() => invariant(0, 'zero')).toThrow(new Error('zero'));
    expect(() => invariant('', 'empty')).toThrow(new Error('empty'));
  });

  it('narrows the type after the assertion', () => {
    const value: string | undefined = 'hello';
    invariant(value, 'should exist');
    // TypeScript should narrow `value` to `string` here
    const _len: number = value.length;
    const expectedLength = 5;
    expect(_len).toBe(expectedLength);
  });
});

describe('slugify', () => {
  it('converts simple text to a slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('foo@bar#baz')).toBe('foo-bar-baz');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('a   b   c')).toBe('a-b-c');
    expect(slugify('---foo---bar---')).toBe('foo-bar');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  Hello  ')).toBe('hello');
    expect(slugify('---test---')).toBe('test');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles already slugified text', () => {
    expect(slugify('already-a-slug')).toBe('already-a-slug');
  });

  it('handles unicode and accented characters by removing them', () => {
    expect(slugify('café au lait')).toBe('caf-au-lait');
  });
});
