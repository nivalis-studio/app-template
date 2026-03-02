---
name: infra-worker
description: Handles monorepo infrastructure, package scaffolding, testing setup, monitoring, and environment configuration.
---

# Infrastructure Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features involving:
- Creating/configuring shared packages in the monorepo
- Setting up testing infrastructure (Vitest)
- Configuring monitoring/error tracking (Sentry)
- Environment variable management and validation
- Turbo pipeline configuration
- Package.json and tsconfig setup

## Work Procedure

1. **Read the feature description carefully.** Understand preconditions, expected behavior, and verification steps.

2. **Check existing state.** Before making changes:
   - Read `pnpm-workspace.yaml` to understand the catalog and workspace config
   - Read `turbo.json` to understand the build pipeline
   - Read relevant `package.json` and `tsconfig.json` files
   - Check what already exists vs what needs to be created

3. **Write tests first (TDD).** For any new utility function or configuration:
   - Create the test file first with failing tests
   - Then implement to make them pass
   - Use Vitest patterns: `describe`, `it`, `expect`

4. **Implement the feature.**
   - Follow existing patterns (ESM, pnpm catalog, biome config)
   - Use `"type": "module"` for all new packages
   - Use `"catalog:"` protocol for dependencies in pnpm catalog
   - Use `"workspace:*"` for internal package references
   - Configure proper `exports` field in package.json for new packages

5. **Verify your work thoroughly:**
   - Run `turbo build` — must exit 0
   - Run `turbo ts` — must exit 0 (no type errors)
   - Run `turbo lint` — must exit 0
   - Run `turbo test` — must exit 0 (all tests pass)
   - If you created a new package, verify it's importable from `apps/web`

6. **Manual verification:**
   - If the feature affects the dev server, start it and verify it works
   - Check that new env vars are in `.env.example` and `turbo.json`

## Example Handoff

```json
{
  "salientSummary": "Created @nivalis/utils package with Effect utility helpers (ManagedRuntime singleton, typed error helpers). Added Vitest config at workspace level with turbo test pipeline. All 4 tests pass, turbo build/ts/lint all exit 0.",
  "whatWasImplemented": "packages/utils/ with package.json, tsconfig.json, src/index.ts, src/runtime.ts (ManagedRuntime singleton pattern), src/errors.ts (tagged error helpers). Root vitest.workspace.ts config. turbo.json updated with test task. @nivalis/utils added as workspace dep in apps/web.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "turbo build", "exitCode": 0, "observation": "All 2 packages built successfully" },
      { "command": "turbo ts", "exitCode": 0, "observation": "No type errors across monorepo" },
      { "command": "turbo lint", "exitCode": 0, "observation": "No lint issues" },
      { "command": "turbo test", "exitCode": 0, "observation": "4 tests passed in packages/utils" }
    ],
    "interactiveChecks": [
      { "action": "Verified @nivalis/utils is importable from apps/web by adding test import", "observed": "TypeScript resolves the import correctly, no errors" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "packages/utils/src/__tests__/runtime.test.ts",
        "cases": [
          { "name": "creates ManagedRuntime singleton", "verifies": "Runtime is created once and reused" },
          { "name": "provides layers to runtime", "verifies": "Layer composition works correctly" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- pnpm catalog version conflicts that can't be resolved
- Turbo pipeline circular dependencies
- Existing package configurations that conflict with new setup
- Need clarification on package boundaries or naming conventions
