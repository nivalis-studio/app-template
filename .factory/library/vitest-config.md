# Vitest Configuration

## Vitest 4 Migration Notes

Vitest 4 introduced breaking changes to pool configuration:

- **`poolOptions` removed**: Pool options are no longer nested under `poolOptions.threads` or `poolOptions.forks`. They are now top-level properties in the `test` config.
- **`maxThreads` → `maxWorkers`**: The `maxThreads` option was renamed to `maxWorkers`.
- **`minThreads` → `minWorkers`**: The `minThreads` option was renamed to `minWorkers`.

### Current Configuration

Root `vitest.config.ts`:
```ts
{
  test: {
    pool: 'threads',
    maxWorkers: 4,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      reporter: ['text', 'lcov'],
    },
  }
}
```

### Key Facts

- `@vitest/coverage-v8` version must match vitest version (currently 4.0.18)
- Coverage thresholds are 80% across lines, functions, branches, statements
- `pool: 'threads'` is the default in Vitest 4 but is set explicitly for clarity
- Verbose reporter shows per-test timing information
- Workspace packages use `--passWithNoTests` flag — do not remove this flag
