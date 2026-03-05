---
name: readiness-worker
description: Adds configuration files, tooling, and infrastructure to improve AI agent readiness. Handles config files, documentation, dev tools, CI/CD, and observability setup.
---

# Readiness Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features involving:
- Adding configuration files (devcontainer, dependabot, issue templates, CODEOWNERS)
- Adding documentation (AGENTS.md, architecture diagrams)
- Installing and configuring development tools (knip, syncpack, jscpd, playwright)
- Setting up CI/CD pipelines (GitHub Actions workflows, changesets)
- Adding observability infrastructure (pino logger, request ID middleware, metrics)
- Adding feature flag infrastructure (Vercel Flags SDK)
- Configuring test improvements (coverage thresholds, parallel execution)

## Work Procedure

1. **Read the feature description carefully.** Understand exactly what config files or tools to add and what readiness criteria they satisfy.

2. **Check existing patterns.** Before adding anything:
   - Read `package.json` at root and relevant app/package levels for existing scripts and dependencies
   - Read `pnpm-workspace.yaml` for the catalog section (all new deps use `"catalog:"` protocol)
   - Read `lefthook.yml` if modifying git hooks
   - Read `turbo.json` if adding new turbo tasks
   - Read `biome.jsonc` if modifying linter config

3. **Install dependencies correctly.** For any new npm packages:
   - Add the exact version to `pnpm-workspace.yaml` catalog section
   - Add `"package-name": "catalog:"` to the appropriate package.json devDependencies
   - Run `pnpm install` to update lockfile
   - Verify install succeeded

4. **Create configuration files.** Follow the feature description exactly:
   - Use the correct file paths and formats (YAML, JSON, JSONC, Markdown)
   - For GitHub files: `.github/` directory structure
   - For devcontainer: `.devcontainer/devcontainer.json`
   - For changesets: `.changeset/config.json`

5. **Add scripts if needed.** If the tool needs a package.json script:
   - Add to the appropriate package.json (root for monorepo-wide, app for app-specific)
   - Add to turbo.json if it should be a turbo task
   - Test the script runs without errors

6. **Verify the tool works.** Run the new tool/config and confirm:
   - The tool command exits without crashing
   - Configuration is recognized (no "config not found" warnings)
   - Output is reasonable (not just empty)

7. **Run full verification.** After all changes:
   - `pnpm lint` — must exit 0
   - `pnpm ts` — must exit 0  
   - `pnpm test` — must exit 0
   - Any tool-specific command — must not crash

8. **For GitHub API features** (branch protection):
   - Use `gh api` with PUT/POST methods
   - Verify the change took effect with a GET call
   - If `gh api` fails with permissions, report to orchestrator

9. **For documentation features** (AGENTS.md, architecture docs):
   - Write comprehensive content meeting all criteria listed in the feature
   - Include specific, actionable information (not generic boilerplate)
   - Reference actual project tools, commands, and patterns

## Example Handoff

```json
{
  "salientSummary": "Added knip for dead code detection and syncpack for version drift detection. Configured knip.config.ts with workspace entries and ignore patterns. Added syncpack with .syncpackrc.mjs targeting catalog protocol. Both tools run successfully: knip found 3 unused exports (expected in template), syncpack reports all versions in sync.",
  "whatWasImplemented": "Installed knip 5.x and syncpack 13.x via catalog protocol. Created knip.config.ts at root with workspace definitions for apps/web, packages/ai, packages/utils. Created .syncpackrc.mjs with custom config for pnpm catalog protocol. Added 'knip' and 'syncpack:check' scripts to root package.json. Verified both tools run and produce meaningful output.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm install", "exitCode": 0, "observation": "Lockfile updated with knip and syncpack" },
      { "command": "npx knip", "exitCode": 0, "observation": "Analyzed 3 workspaces, found 3 unused exports (template code)" },
      { "command": "npx syncpack list-mismatches", "exitCode": 0, "observation": "All versions in sync across workspaces" },
      { "command": "pnpm lint", "exitCode": 0, "observation": "Biome check passed on all 62 files" },
      { "command": "pnpm ts", "exitCode": 0, "observation": "TypeScript check passed all packages" },
      { "command": "pnpm test", "exitCode": 0, "observation": "73 tests passed across all packages" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- `gh api` fails with authentication/permission errors for branch protection
- A new dependency conflicts with existing packages (peer dep issues)
- knip or other tools report errors that need architectural decisions (e.g., which unused exports to keep)
- Playwright requires system-level browser installation that fails
- pnpm install fails due to catalog version conflicts
