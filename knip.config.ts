import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': { entry: ['turbo.json'], vitest: false },
    'apps/web': {
      entry: ['src/app/**/*.{ts,tsx}', 'src/instrumentation*.ts'],
      project: ['src/**/*.{ts,tsx}'],
      ignoreDependencies: [
        '@total-typescript/ts-reset',
        'schema-dts',
        'babel-plugin-react-compiler',
      ],
    },
    'packages/ai': { entry: ['src/index.ts'], project: ['src/**/*.ts'] },
    'packages/utils': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
  },
};

export default config;
