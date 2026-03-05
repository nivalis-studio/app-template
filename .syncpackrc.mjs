// @ts-check
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

/**
 * Read pnpm catalog dependencies from pnpm-workspace.yaml
 * to enforce that all cataloged dependencies use the `catalog:` protocol.
 */
const getPnpmCatalogDependencies = () => {
  const workspaceConfig = readFileSync('pnpm-workspace.yaml', 'utf8');
  const pnpmWorkspaceConfig = parse(workspaceConfig);

  return Object.keys(pnpmWorkspaceConfig.catalog ?? {});
};

/** @type {import("syncpack").RcFile} */
const config = {
  versionGroups: [
    {
      label: 'Enforce pnpm default catalog for cataloged dependencies',
      dependencies: getPnpmCatalogDependencies(),
      dependencyTypes: ['!local'],
      pinVersion: 'catalog:',
    },
    {
      label: 'Use workspace protocol for internal packages',
      dependencies: ['@nivalis/*'],
      dependencyTypes: ['!local'],
      pinVersion: 'workspace:*',
    },
  ],
};

export default config;
