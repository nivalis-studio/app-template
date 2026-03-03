import { describe, expect, it } from 'vitest';
import {
  validateSignInFields,
  validateSignUpFields,
} from '../lib/auth-validation';

describe('validateSignUpFields', () => {
  it('returns no errors for valid input', () => {
    const errors = validateSignUpFields(
      'John Doe',
      'john@example.com',
      'password123',
    );
    expect(errors).toEqual({});
  });

  it('requires name', () => {
    const errors = validateSignUpFields('', 'john@example.com', 'password123');
    expect(errors.name).toBe('Name is required');
  });

  it('requires name to not be only whitespace', () => {
    const errors = validateSignUpFields(
      '   ',
      'john@example.com',
      'password123',
    );
    expect(errors.name).toBe('Name is required');
  });

  it('requires email', () => {
    const errors = validateSignUpFields('John', '', 'password123');
    expect(errors.email).toBe('Email is required');
  });

  it('validates email format', () => {
    const errors = validateSignUpFields('John', 'not-an-email', 'password123');
    expect(errors.email).toBe('Please enter a valid email address');
  });

  it('requires password', () => {
    const errors = validateSignUpFields('John', 'john@example.com', '');
    expect(errors.password).toBe('Password is required');
  });

  it('requires password minimum length of 8', () => {
    const errors = validateSignUpFields('John', 'john@example.com', 'short');
    expect(errors.password).toBe('Password must be at least 8 characters');
  });

  it('accepts password of exactly 8 characters', () => {
    const errors = validateSignUpFields('John', 'john@example.com', '12345678');
    expect(errors.password).toBeUndefined();
  });

  it('returns all errors at once', () => {
    const errors = validateSignUpFields('', '', '');
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

describe('validateSignInFields', () => {
  it('returns no errors for valid input', () => {
    const errors = validateSignInFields('john@example.com', 'password123');
    expect(errors).toEqual({});
  });

  it('requires email', () => {
    const errors = validateSignInFields('', 'password123');
    expect(errors.email).toBe('Email is required');
  });

  it('validates email format', () => {
    const errors = validateSignInFields('not-an-email', 'password123');
    expect(errors.email).toBe('Please enter a valid email address');
  });

  it('requires password', () => {
    const errors = validateSignInFields('john@example.com', '');
    expect(errors.password).toBe('Password is required');
  });

  it('does not enforce password minimum length for sign-in', () => {
    const errors = validateSignInFields('john@example.com', 'short');
    expect(errors.password).toBeUndefined();
  });

  it('returns all errors at once', () => {
    const errors = validateSignInFields('', '');
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});
